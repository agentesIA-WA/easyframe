<?php

namespace App\Modules\BI\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Sales\Models\Order;
use App\Modules\Finance\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function dashboard(Request $request)
    {
        $storeId = $request->header('X-Store-Id');
        
        $salesQuery = Order::where('status', '!=', 'draft');
        $pendingQuery = Order::where('status', 'production');
        $readyQuery = Order::where('status', 'ready');
        $currentMonthQuery = Order::where('status', '!=', 'draft')->whereMonth('created_at', now()->month);
        $lastMonthQuery = Order::where('status', '!=', 'draft')->whereMonth('created_at', now()->subMonth()->month);

        if ($storeId) {
            $applyStore = function($q) use ($storeId) {
                $q->where(function($sq) use ($storeId) {
                    $sq->where('store_id', $storeId);
                    if ((int)$storeId === 1) {
                        $sq->orWhereNull('store_id');
                    }
                });
            };
            $applyStore($salesQuery);
            $applyStore($pendingQuery);
            $applyStore($readyQuery);
            $applyStore($currentMonthQuery);
            $applyStore($lastMonthQuery);
        }

        $totalSales = $salesQuery->sum('total_value');
        $pendingOrders = $pendingQuery->count();
        $readyOrders = $readyQuery->count();
        
        $currentMonth = $currentMonthQuery->sum('total_value');
        $lastMonth = $lastMonthQuery->sum('total_value');
            
        $growth = 0;
        if ($lastMonth > 0) {
            $growth = (($currentMonth - $lastMonth) / $lastMonth) * 100;
        } elseif ($currentMonth > 0) {
            $growth = 100;
        }

        return response()->json([
            'total_sales' => (float) $totalSales,
            'pending_orders' => $pendingOrders,
            'ready_orders' => $readyOrders,
            'growth' => round($growth, 1)
        ]);
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

    private function getEmployeeForUser($user)
    {
        if (!$user) {
            return null;
        }

        return \App\Modules\HR\Models\Employee::where('user_id', $user->id)
            ->orWhere('name', 'LIKE', '%' . $user->name . '%')
            ->first();
    }

    public function dailyMovement(Request $request)
    {
        $start = null;
        $end = null;

        $user = $this->resolveUser($request);
        $isAdmin = $user ? (bool) ($user->is_admin || $user->id === 1) : false;

        $query = Order::where('status', '!=', 'draft')
            ->with(['customer', 'items', 'payments', 'seller']);

        $storeId = $request->header('X-Store-Id');
        if ($storeId) {
            $query->where(function($q) use ($storeId) {
                $q->where('orders.store_id', $storeId);
                if ((int)$storeId === 1) {
                    $q->orWhereNull('orders.store_id');
                }
            });
        }

        if (!$isAdmin) {
            $employee = $this->getEmployeeForUser($user);
            $employeeId = $employee ? $employee->id : 0;
            $query->where('seller_id', $employeeId);
        }

        if ($request->filled('date') && $request->date !== 'all') {
            $selectedDate = \Carbon\Carbon::parse($request->date);
            $start = $selectedDate->copy()->startOfDay();
            $end = $selectedDate->copy()->endOfDay();
            $query->whereBetween('created_at', [$start, $end]);
        } elseif ($request->filled('start_date') && $request->filled('end_date')) {
            $start = \Carbon\Carbon::parse($request->start_date)->startOfDay();
            $end = \Carbon\Carbon::parse($request->end_date)->endOfDay();
            $query->whereBetween('created_at', [$start, $end]);
        }

        // Limita a 1000 registros para evitar memory exhaustion se buscar TODAS as datas
        $orders = $query->orderBy('created_at', 'desc')->take(1000)->get();

        if ($orders->isEmpty()) {
            $debugOrder = new Order();
            $debugOrder->id = 999999;
            $debugOrder->status = 'ready';
            $debugOrder->total_value = 0;
            $debugOrder->created_at = now();
            
            $debugCustomer = new \App\Modules\Customers\Models\Customer();
            $debugCustomer->name = "DEBUG INFO -> UserID: " . ($user ? $user->id : 'null') . 
                                   " | IsAdmin: " . ($isAdmin ? 'yes' : 'no') . 
                                   " | StoreID: " . ($storeId ?? 'null') . 
                                   " | SQL: " . $query->toSql() . 
                                   " | Binds: " . implode(',', $query->getBindings());
            $debugOrder->setRelation('customer', $debugCustomer);
            $debugOrder->setRelation('items', collect([]));
            $debugOrder->setRelation('payments', collect([]));
            
            $orders->push($debugOrder);
        }

        $discounts = (float) $orders->sum(function ($order) {
            $headerDisc = (float) ($order->discount ?? 0);
            $itemDisc = (float) $order->items->sum('item_discount');
            return $headerDisc + $itemDisc;
        });

        $totalSales = (float) $orders->sum('total_value');
        $grossValue = $totalSales + $discounts;

        foreach ($orders as $order) {
            $headerDisc = (float) ($order->discount ?? 0);
            $itemDisc = (float) $order->items->sum('item_discount');
            $order->total_discount = $headerDisc + $itemDisc;
            $order->gross_value = (float) $order->total_value + $order->total_discount;
        }

        $totals = [
            'count' => $orders->count(),
            'gross_value' => $grossValue,
            'discounts' => $discounts,
            'total_sales' => $totalSales,
        ];

        // Agrupamento por forma de pagamento
        $paymentMethodsMap = [];
        foreach ($orders as $order) {
            if ($order->payments && $order->payments->count() > 0) {
                foreach ($order->payments as $payment) {
                    $methodName = trim(mb_strtoupper($payment->payment_method ?: 'NÃO INFORMADO'));
                    if (!isset($paymentMethodsMap[$methodName])) {
                        $paymentMethodsMap[$methodName] = [
                            'method' => $methodName,
                            'total' => 0.0,
                            'count' => 0
                        ];
                    }
                    $val = (float) $payment->value > 0 ? (float) $payment->value : (float) $payment->paid_value;
                    if ($val == 0) {
                        $val = (float) $order->total_value;
                    }
                    $paymentMethodsMap[$methodName]['total'] += $val;
                    $paymentMethodsMap[$methodName]['count']++;
                }
            } else {
                $methodName = 'A RECEBER / NÃO DEFINIDO';
                if (!isset($paymentMethodsMap[$methodName])) {
                    $paymentMethodsMap[$methodName] = [
                        'method' => $methodName,
                        'total' => 0.0,
                        'count' => 0
                    ];
                }
                $paymentMethodsMap[$methodName]['total'] += (float) $order->total_value;
                $paymentMethodsMap[$methodName]['count']++;
            }
        }

        $paymentBreakdown = array_values($paymentMethodsMap);
        foreach ($paymentBreakdown as &$item) {
            $item['percentage'] = $totalSales > 0 ? round(($item['total'] / $totalSales) * 100, 1) : 0;
        }

        return response()->json([
            'date' => $start ? $start->format('Y-m-d') : 'all',
            'period' => ['start' => $start ? $start->toDateTimeString() : null, 'end' => $end ? $end->toDateTimeString() : null],
            'totals' => $totals,
            'payment_breakdown' => $paymentBreakdown,
            'data' => $orders
        ]);
    }

    /**
     * Cálculo de Comissões por Vendedor ligado às taxas de cada Forma de Pagamento (BR-MIGRAR-012).
     */
    public function commissions(Request $request)
    {
        $query = Order::where('status', '!=', 'draft')->with(['payments', 'customer']);

        $storeId = $request->header('X-Store-Id');
        if ($storeId) {
            $query->where(function($q) use ($storeId) {
                $q->where('orders.store_id', $storeId);
                if ((int)$storeId === 1) {
                    $q->orWhereNull('orders.store_id');
                }
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $start = \Carbon\Carbon::parse($request->start_date)->startOfDay();
            $end = \Carbon\Carbon::parse($request->end_date)->endOfDay();
            $query->whereBetween('created_at', [$start, $end]);
        } elseif ($request->filled('date') && $request->date !== 'all') {
            $date = \Carbon\Carbon::parse($request->date);
            $start = $date->copy()->startOfDay();
            $end = $date->copy()->endOfDay();
            $query->whereBetween('created_at', [$start, $end]);
        }

        $user = $this->resolveUser($request);
        $isAdmin = $user ? (bool) ($user->is_admin || $user->id === 1) : false;

        $vendedoresQuery = \App\Modules\HR\Models\Employee::query();
        if ($storeId) {
            $vendedoresQuery->where(function($q) use ($storeId) {
                $q->whereHas('stores', function($sq) use ($storeId) {
                    $sq->where('stores.id', $storeId);
                })->orWhere('store_id', $storeId);
                if ((int)$storeId === 1) {
                    $q->orWhereNull('store_id');
                }
            });
        }

        if (!$isAdmin) {
            $employee = $this->getEmployeeForUser($user);
            if ($employee) {
                $vendedoresQuery->where('id', $employee->id);
            } else {
                $vendedoresQuery->whereRaw('1 = 0');
            }
        }

        $vendedores = $vendedoresQuery->get();
        $paymentMethods = \App\Modules\Core\Models\PaymentMethod::all();

        $result = $vendedores->map(function ($vendedor) use ($query, $paymentMethods) {
            $sellerOrders = (clone $query)->where('seller_id', $vendedor->id)->get();
            
            $totalSales = 0.0;
            $totalCommission = 0.0;
            $ordersCount = $sellerOrders->count();

            $sellerDefaultRate = (float) ($vendedor->commission_rate > 0 ? $vendedor->commission_rate : 5.0);

            $ordersList = $sellerOrders->map(function ($order) use ($paymentMethods, $sellerDefaultRate) {
                $orderTotal = (float) $order->total_value;
                $orderCommission = 0.0;
                $paymentsDetail = [];

                if ($order->payments && $order->payments->count() > 0) {
                    foreach ($order->payments as $payment) {
                        $pVal = (float) $payment->value;
                        $rate = $this->getPaymentMethodCommissionRate($payment->payment_method, $paymentMethods, $sellerDefaultRate);
                        $pComm = $pVal * ($rate / 100);
                        $orderCommission += $pComm;
                        $paymentsDetail[] = [
                            'method' => $payment->payment_method ?: 'Geral',
                            'value' => $pVal,
                            'rate' => $rate,
                            'commission' => round($pComm, 2)
                        ];
                    }
                } else {
                    $orderCommission = $orderTotal * ($sellerDefaultRate / 100);
                    $paymentsDetail[] = [
                        'method' => 'Padrão Vendedor',
                        'value' => $orderTotal,
                        'rate' => $sellerDefaultRate,
                        'commission' => round($orderCommission, 2)
                    ];
                }

                return [
                    'id' => $order->id,
                    'created_at' => $order->created_at ? $order->created_at->format('d/m/Y H:i') : '—',
                    'customer_name' => $order->customer ? $order->customer->name : 'Consumidor Final',
                    'status' => $order->status,
                    'total_value' => $orderTotal,
                    'commission_value' => round($orderCommission, 2),
                    'payments' => $paymentsDetail
                ];
            })->values();

            foreach ($ordersList as $ord) {
                $totalSales += $ord['total_value'];
                $totalCommission += $ord['commission_value'];
            }

            $effectivePercentage = $totalSales > 0 ? round(($totalCommission / $totalSales) * 100, 2) : $sellerDefaultRate;

            return [
                'id' => $vendedor->id,
                'seller_name' => $vendedor->name,
                'role' => $vendedor->role ?? 'Vendedor',
                'orders_count' => $ordersCount,
                'total_sales' => round($totalSales, 2),
                'commission_rate' => $sellerDefaultRate,
                'bonus_percentage' => $effectivePercentage,
                'commission_value' => round($totalCommission, 2),
                'orders' => $ordersList
            ];
        });

        $filteredResult = $result->filter(function ($item) {
            return $item['total_sales'] > 0;
        })->values();

        $totalSalesSum = (float) $filteredResult->sum('total_sales');
        $totalCommissionsSum = (float) $filteredResult->sum('commission_value');

        return response()->json([
            'count' => $filteredResult->count(),
            'total_sales' => $totalSalesSum,
            'total_commission' => round($totalCommissionsSum, 2),
            'data' => $filteredResult
        ]);
    }

    /**
     * Obtém a taxa de comissão da forma de pagamento correspondente.
     */
    private function getPaymentMethodCommissionRate(?string $methodName, $paymentMethods, float $fallbackRate = 5.0): float
    {
        if (!$methodName) {
            return $fallbackRate;
        }

        $cleanInput = mb_strtoupper(preg_replace('/[^A-Z0-9]/', '', iconv('UTF-8', 'ASCII//TRANSLIT', $methodName)));

        foreach ($paymentMethods as $pm) {
            $cleanPm = mb_strtoupper(preg_replace('/[^A-Z0-9]/', '', iconv('UTF-8', 'ASCII//TRANSLIT', $pm->description)));

            if ($cleanInput && ($cleanInput === $cleanPm || str_contains($cleanInput, $cleanPm) || str_contains($cleanPm, $cleanInput))) {
                return (float) $pm->commission_rate;
            }
        }

        return $fallbackRate;
    }

    /**
     * Relatório de Contas a Receber / Inadimplência (Legado: Relatorio_AReceber.cfm).
     */
    public function accountsReceivable(Request $request)
    {
        $user = $this->resolveUser($request);
        $isAdmin = $user ? (bool) ($user->is_admin || $user->id === 1) : false;

        $storeId = $request->header('X-Store-Id');

        $query = Payment::where('status', 'A')
            ->with(['order.customer'])
            ->whereHas('order', function ($q) {
                $q->where('status', '!=', 'draft');
            });

        if ($storeId) {
            $query->whereHas('order', function($q) use ($storeId) {
                $q->where(function($sq) use ($storeId) {
                    $sq->where('orders.store_id', $storeId);
                    if ((int)$storeId === 1) {
                        $sq->orWhereNull('orders.store_id');
                    }
                });
            });
        }

        if (!$isAdmin) {
            $employee = $this->getEmployeeForUser($user);
            $employeeId = $employee ? $employee->id : 0;
            $query->whereHas('order', function ($q) use ($employeeId) {
                $q->where('seller_id', $employeeId);
            });
        }

        if ($request->filled('customer_name')) {
            $query->whereHas('order.customer', function ($q) use ($request) {
                $q->where('name', 'LIKE', '%' . strtoupper($request->customer_name) . '%');
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $start = \Carbon\Carbon::parse($request->start_date)->startOfDay();
            $end = \Carbon\Carbon::parse($request->end_date)->endOfDay();
            $query->whereBetween('due_date', [$start, $end]);
        } elseif ($request->filled('date') && $request->date !== 'all') {
            $selectedDate = \Carbon\Carbon::parse($request->date);
            $start = $selectedDate->copy()->startOfDay();
            $end = $selectedDate->copy()->endOfDay();
            $query->whereBetween('due_date', [$start, $end]);
        }

        $payments = $query->orderBy('due_date')->get();

        return response()->json([
            'total_value' => $payments->sum('value'),
            'count' => $payments->count(),
            'data' => $payments
        ]);
    }

    /**
     * Relatório de Despesas (Legado: Despesas_Relatorio.cfm).
     */
    public function expenses(Request $request)
    {
        $user = $this->resolveUser($request);
        $isAdmin = $user ? (bool) ($user->is_admin || $user->id === 1) : false;

        if (!$isAdmin) {
            return response()->json([
                'count' => 0,
                'total_value' => 0.0,
                'paid_value' => 0.0,
                'pending_value' => 0.0,
                'data' => []
            ]);
        }

        $query = \App\Modules\Finance\Models\Expense::with('type');

        $storeId = $request->header('X-Store-Id');
        if ($storeId) {
            $query->where(function($q) use ($storeId) {
                $q->where('store_id', $storeId);
                if ((int)$storeId === 1) {
                    $q->orWhereNull('store_id');
                }
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $start = \Carbon\Carbon::parse($request->start_date)->startOfDay();
            $end = \Carbon\Carbon::parse($request->end_date)->endOfDay();
            $query->whereBetween('due_date', [$start, $end]);
        } elseif ($request->filled('date') && $request->date !== 'all') {
            $date = \Carbon\Carbon::parse($request->date);
            $start = $date->copy()->startOfDay();
            $end = $date->copy()->endOfDay();
            $query->whereBetween('due_date', [$start, $end]);
        }

        $expenses = $query->orderBy('due_date', 'asc')->get();

        $totalValue = (float)$expenses->sum('amount');
        $paidValue = (float)$expenses->where('status', 'paid')->sum('amount');
        $pendingValue = (float)$expenses->where('status', 'pending')->sum('amount');

        return response()->json([
            'count' => $expenses->count(),
            'total_value' => $totalValue,
            'paid_value' => $paidValue,
            'pending_value' => $pendingValue,
            'data' => $expenses
        ]);
    }

    /**
     * Fluxo de Caixa (Legado: Caixa_Relatorio.cfm).
     */
    public function cashFlow(Request $request)
    {
        if ($request->filled('date') && $request->date !== 'all') {
            $start = \Carbon\Carbon::parse($request->date)->startOfDay();
            $end = \Carbon\Carbon::parse($request->date)->endOfDay();
        } elseif ($request->filled('start_date') && $request->filled('end_date')) {
            $start = \Carbon\Carbon::parse($request->start_date)->startOfDay();
            $end = \Carbon\Carbon::parse($request->end_date)->endOfDay();
        } else {
            $start = null;
            $end = null;
        }

        $inflowQuery = Payment::where('status', 'P');
        $outflowQuery = \App\Modules\Finance\Models\Expense::query();

        $storeId = $request->header('X-Store-Id');
        if ($storeId) {
            $inflowQuery->whereHas('order', function($q) use ($storeId) {
                $q->where(function($sq) use ($storeId) {
                    $sq->where('orders.store_id', $storeId);
                    if ((int)$storeId === 1) {
                        $sq->orWhereNull('orders.store_id');
                    }
                });
            });
            $outflowQuery->where(function($q) use ($storeId) {
                $q->where('store_id', $storeId);
                if ((int)$storeId === 1) {
                    $q->orWhereNull('store_id');
                }
            });
        }

        $user = $this->resolveUser($request);
        $isAdmin = $user ? (bool) ($user->is_admin || $user->id === 1) : false;

        if (!$isAdmin) {
            $employee = $this->getEmployeeForUser($user);
            $employeeId = $employee ? $employee->id : 0;
            $inflowQuery->whereHas('order', function ($q) use ($employeeId) {
                $q->where('seller_id', $employeeId);
            });
            $outflowQuery->whereRaw('1 = 0');
        }

        if ($start && $end) {
            $inflowQuery->whereBetween('created_at', [$start, $end]);
            $outflowQuery->whereBetween('due_date', [$start, $end]);
        }

        $inflow = (float) $inflowQuery->sum('value');
        $outflow = (float) $outflowQuery->sum('amount');

        return response()->json([
            'period' => ['start' => $start ? $start->toDateTimeString() : null, 'end' => $end ? $end->toDateTimeString() : null],
            'inflow' => $inflow,
            'outflow' => $outflow,
            'balance' => round($inflow - $outflow, 2)
        ]);
    }

    /**
     * Previsão de Entrega & Status de Produção (Legado: PrevisaoEntrega_Relatorio.cfm).
     */
    public function deliveryForecast(Request $request)
    {
        $user = $this->resolveUser($request);
        $isAdmin = $user ? (bool) ($user->is_admin || $user->id === 1) : false;

        $query = Order::where('status', '!=', 'draft')
            ->with(['customer', 'seller', 'framer', 'items', 'payments']);

        $storeId = $request->header('X-Store-Id');
        if ($storeId) {
            $query->where(function($q) use ($storeId) {
                $q->where('orders.store_id', $storeId);
                if ((int)$storeId === 1) {
                    $q->orWhereNull('orders.store_id');
                }
            });
        }

        if (!$isAdmin) {
            $employee = $this->getEmployeeForUser($user);
            $employeeId = $employee ? $employee->id : 0;
            $query->where(function ($q) use ($employeeId) {
                $q->where('seller_id', $employeeId)
                  ->orWhere('framer_id', $employeeId);
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $start = \Carbon\Carbon::parse($request->start_date)->startOfDay();
            $end = \Carbon\Carbon::parse($request->end_date)->endOfDay();
            $query->where(function ($q) use ($start, $end) {
                $q->whereBetween('created_at', [$start, $end])
                  ->orWhereBetween('delivery_date', [$start, $end]);
            });
        } elseif ($request->filled('date') && $request->date !== 'all') {
            $selectedDate = \Carbon\Carbon::parse($request->date);
            $start = $selectedDate->copy()->startOfDay();
            $end = $selectedDate->copy()->endOfDay();
            $query->where(function ($q) use ($start, $end) {
                $q->whereBetween('created_at', [$start, $end])
                  ->orWhereBetween('delivery_date', [$start, $end]);
            });
        }

        $orders = $query->orderBy('delivery_date', 'asc')->get();

        $statusMap = [
            'production' => 'EM PRODUÇÃO',
            'confirmed' => 'EM PRODUÇÃO',
            'ready' => 'PRONTO P/ ENTREGA',
            'delivered' => 'ENTREGUE / CONCLUÍDO',
            'difficult_delivery' => 'ENTREGA DIFICULTADA',
            'delivered_unpaid' => 'ENTREGUE S/ PAGAMENTO',
        ];

        $statusBreakdownMap = [];
        $totalOrdersCount = $orders->count();
        $totalValue = (float) $orders->sum('total_value');

        foreach ($orders as $order) {
            $statusKey = $order->status;
            $statusLabel = $statusMap[$statusKey] ?? strtoupper($statusKey);

            if (!isset($statusBreakdownMap[$statusLabel])) {
                $statusBreakdownMap[$statusLabel] = [
                    'status_key' => $statusKey,
                    'status_label' => $statusLabel,
                    'total' => 0.0,
                    'count' => 0
                ];
            }
            $statusBreakdownMap[$statusLabel]['total'] += (float) $order->total_value;
            $statusBreakdownMap[$statusLabel]['count']++;
        }

        $statusBreakdown = array_values($statusBreakdownMap);
        foreach ($statusBreakdown as &$item) {
            $item['percentage'] = $totalValue > 0 ? round(($item['total'] / $totalValue) * 100, 1) : 0;
        }

        return response()->json([
            'totals' => [
                'count' => $totalOrdersCount,
                'total_value' => $totalValue,
                'in_production' => $orders->whereIn('status', ['production', 'confirmed'])->count(),
                'ready' => $orders->where('status', 'ready')->count(),
                'delivered' => $orders->where('status', 'delivered')->count(),
            ],
            'status_breakdown' => $statusBreakdown,
            'data' => $orders
        ]);
    }

    /**
     * Aplica os brackets de bônus conforme as configurações globais.
     */
    private function calculateBonus(float $totalSales): float
    {
        $settings = \App\Modules\Core\Models\Setting::first();
        if (!$settings) return 0.0;

        for ($i = 5; $i >= 1; $i--) {
            $start = $settings->{"bracket_{$i}_start"};
            $end = $settings->{"bracket_{$i}_end"};
            $commission = $settings->{"bracket_{$i}_commission"};

            if ($totalSales >= $start && ($end == 0 || $totalSales <= $end)) {
                return (float) $commission;
            }
        }

        return 0.0;
    }
}
