<?php

namespace App\Modules\Finance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Finance\Models\ExpenseType;
use Illuminate\Http\Request;

class ExpenseTypeController extends Controller
{
    public function index(Request $request)
    {
        $query = ExpenseType::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $sortBy = $request->get('sort_by', 'name');
        $sortDir = $request->get('sort_direction', 'asc');
        $sortDir = in_array(strtolower($sortDir), ['asc', 'desc']) ? $sortDir : 'asc';

        $query->orderBy($sortBy, $sortDir);

        return response()->json($query->paginate($request->get('per_page', 50)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:expense_types,name',
            'description' => 'nullable|string',
        ]);

        $type = ExpenseType::create($validated);
        return response()->json($type, 201);
    }

    public function update(Request $request, ExpenseType $expenseType)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:expense_types,name,' . $expenseType->id,
            'description' => 'nullable|string',
        ]);

        $expenseType->update($validated);
        return response()->json($expenseType);
    }

    public function destroy(ExpenseType $expenseType)
    {
        $expenseType->delete();
        return response()->json(null, 204);
    }
}
