<?php

namespace App\Modules\Finance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Finance\Models\Expense;
use App\Modules\Finance\Models\ExpenseType;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with('type');

        $storeId = $request->header('X-Store-Id');
        if ($storeId) {
            $query->where(function($q) use ($storeId) {
                $q->where('expenses.store_id', $storeId)->orWhereNull('expenses.store_id');
            });
        }

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('expenses.description', 'like', "%{$search}%")
                  ->orWhere('expenses.due_date', 'like', "%{$search}%")
                  ->orWhere('expenses.status', 'like', "%{$search}%")
                  ->orWhere('expenses.amount', 'like', "%{$search}%")
                  ->orWhereHas('type', function($tq) use ($search) {
                      $tq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $sortBy = $request->get('sort_by', 'due_date');
        $sortDir = $request->get('sort_direction', 'desc');
        $sortDir = in_array(strtolower($sortDir), ['asc', 'desc']) ? $sortDir : 'desc';

        if ($sortBy === 'type.name') {
            $query->leftJoin('expense_types', 'expenses.expense_type_id', '=', 'expense_types.id')
                  ->select('expenses.*')
                  ->orderBy('expense_types.name', $sortDir);
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        return response()->json($query->paginate($request->get('per_page', 30)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'expense_type_id' => 'required|exists:expense_types,id',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'due_date' => 'required|date',
            'status' => 'required|in:pending,paid',
        ]);

        $storeId = $request->header('X-Store-Id') ? (int)$request->header('X-Store-Id') : 1;
        $validated['store_id'] = $storeId;

        $expense = Expense::create($validated);
        return response()->json($expense->load('type'), 201);
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'expense_type_id' => 'required|exists:expense_types,id',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'due_date' => 'required|date',
            'status' => 'required|in:pending,paid',
        ]);

        $expense->update($validated);
        return response()->json($expense->load('type'));
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();
        return response()->json(null, 204);
    }

    public function types()
    {
        return response()->json(ExpenseType::all());
    }
}
