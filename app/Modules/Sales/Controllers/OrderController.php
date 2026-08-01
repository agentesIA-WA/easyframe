<?php

namespace App\Modules\Sales\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Sales\Models\Order;
use App\Modules\Sales\Models\OrderEditLog;
use App\Modules\Sales\Services\PricingCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with(['items.subItems', 'customer', 'seller', 'framer', 'payments', 'editLogs']);

        if ($request->has('status')) {
            if ($request->status === 'draft') {
                $query->where('status', 'draft');
            } else {
                $query->where('status', '!=', 'draft');
            }
        }

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('orders.id', 'like', "%{$search}%")
                  ->orWhere('orders.total_value', 'like', "%{$search}%")
                  ->orWhere('orders.status', 'like', "%{$search}%")
                  ->orWhere('orders.delivery_date', 'like', "%{$search}%")
                  ->orWhereHas('customer', function($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('seller', function($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_direction', 'desc');
        $sortDir = in_array(strtolower($sortDir), ['asc', 'desc']) ? $sortDir : 'desc';

        if ($sortBy === 'customer.name') {
            $query->leftJoin('customers', 'orders.customer_id', '=', 'customers.id')
                  ->select('orders.*')
                  ->orderBy('customers.name', $sortDir);
        } elseif ($sortBy === 'seller.name') {
            $query->leftJoin('employees', 'orders.seller_id', '=', 'employees.id')
                  ->select('orders.*')
                  ->orderBy('employees.name', $sortDir);
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        $orders = $query->paginate($request->get('per_page', 15));
            
        return response()->json($orders);
    }

    public function store(Request $request, PricingCalculator $calculator)
    {
        return DB::transaction(function () use ($request, $calculator) {
            $order = Order::create([
                'customer_id' => $request->customer_id,
                'seller_id' => $request->seller_id,
                'status' => $request->status ?? 'draft',
                'total_value' => 0,
                'discount' => $request->discount ?? 0,
                'delivery_date' => $request->delivery_date,
            ]);

            $this->saveItems($order, $request->items, $calculator);

            $order->recalculateTotal();
            
            $this->processPayments($order, $request);

            return response()->json($order->load('items.subItems'), 201);
        });
    }

    public function show(Order $order)
    {
        return response()->json($order->load(['items.subItems', 'customer', 'seller', 'framer', 'payments', 'editLogs']));
    }

    public function update(Request $request, Order $order, PricingCalculator $calculator)
    {
        return DB::transaction(function () use ($request, $order, $calculator) {
            $order->update([
                'customer_id' => $request->customer_id,
                'seller_id' => $request->seller_id,
                'status' => $request->status ?? $order->status,
                'discount' => $request->discount ?? 0,
                'delivery_date' => $request->delivery_date,
            ]);

            // Limpa os itens atuais para recadastrar
            foreach ($order->items as $item) {
                $item->subItems()->delete();
                $item->delete();
            }

            $this->saveItems($order, $request->items, $calculator);

            $order->recalculateTotal();

            $this->processPayments($order, $request);

            return response()->json($order->load('items.subItems'));
        });
    }

    private function processPayments(Order $order, Request $request)
    {
        if ($request->has('payments') && is_array($request->payments) && count($request->payments) > 0) {
            $order->payments()->delete();

            foreach ($request->payments as $pmData) {
                $paymentMethodId = $pmData['payment_method_id'] ?? null;
                $method = $pmData['payment_method'] ?? null;
                $isCash = false;

                if ($paymentMethodId) {
                    $pm = \App\Modules\Core\Models\PaymentMethod::find($paymentMethodId);
                    if ($pm) {
                        $method = $pm->description;
                        $isCash = (bool) $pm->is_cash;
                    }
                }

                if (!$isCash && $method) {
                    $upperMethod = mb_strtoupper($method);
                    if (str_contains($upperMethod, 'PIX') || str_contains($upperMethod, 'DINHEIRO') || str_contains($upperMethod, 'DÉBITO') || str_contains($upperMethod, 'DEBITO')) {
                        $isCash = true;
                    }
                }

                $assignedValue = isset($pmData['value']) && (float)$pmData['value'] > 0 
                    ? (float)$pmData['value'] 
                    : (float)$order->total_value;
                $installments = max(1, (int)($pmData['installments'] ?? 1));
                $installmentValue = $assignedValue / $installments;
                $paymentStatus = $order->status === 'draft' ? 'D' : 'A';

                for ($i = 1; $i <= $installments; $i++) {
                    $chequeNum = null;
                    if (isset($pmData['cheque_numbers']) && is_array($pmData['cheque_numbers'])) {
                        $chequeNum = $pmData['cheque_numbers'][$i - 1] ?? null;
                    } else {
                        $chequeNum = $pmData['cheque_number'] ?? null;
                    }

                    $chequeAg = null;
                    if (isset($pmData['cheque_agencies']) && is_array($pmData['cheque_agencies'])) {
                        $chequeAg = $pmData['cheque_agencies'][$i - 1] ?? null;
                    } else {
                        $chequeAg = $pmData['cheque_agency'] ?? null;
                    }

                    $chequeAc = null;
                    if (isset($pmData['cheque_accounts']) && is_array($pmData['cheque_accounts'])) {
                        $chequeAc = $pmData['cheque_accounts'][$i - 1] ?? null;
                    } else {
                        $chequeAc = $pmData['cheque_account'] ?? null;
                    }

                    $dueDate = $isCash 
                        ? now()->format('Y-m-d') 
                        : now()->addMonths($i - 1)->addDays(30)->format('Y-m-d');

                    \App\Modules\Finance\Models\Payment::create([
                        'order_id' => $order->id,
                        'status' => $paymentStatus,
                        'due_date' => $dueDate,
                        'value' => $installmentValue,
                        'installment_number' => $i,
                        'payment_method' => $method,
                        'cheque_number' => $chequeNum,
                        'cheque_agency' => $chequeAg,
                        'cheque_account' => $chequeAc,
                        'card_brand' => $pmData['card_brand'] ?? null,
                        'observation' => $pmData['observation'] ?? null,
                    ]);
                }
            }
        } elseif ($request->has('payment_method_id') && $request->payment_method_id) {
            $this->createPayment($order, $request->payment_method_id, $request->payment_details ?? []);
        }
    }

    private function createPayment(Order $order, $paymentMethodId = null, $details = [])
    {
        // Deleta lançamentos anteriores para evitar duplicidades
        $order->payments()->delete();

        $method = null;
        $isCash = false;
        if ($paymentMethodId) {
            $pm = \App\Modules\Core\Models\PaymentMethod::find($paymentMethodId);
            $method = $pm ? $pm->description : null;
            $isCash = $pm ? (bool) $pm->is_cash : false;
        }

        // Caso o método não venha de ID cadastrado mas por string, infere se é à vista
        if (!$isCash && $method) {
            $upperMethod = mb_strtoupper($method);
            if (str_contains($upperMethod, 'PIX') || str_contains($upperMethod, 'DINHEIRO') || str_contains($upperMethod, 'DÉBITO') || str_contains($upperMethod, 'DEBITO')) {
                $isCash = true;
            }
        }

        $installments = $details['installments'] ?? 1;
        $installmentValue = $order->total_value / $installments;
        $paymentStatus = $order->status === 'draft' ? 'D' : 'A';

        for ($i = 1; $i <= $installments; $i++) {
            $chequeNum = null;
            if (isset($details['cheque_numbers']) && is_array($details['cheque_numbers'])) {
                $chequeNum = $details['cheque_numbers'][$i - 1] ?? null;
            } else {
                $chequeNum = $details['cheque_number'] ?? null;
            }

            $chequeAg = null;
            if (isset($details['cheque_agencies']) && is_array($details['cheque_agencies'])) {
                $chequeAg = $details['cheque_agencies'][$i - 1] ?? null;
            } else {
                $chequeAg = $details['cheque_agency'] ?? null;
            }

            $chequeAc = null;
            if (isset($details['cheque_accounts']) && is_array($details['cheque_accounts'])) {
                $chequeAc = $details['cheque_accounts'][$i - 1] ?? null;
            } else {
                $chequeAc = $details['cheque_account'] ?? null;
            }

            // Para pagamentos à vista (isCash = true), o vencimento é no dia atual (now()).
            // Para pagamentos a prazo, vence em parcelas mensais (a partir do 30º dia se a prazo).
            $dueDate = $isCash 
                ? now()->format('Y-m-d') 
                : now()->addMonths($i - 1)->addDays(30)->format('Y-m-d');

            \App\Modules\Finance\Models\Payment::create([
                'order_id' => $order->id,
                'status' => $paymentStatus,
                'due_date' => $dueDate,
                'value' => $installmentValue,
                'installment_number' => $i,
                'payment_method' => $method,
                'cheque_number' => $chequeNum,
                'cheque_agency' => $chequeAg,
                'cheque_account' => $chequeAc,
                'card_brand' => $details['card_brand'] ?? null,
                'observation' => $details['observation'] ?? null,
            ]);
        }
    }

    private function saveItems(Order $order, array $items, PricingCalculator $calculator)
    {
        foreach ($items as $itemData) {
            $increasePercent = (float) ($itemData['increase_percent'] ?? $itemData['internal_code'] ?? 0);
            $discountPercent = (float) ($itemData['discount_percent'] ?? 0);

            $item = $order->items()->create([
                'description' => $itemData['description'],
                'observation' => $itemData['observation'] ?? null,
                'height' => $itemData['height'],
                'width' => $itemData['width'],
                'thickness' => $itemData['thickness'] ?? 0,
                'quantity' => $itemData['quantity'] ?? 1,
                'increase_percent' => $increasePercent,
                'discount_percent' => $discountPercent,
                'item_value' => 0,
            ]);

            $totalMargin = 0;
            foreach ($itemData['sub_items'] as $s) {
                $totalMargin += (float) ($s['margin'] ?? 0);
            }

            $currentH = (float) $item->height + ($totalMargin * 2);
            $currentW = (float) $item->width + ($totalMargin * 2);
            $itemSubTotal = 0;

            foreach ($itemData['sub_items'] as $sub) {
                $margin = (float) ($sub['margin'] ?? 0);

                // Busca a largura técnica do produto no banco
                $product = \App\Modules\Customer\Models\Product::find($sub['product_id']);
                $technicalWidth = (float) ($product->width ?? 0);

                $val = $calculator->calculate(
                    $currentH, 
                    $currentW, 
                    $technicalWidth, 
                    (float) $sub['unit_value'], 
                    (int) $sub['calculation_type'],
                    (float) ($sub['quantity'] ?? 1)
                );
                
                // Aplica a majoração percentual (Código Interno) diretamente no valor do produto/insumo
                if ($increasePercent != 0) {
                    $val = $val * (1 + ($increasePercent / 100));
                }

                $item->subItems()->create([
                    'product_id' => $sub['product_id'],
                    'description' => $sub['description'],
                    'value' => $val,
                    'quantity' => $sub['quantity'] ?? 1,
                    'calculation_type' => $sub['calculation_type'],
                    'margin' => $margin
                ]);
                
                $itemSubTotal += ($val * $item->quantity);

                // Efeito Cascata: Se for linear, expande para o próximo insumo
                if ((int) $sub['calculation_type'] === 2) {
                    $currentH += ($technicalWidth * 2);
                    $currentW += ($technicalWidth * 2);
                }
            }

            $valMajorado = $itemSubTotal;

            // Aplica desconto percentual do item se houver
            if ($discountPercent != 0) {
                $itemDiscountVal = $valMajorado * ($discountPercent / 100);
                $itemTotal = $valMajorado - $itemDiscountVal;
            } else {
                $itemDiscountVal = 0;
                $itemTotal = $valMajorado;
            }

            $item->update([
                'item_value' => $itemTotal,
                'item_discount' => $itemDiscountVal
            ]);
        }
    }

    public function convertToOrder(Order $order)
    {
        if ($order->status !== 'draft') {
            return response()->json(['message' => 'Apenas orçamentos podem ser convertidos.'], 422);
        }

        return DB::transaction(function () use ($order) {
            $order->update(['status' => 'confirmed']);
            
            // Ativa os pagamentos/parcelas que estavam como rascunho
            $order->payments()->where('status', 'D')->update(['status' => 'A']);

            // Se por algum motivo não havia pagamentos salvos, cria o registro inicial padrão
            if ($order->payments()->count() === 0) {
                \App\Modules\Finance\Models\Payment::create([
                    'order_id' => $order->id,
                    'status' => 'A',
                    'due_date' => now()->addDays(30),
                    'value' => $order->total_value,
                    'installment_number' => 1
                ]);
            }

            return response()->json([
                'message' => 'Orçamento convertido em pedido com sucesso!',
                'order' => $order
            ]);
        });
    }

    public function updateStatus(Request $request, Order $order)
    {
        $request->validate([
            'status' => 'required|in:draft,confirmed,production,ready,delivered,difficult_delivery,delivered_unpaid',
            'framer_id' => 'nullable|exists:employees,id',
            'delivered_at' => 'nullable|date',
            'delivery_observation' => 'nullable|string'
        ]);

        $updateData = ['status' => $request->status];

        // Se estiver entrando em produção, deve salvar quem está produzindo
        if ($request->status === 'production' && $request->has('framer_id')) {
            $updateData['framer_id'] = $request->framer_id;
        }

        // Se estiver sendo entregue, salva a data de entrega real e a observação
        if ($request->status === 'delivered') {
            $updateData['delivered_at'] = $request->delivered_at;
            $updateData['delivery_observation'] = $request->delivery_observation;
        }

        $order->update($updateData);

        return response()->json([
            'message' => 'Status atualizado com sucesso!',
            'order' => $order->load('framer')
        ]);
    }

    public function settle(Request $request, Order $order)
    {
        if ($order->status !== 'ready') {
            return response()->json([
                'message' => 'Apenas pedidos no status "Pronto para Entrega" podem ser baixados.'
            ], 422);
        }

        $request->validate([
            'payments' => 'nullable|array',
            'payments.*.payment_method_id' => 'nullable|exists:payment_methods,id',
            'payments.*.payment_method' => 'nullable|string',
            'payments.*.value' => 'nullable|numeric|min:0.01',
            'payments.*.installments' => 'nullable|integer|min:1',
            'payments.*.cheque_number' => 'nullable|string',
            'payments.*.cheque_agency' => 'nullable|string',
            'payments.*.cheque_account' => 'nullable|string',
            'payments.*.card_brand' => 'nullable|string',
            'payments.*.observation' => 'nullable|string',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'payment_method' => 'nullable|string',
            'delivered_at' => 'nullable|date',
            'delivery_observation' => 'nullable|string',
            'installments' => 'nullable|integer|min:1',
            'cheque_number' => 'nullable|string',
            'cheque_agency' => 'nullable|string',
            'cheque_account' => 'nullable|string',
            'card_brand' => 'nullable|string',
            'observation' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request, $order) {
            $existingPayments = $order->payments;

            $alreadyPaid = $existingPayments->reduce(function($acc, $p) {
                $val = (float)($p->paid_value ?? $p->value ?? 0);
                $method = mb_strtoupper($p->payment_method ?? '');
                $isCash = str_contains($method, 'PIX') || str_contains($method, 'DINHEIRO') || str_contains($method, 'DÉBITO') || str_contains($method, 'DEBITO');
                if ($p->status === 'P' || $p->paid_at || $isCash) {
                    return $acc + ($val > 0 ? $val : (float)$p->value);
                }
                return $acc;
            }, 0.0);

            $totalOrderValue = (float) $order->total_value;
            $remainingBalance = max(0.0, round($totalOrderValue - (float)$alreadyPaid, 2));

            // Limpa parcelas abertas antigas para reinserção exata da baixa
            $order->payments()->where(function($q) {
                $q->where('status', '!=', 'P')->whereNull('paid_at');
            })->delete();

            if ($remainingBalance > 0.01) {
                $paymentList = [];
                if ($request->has('payments') && is_array($request->payments) && count($request->payments) > 0) {
                    $paymentList = $request->payments;
                } else if ($request->payment_method_id || $request->payment_method) {
                    $paymentList[] = [
                        'payment_method_id' => $request->payment_method_id,
                        'payment_method' => $request->payment_method,
                        'value' => $remainingBalance,
                        'installments' => $request->installments ?? 1,
                        'cheque_number' => $request->cheque_number,
                        'cheque_agency' => $request->cheque_agency,
                        'cheque_account' => $request->cheque_account,
                        'card_brand' => $request->card_brand,
                        'observation' => $request->observation,
                    ];
                }

                foreach ($paymentList as $pData) {
                    $pVal = isset($pData['value']) ? (float)$pData['value'] : $remainingBalance;
                    if ($pVal <= 0) continue;

                    $methodName = $pData['payment_method'] ?? null;
                    $isCash = false;

                    if (!empty($pData['payment_method_id'])) {
                        $pm = \App\Modules\Core\Models\PaymentMethod::find($pData['payment_method_id']);
                        if ($pm) {
                            $methodName = $pm->description;
                            $isCash = (bool) $pm->is_cash;
                        }
                    }

                    if (!$isCash && $methodName) {
                        $upper = mb_strtoupper($methodName);
                        if (str_contains($upper, 'PIX') || str_contains($upper, 'DINHEIRO') || str_contains($upper, 'DÉBITO') || str_contains($upper, 'DEBITO')) {
                            $isCash = true;
                        }
                    }

                    $installments = max(1, (int)($pData['installments'] ?? 1));
                    $installmentValue = round($pVal / $installments, 2);

                    for ($i = 1; $i <= $installments; $i++) {
                        $val = ($i === $installments) 
                            ? round($pVal - ($installmentValue * ($installments - 1)), 2)
                            : $installmentValue;

                        \App\Modules\Finance\Models\Payment::create([
                            'order_id' => $order->id,
                            'status' => 'P',
                            'due_date' => $isCash ? now()->format('Y-m-d') : now()->addMonths($i - 1)->addDays(30)->format('Y-m-d'),
                            'value' => $val,
                            'paid_value' => $val,
                            'paid_at' => now(),
                            'installment_number' => $i,
                            'payment_method' => $methodName ?? 'PIX',
                            'cheque_number' => $pData['cheque_number'] ?? null,
                            'cheque_agency' => $pData['cheque_agency'] ?? null,
                            'cheque_account' => $pData['cheque_account'] ?? null,
                            'card_brand' => $pData['card_brand'] ?? null,
                            'observation' => $pData['observation'] ?? null,
                        ]);
                    }
                }
            } else {
                $order->payments()->where('status', '!=', 'P')->update([
                    'status' => 'P',
                    'paid_at' => now(),
                    'paid_value' => DB::raw('value')
                ]);
            }

            $deliveredAt = $request->delivered_at ? $request->delivered_at : now();
            $order->update([
                'status' => 'delivered',
                'delivered_at' => $deliveredAt,
                'delivery_observation' => $request->delivery_observation ?? $order->delivery_observation
            ]);

            return response()->json([
                'message' => 'Baixa do pedido realizada com sucesso!',
                'order' => $order->load(['customer', 'seller', 'framer', 'payments'])
            ]);
        });
    }

    public function printOS($orderKey)
    {
        $cleanId = preg_replace('/[^0-9]/', '', (string)$orderKey);
        $order = Order::where('id', $cleanId)
            ->orWhere('id', $orderKey)
            ->orWhere('legacy_id', $orderKey)
            ->firstOrFail();

        return response()->json($order->load(['customer', 'seller', 'framer', 'items.subItems', 'payments']));
    }

    public function destroy(Order $order)
    {
        if ($order->status !== 'draft') {
            return response()->json(['message' => 'Apenas orçamentos podem ser excluídos.'], 422);
        }

        $order->delete();

        return response()->json(['message' => 'Orçamento excluído com sucesso.']);
    }

    public function logRescue(Request $request, Order $order)
    {
        if (in_array($order->status, ['production', 'ready', 'delivered'])) {
            return response()->json(['message' => 'Pedidos em produção ou posteriores não podem ser resgatados para edição.'], 422);
        }

        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $userName = Auth::user()?->name ?? $request->input('user_name', 'Operador do Sistema');

        OrderEditLog::create([
            'order_id' => $order->id,
            'user_id' => Auth::id(),
            'user_name' => $userName,
            'reason' => $request->reason,
        ]);

        return response()->json([
            'message' => 'Motivo registrado com sucesso. Redirecionando para edição...',
            'order' => $order->load('editLogs')
        ]);
    }
}
