<?php

namespace App\Modules\Finance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Finance\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    /**
     * Lista parcelas com filtros (BR-MIGRAR-011).
     */
    public function index(Request $request)
    {
        $query = Payment::query();

        if ($request->filled('status')) {
            $query->where('payments.status', $request->status);
        } else {
            $query->where('payments.status', '!=', 'D');
        }

        if ($request->filled('due_start')) {
            $query->where('payments.due_date', '>=', $request->due_start);
        }

        if ($request->filled('due_end')) {
            $query->where('payments.due_date', '<=', $request->due_end);
        }

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('payments.due_date', 'like', "%{$search}%")
                  ->orWhere('payments.order_id', 'like', "%{$search}%")
                  ->orWhere('payments.value', 'like', "%{$search}%")
                  ->orWhereHas('order.customer', function($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $sortBy = $request->get('sort_by', 'due_date');
        $sortDir = $request->get('sort_direction', 'asc');
        $sortDir = in_array(strtolower($sortDir), ['asc', 'desc']) ? $sortDir : 'asc';

        if ($sortBy === 'order.customer.name') {
            $query->join('orders', 'payments.order_id', '=', 'orders.id')
                  ->join('customers', 'orders.customer_id', '=', 'customers.id')
                  ->select('payments.*')
                  ->orderBy('customers.name', $sortDir);
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        return $query->with('order.customer')
            ->paginate(request('per_page', 30));
    }

    /**
     * Processa o recebimento de uma parcela (BR-MIGRAR-004).
     */
    public function pay(Request $request, Payment $payment)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|string|max:20'
        ]);

        return DB::transaction(function () use ($payment, $validated) {
            $residual = $payment->pay($validated['amount'], $validated['method']);

            return response()->json([
                'message' => 'Pagamento processado com sucesso.',
                'payment' => $payment->fresh(),
                'residual' => $residual
            ]);
        });
    }

    /**
     * Relatório de Fluxo de Caixa (BR-MIGRAR-008).
     */
    public function cashFlow(Request $request)
    {
        $start = $request->due_start ?? now()->startOfMonth();
        $end = $request->due_end ?? now()->endOfMonth();

        $inflow = Payment::whereBetween('due_date', [$start, $end])
            ->where('status', 'P')
            ->sum('paid_value');

        // Nota: No futuro, adicionar despesas aqui para o saldo líquido
        return response()->json([
            'period' => ['start' => $start, 'end' => $end],
            'total_inflow' => $inflow,
        ]);
    }
}
