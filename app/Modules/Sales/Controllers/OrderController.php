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

        $storeId = $request->header('X-Store-Id');
        if ($storeId) {
            $query->where(function($q) use ($storeId) {
                $q->where('orders.store_id', $storeId);
                if ((int)$storeId === 1) {
                    $q->orWhereNull('orders.store_id');
                }
            });
        }

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
            $storeId = $request->header('X-Store-Id') ? (int)$request->header('X-Store-Id') : 1;
            $order = Order::create([
                'store_id' => $storeId,
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

                $pm = null;
                $settlementType = 'immediate';
                $settlementDays = 1;
                $intervalDays = 30;

                if ($paymentMethodId) {
                    $pm = \App\Modules\Core\Models\PaymentMethod::find($paymentMethodId);
                    if ($pm) {
                        $method = $pm->description;
                        $isCash = (bool) $pm->is_cash;
                        $settlementType = $pm->settlement_type ?? 'immediate';
                        $settlementDays = $pm->settlement_days ?? 1;
                        $intervalDays = $pm->installment_interval_days ?? 30;
                    }
                }

                if (!$isCash && $method) {
                    $upperMethod = mb_strtoupper($method);
                    if (str_contains($upperMethod, 'PIX') || str_contains($upperMethod, 'DINHEIRO') || str_contains($upperMethod, 'DÉBITO') || str_contains($upperMethod, 'DEBITO')) {
                        $isCash = true;
                        $settlementType = 'immediate';
                        $settlementDays = 1;
                    }
                }

                $assignedValue = isset($pmData['value']) && (float)$pmData['value'] > 0 
                    ? (float)$pmData['value'] 
                    : (float)$order->total_value;
                $installments = max(1, (int)($pmData['installments'] ?? 1));
                $installmentValue = $assignedValue / $installments;
                
                $isPaidExplicit = !empty($pmData['is_paid']) || ($pmData['status'] ?? '') === 'P';
                
                // Formas de pagamento "placeholder" (ex: A Pagar na Entrega) nunca podem ser marcadas como pagas
                if (isset($pm) && $pm && $pm->is_placeholder) {
                    $isPaidExplicit = false;
                }
                
                if ($order->status === 'delivered') {
                    if ($method && mb_strtoupper(trim($method)) === 'A PAGAR NA ENTREGA') {
                        abort(422, 'Você não pode usar a forma "A PAGAR NA ENTREGA" em um pedido que já está Entregue.');
                    }
                    $paymentStatus = 'P';
                } else {
                    $paymentStatus = $isPaidExplicit ? 'P' : ($order->status === 'draft' ? 'D' : 'A');
                }

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

                    $dueDate = null;
                    $expectedSettlementDate = null;

                    if ($settlementType === 'immediate') {
                        $dueDate = clone $order->created_at;
                        $expectedSettlementDate = $dueDate->copy()->addDays($settlementDays);
                        $dueDate = $dueDate->format('Y-m-d');
                        $expectedSettlementDate = $expectedSettlementDate->format('Y-m-d');
                    } elseif ($settlementType === 'credit_card') {
                        $daysToAdd = $settlementDays + (($i - 1) * $intervalDays);
                        $expectedSettlementDate = clone $order->created_at;
                        $expectedSettlementDate->addDays($daysToAdd);
                        $dueDate = $expectedSettlementDate->format('Y-m-d');
                        $expectedSettlementDate = $expectedSettlementDate->format('Y-m-d');
                    } elseif ($settlementType === 'custom_date') {
                        $baseDate = !empty($pmData['due_date']) 
                            ? \Carbon\Carbon::parse($pmData['due_date']) 
                            : clone $order->created_at;
                        $dueDateObj = $baseDate->copy()->addDays(($i - 1) * $intervalDays);
                        $dueDate = $dueDateObj->format('Y-m-d');
                        $expectedSettlementDate = $dueDateObj->copy()->addDays($settlementDays)->format('Y-m-d');
                    } else {
                        // Fallback
                        $dueDate = $isCash 
                            ? $order->created_at->format('Y-m-d') 
                            : $order->created_at->copy()->addMonths($i - 1)->addDays(30)->format('Y-m-d');
                        $expectedSettlementDate = clone $dueDate;
                    }
                    if ($paymentStatus !== 'P' && $order->delivery_date) {
                        $baseDate = \Carbon\Carbon::parse($order->delivery_date);
                        $dueDateObj = $baseDate->copy()->addDays(($i - 1) * $intervalDays);
                        $dueDate = $dueDateObj->format('Y-m-d');
                        $expectedSettlementDate = $dueDateObj->copy()->addDays($settlementDays)->format('Y-m-d');
                    }

                    \App\Modules\Finance\Models\Payment::create([
                        'order_id' => $order->id,
                        'status' => $paymentStatus,
                        'due_date' => $dueDate,
                        'expected_settlement_date' => $expectedSettlementDate,
                        'value' => $installmentValue,
                        'paid_value' => $paymentStatus === 'P' ? $installmentValue : 0,
                        'paid_at' => $paymentStatus === 'P' ? now() : null,
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
        $settlementType = 'immediate';
        $settlementDays = 1;
        $intervalDays = 30;

        if ($paymentMethodId) {
            $pm = \App\Modules\Core\Models\PaymentMethod::find($paymentMethodId);
            if ($pm) {
                $method = $pm->description;
                $isCash = (bool) $pm->is_cash;
                $settlementType = $pm->settlement_type ?? 'immediate';
                $settlementDays = $pm->settlement_days ?? 1;
                $intervalDays = $pm->installment_interval_days ?? 30;
            }
        }

        // Caso o método não venha de ID cadastrado mas por string, infere se é à vista
        if (!$isCash && $method) {
            $upperMethod = mb_strtoupper($method);
            if (str_contains($upperMethod, 'PIX') || str_contains($upperMethod, 'DINHEIRO') || str_contains($upperMethod, 'DÉBITO') || str_contains($upperMethod, 'DEBITO')) {
                $isCash = true;
                $settlementType = 'immediate';
                $settlementDays = 1;
            }
        }

        $installments = $details['installments'] ?? 1;
        $installmentValue = $order->total_value / $installments;
        
        if ($order->status === 'delivered') {
            if ($method && mb_strtoupper(trim($method)) === 'A PAGAR NA ENTREGA') {
                abort(422, 'Você não pode usar a forma "A PAGAR NA ENTREGA" em um pedido que já está Entregue.');
            }
            $paymentStatus = 'P';
        } else {
            $paymentStatus = $order->status === 'draft' ? 'D' : 'A';
        }

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

            $dueDate = null;
            $expectedSettlementDate = null;

            if ($settlementType === 'immediate') {
                $dueDate = clone $order->created_at;
                $expectedSettlementDate = $dueDate->copy()->addDays($settlementDays);
                $dueDate = $dueDate->format('Y-m-d');
                $expectedSettlementDate = $expectedSettlementDate->format('Y-m-d');
            } elseif ($settlementType === 'credit_card') {
                $daysToAdd = $settlementDays + (($i - 1) * $intervalDays);
                $expectedSettlementDate = clone $order->created_at;
                $expectedSettlementDate->addDays($daysToAdd);
                $dueDate = $expectedSettlementDate->format('Y-m-d');
                $expectedSettlementDate = $expectedSettlementDate->format('Y-m-d');
            } elseif ($settlementType === 'custom_date') {
                $baseDate = !empty($details['due_date']) 
                    ? \Carbon\Carbon::parse($details['due_date']) 
                    : clone $order->created_at;
                $dueDateObj = $baseDate->copy()->addDays(($i - 1) * $intervalDays);
                $dueDate = $dueDateObj->format('Y-m-d');
                $expectedSettlementDate = $dueDateObj->copy()->addDays($settlementDays)->format('Y-m-d');
            } else {
                $dueDate = $isCash 
                    ? $order->created_at->format('Y-m-d') 
                    : $order->created_at->copy()->addMonths($i - 1)->addDays(30)->format('Y-m-d');
                $expectedSettlementDate = $dueDate;
            }

            \App\Modules\Finance\Models\Payment::create([
                'order_id' => $order->id,
                'status' => $paymentStatus,
                'due_date' => $dueDate,
                'expected_settlement_date' => $expectedSettlementDate,
                'value' => $installmentValue,
                'paid_value' => $paymentStatus === 'P' ? $installmentValue : 0,
                'paid_at' => $paymentStatus === 'P' ? now() : null,
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
            $order->status = 'confirmed';
            $order->created_at = now();
            $order->save();
            
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
            'status' => 'required|in:draft,confirmed,production,ready,delivered,difficult_delivery,delivered_unpaid,finished,canceled',
            'framer_id' => 'nullable|exists:employees,id',
            'delivered_at' => 'nullable|date',
            'delivery_observation' => 'nullable|string',
            'is_force_status' => 'nullable|boolean',
            'admin_password' => 'nullable|string'
        ]);

        $updateData = ['status' => $request->status];

        if ($request->boolean('is_force_status')) {
            $request->validate(['admin_password' => 'required|string']);

            $admins = \App\Models\User::where('is_admin', true)->get();
            $authorizedAdmin = null;
            foreach ($admins as $admin) {
                if (\Illuminate\Support\Facades\Hash::check($request->admin_password, $admin->password)) {
                    $authorizedAdmin = $admin;
                    break;
                }
            }

            if (!$authorizedAdmin) {
                return response()->json(['message' => 'Senha de administrador inválida ou incorreta para esta operação.'], 403);
            }

            \App\Modules\Core\Models\AuditLog::create([
                'user_id' => $authorizedAdmin->id,
                'description' => "Alteração forçada de status do Pedido #{$order->id}",
                'metadata' => [
                    'order_id' => $order->id,
                    'old_status' => $order->status,
                    'new_status' => $request->status
                ]
            ]);
        }

        // Se estiver entrando em produção, deve salvar quem está produzindo
        if ($request->status === 'production' && $request->has('framer_id')) {
            $updateData['framer_id'] = $request->framer_id;
        }

        // Se estiver sendo entregue normalmente (não forçado), valida o pagamento e salva dados da entrega
        if (!$request->boolean('is_force_status') && $request->status === 'delivered') {
            $existingPayments = $order->payments;
            $placeholderMethods = \App\Modules\Core\Models\PaymentMethod::where('is_placeholder', true)->pluck('description')->map(fn($m) => mb_strtoupper($m))->toArray();

            $alreadyAllocated = $existingPayments->reduce(function($acc, $p) use ($placeholderMethods) {
                if ($p->status === 'C' || $p->status === 'CANCELADO') {
                    return $acc;
                }
                if ($p->payment_method && in_array(mb_strtoupper($p->payment_method), $placeholderMethods)) {
                    return $acc;
                }
                return $acc + (float)$p->value;
            }, 0.0);
            
            $totalOrderValue = (float) $order->total_value;
            $remainingBalance = max(0.0, round($totalOrderValue - (float)$alreadyAllocated, 2));

            if ($remainingBalance > 0.01) {
                return response()->json([
                    'message' => 'O sistema não permite dar baixa em um pedido com pendência de pagamento (Saldo pendente: R$ ' . number_format($remainingBalance, 2, ',', '.') . ').'
                ], 422);
            }

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
            'is_unpaid_override' => 'nullable|boolean',
            'admin_password' => 'nullable|string',
        ]);

        $existingPayments = $order->payments;

        $placeholderMethods = \App\Modules\Core\Models\PaymentMethod::where('is_placeholder', true)->pluck('description')->map(fn($m) => mb_strtoupper($m))->toArray();

        $alreadyAllocated = $existingPayments->reduce(function($acc, $p) use ($placeholderMethods) {
            if ($p->status === 'C' || $p->status === 'CANCELADO') {
                return $acc;
            }
            if ($p->payment_method && in_array(mb_strtoupper($p->payment_method), $placeholderMethods)) {
                return $acc;
            }
            return $acc + (float)$p->value;
        }, 0.0);

        $totalOrderValue = (float) $order->total_value;
        $remainingBalance = max(0.0, round($totalOrderValue - (float)$alreadyAllocated, 2));

        $isOverride = $request->boolean('is_unpaid_override');
        $authorizedAdmin = null;

        if ($isOverride) {
            $request->validate(['admin_password' => 'required|string']);
            
            $admins = \App\Models\User::where('is_admin', true)->get();
            foreach ($admins as $admin) {
                if (\Illuminate\Support\Facades\Hash::check($request->admin_password, $admin->password)) {
                    $authorizedAdmin = $admin;
                    break;
                }
            }

            if (!$authorizedAdmin) {
                return response()->json(['message' => 'Senha de administrador inválida ou incorreta para a liberação.'], 403);
            }
        } else {
            if ($remainingBalance > 0.01) {
                $allocatedTotal = 0.0;
                if ($request->has('payments') && is_array($request->payments)) {
                    $allocatedTotal = collect($request->payments)->sum('value');
                } else if ($request->payment_method_id || $request->payment_method) {
                    $allocatedTotal = $remainingBalance;
                }

                if (round($allocatedTotal, 2) < $remainingBalance) {
                    return response()->json([
                        'message' => 'O sistema não permite dar baixa em um pedido com pendência de pagamento. O saldo restante de R$ ' . number_format($remainingBalance, 2, ',', '.') . ' deve ser quitado.'
                    ], 422);
                }
            }
        }

        return DB::transaction(function () use ($request, $order, $remainingBalance, $placeholderMethods, $isOverride, $authorizedAdmin) {

            if ($isOverride) {
                \App\Modules\Core\Models\AuditLog::create([
                    'user_id' => $authorizedAdmin->id,
                    'description' => "Liberação de Pedido Entregue sem quitar (Override) #{$order->id}",
                    'metadata' => [
                        'order_id' => $order->id,
                        'total_value' => $order->total_value,
                        'remaining_balance' => $remainingBalance
                    ]
                ]);
            } else {
                // Remove parcelas que são marcadas como placeholder (ex: A Pagar na Entrega),
                // pois elas não valem como recebíveis e serão substituídas pela baixa real.
                $order->payments()->get()->filter(function($p) use ($placeholderMethods) {
                    return in_array(mb_strtoupper($p->payment_method), $placeholderMethods);
                })->each->delete();

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

                    if ($methodName && mb_strtoupper($methodName) === 'A PAGAR NA ENTREGA') {
                        return response()->json([
                            'message' => 'O sistema não permite concluir a baixa com a forma "A PAGAR NA ENTREGA". Por favor, informe a forma real de pagamento.'
                        ], 422);
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
        } // Close else for $isOverride

        $deliveredAt = $request->delivered_at ? $request->delivered_at : now();
            $order->update([
                'status' => $isOverride ? 'delivered_unpaid' : 'delivered',
                'delivered_at' => $deliveredAt,
                'delivery_observation' => $request->delivery_observation ?? $order->delivery_observation
            ]);

            return response()->json([
                'message' => 'Baixa do pedido realizada com sucesso!',
                'order' => $order->load(['customer', 'seller', 'framer', 'payments'])
            ]);
        });
    }

    private function resolveUser(Request $request): ?\App\Models\User
    {
        $user = $request->user();
        if ($user) {
            return $user;
        }

        $token = $request->bearerToken();
        if (!$token) {
            return null;
        }

        try {
            $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key(config('app.key'), 'HS256'));
            return \App\Models\User::find($decoded->sub);
        } catch (\Throwable) {
            return null;
        }
    }

    public function printOS(Request $request, $orderKey)
    {
        $user = $this->resolveUser($request);
        $isAuthenticated = !is_null($user);
        $isUuid = \Illuminate\Support\Str::isUuid($orderKey);

        // Segurança: Se o usuário NÃO está autenticado (acesso público via WhatsApp/link externo),
        // exige obrigatoriamente a chave UUID única de 36 caracteres.
        // Isso impede que qualquer pessoa tente alterar o ID sequencial na URL para acessar orçamentos de outros clientes.
        if (!$isAuthenticated && !$isUuid) {
            return response()->json([
                'message' => 'Acesso negado. Para acessar o Orçamento/Pedido sem login, utilize o link de acesso seguro (UUID).'
            ], 403);
        }

        $order = Order::where('uuid', $orderKey)
            ->when($isAuthenticated, function ($query) use ($orderKey) {
                $cleanId = preg_replace('/[^0-9]/', '', (string)$orderKey);
                if ($cleanId !== '') {
                    $query->orWhere('id', $cleanId)->orWhere('legacy_id', $cleanId);
                }
            })
            ->first();

        if (!$order) {
            return response()->json([
                'message' => 'Orçamento/Pedido não encontrado ou link de acesso expirado/inválido.'
            ], 404);
        }

        return response()->json($order->load(['customer', 'seller', 'framer', 'items.subItems', 'payments']));
    }

    public function destroy(Request $request, Order $order)
    {
        $request->validate([
            'admin_password' => 'required|string',
        ]);

        // Verificar se a senha pertence a algum administrador ativo
        $admins = \App\Models\User::where('is_admin', true)->get();
        $authorizedAdmin = null;

        foreach ($admins as $admin) {
            if (\Illuminate\Support\Facades\Hash::check($request->admin_password, $admin->password)) {
                $authorizedAdmin = $admin;
                break;
            }
        }

        if (!$authorizedAdmin) {
            return response()->json(['message' => 'Senha de administrador inválida ou incorreta.'], 403);
        }

        // Registrar log de auditoria
        \App\Modules\Core\Models\AuditLog::create([
            'user_id' => $authorizedAdmin->id,
            'description' => "Exclusão de Pedido/Orçamento #{$order->id}",
            'metadata' => [
                'order_id' => $order->id,
                'total_value' => $order->total_value,
                'status_before_delete' => $order->status,
                'customer_id' => $order->customer_id
            ]
        ]);

        $order->delete();

        return response()->json(['message' => 'Registro excluído com sucesso.']);
    }

    public function logRescue(Request $request, Order $order)
    {
        $requiresAdmin = in_array($order->status, ['production', 'ready', 'delivered', 'delivered_unpaid']);

        $rules = [
            'reason' => 'required|string|max:1000',
        ];

        if ($requiresAdmin) {
            $rules['admin_password'] = 'required|string';
        }

        $request->validate($rules);

        $userName = Auth::user()?->name ?? $request->input('user_name', 'Operador do Sistema');
        $userId = Auth::id();

        if ($requiresAdmin) {
            // Verificar se a senha pertence a algum administrador ativo
            $admins = \App\Models\User::where('is_admin', true)->get();
            $authorizedAdmin = null;

            foreach ($admins as $admin) {
                if (\Illuminate\Support\Facades\Hash::check($request->admin_password, $admin->password)) {
                    $authorizedAdmin = $admin;
                    break;
                }
            }

            if (!$authorizedAdmin) {
                return response()->json(['message' => 'Senha de administrador inválida ou incorreta.'], 403);
            }
            
            $userName = $authorizedAdmin->name;
            $userId = $authorizedAdmin->id;
        }

        OrderEditLog::create([
            'order_id' => $order->id,
            'user_id' => $userId,
            'user_name' => $userName,
            'reason' => $request->reason,
        ]);

        return response()->json([
            'message' => 'Motivo registrado com sucesso. Redirecionando para edição...',
            'order' => $order->load('editLogs')
        ]);
    }
}
