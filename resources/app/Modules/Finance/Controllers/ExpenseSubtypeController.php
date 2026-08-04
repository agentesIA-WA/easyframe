<?php

namespace App\Modules\Finance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Finance\Models\ExpenseSubtype;
use Illuminate\Http\Request;

class ExpenseSubtypeController extends Controller
{
    public function index(Request $request)
    {
        $query = ExpenseSubtype::with('type');
        
        if ($request->has('type_id')) {
            $query->where('expense_type_id', $request->type_id);
        }

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('expense_subtypes.name', 'like', "%{$search}%")
                  ->orWhereHas('type', function($tq) use ($search) {
                      $tq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $sortBy = $request->get('sort_by', 'name');
        $sortDir = $request->get('sort_direction', 'asc');
        $sortDir = in_array(strtolower($sortDir), ['asc', 'desc']) ? $sortDir : 'asc';

        if ($sortBy === 'type.name') {
            $query->leftJoin('expense_types', 'expense_subtypes.expense_type_id', '=', 'expense_types.id')
                  ->select('expense_subtypes.*')
                  ->orderBy('expense_types.name', $sortDir);
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        return response()->json($query->paginate($request->get('per_page', 50)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'expense_type_id' => 'required|exists:expense_types,id',
            'name' => 'required|string|max:100',
        ]);

        $data['name'] = mb_strtoupper($data['name']);

        return response()->json(ExpenseSubtype::create($data), 201);
    }

    public function destroy(ExpenseSubtype $expenseSubtype)
    {
        $expenseSubtype->delete();
        return response()->json(null, 204);
    }
}
