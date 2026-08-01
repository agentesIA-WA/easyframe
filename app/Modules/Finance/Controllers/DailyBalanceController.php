<?php

namespace App\Modules\Finance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Finance\Models\DailyBalance;
use App\Modules\Finance\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DailyBalanceController extends Controller
{
    public function index()
    {
        return response()->json(DailyBalance::with('user')->orderBy('date', 'desc')->paginate(30));
    }

    /**
     * Prepara os dados para um novo fechamento, calculando os cheques automaticamente.
     */
    public function prepare(Request $request)
    {
        $date = $request->query('date', now()->format('Y-m-d'));

        $totalChecks = Payment::whereDate('paid_at', $date)
            ->where('status', 'P')
            ->where(function ($q) {
                $q->where('payment_method', 'LIKE', '%CHEQUE%')
                  ->orWhere('payment_method', 'CH')
                  ->orWhere('payment_method', 'CHTER');
            })
            ->sum('paid_value');

        return response()->json([
            'date' => $date,
            'total_checks' => $totalChecks,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'date' => 'required|date|unique:daily_balances,date',
            'qty_005' => 'integer|min:0',
            'qty_010' => 'integer|min:0',
            'qty_025' => 'integer|min:0',
            'qty_050' => 'integer|min:0',
            'qty_100' => 'integer|min:0',
            'qty_200' => 'integer|min:0',
            'qty_500' => 'integer|min:0',
            'qty_1000' => 'integer|min:0',
            'qty_2000' => 'integer|min:0',
            'qty_5000' => 'integer|min:0',
            'qty_10000' => 'integer|min:0',
            'total_checks' => 'numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $balance = new DailyBalance($data);
        $balance->user_id = auth()->id() ?? 1; // Fallback para admin se não logado (ambiente dev)
        $balance->total_cash = $balance->calculateCashTotal();
        $balance->grand_total = $balance->total_cash + $balance->total_checks;
        $balance->save();

        return response()->json($balance, 201);
    }
}
