<?php

namespace App\Modules\HR\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\HR\Models\Employee;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = Employee::with('user');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('tax_id', 'like', "%{$search}%")
                  ->orWhere('role', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_molder')) {
            $query->where('is_molder', filter_var($request->get('is_molder'), FILTER_VALIDATE_BOOLEAN));
        }

        $sortBy = $request->get('sort_by', 'name');
        $sortDir = $request->get('sort_direction', 'asc');
        $sortDir = in_array(strtolower($sortDir), ['asc', 'desc']) ? $sortDir : 'asc';

        $query->orderBy($sortBy, $sortDir);

        return response()->json($query->paginate($request->get('per_page', 30)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'tax_id' => 'required|string|unique:employees,tax_id',
            'role' => 'nullable|string',
            'salary' => 'nullable|numeric|min:0',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'hired_at' => 'nullable|date',
            'can_sell' => 'boolean',
            'is_molder' => 'boolean',
        ]);

        $employee = Employee::create($validated);
        return response()->json($employee, 201);
    }

    public function show(Employee $employee)
    {
        return response()->json($employee->load('user'));
    }

    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'tax_id' => 'required|string|unique:employees,tax_id,' . $employee->id,
            'role' => 'nullable|string',
            'salary' => 'nullable|numeric|min:0',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'hired_at' => 'nullable|date',
            'can_sell' => 'boolean',
            'is_molder' => 'boolean',
        ]);

        $employee->update($validated);
        return response()->json($employee);
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();
        return response()->json(null, 204);
    }
}
