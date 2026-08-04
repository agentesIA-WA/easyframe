<?php

namespace App\Modules\HR\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\HR\Models\Employee;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = Employee::with(['user', 'store', 'stores']);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('tax_id', 'like', "%{$search}%")
                  ->orWhere('role', 'like', "%{$search}%");
            });
        }

        if ($request->has('store_id')) {
            $targetStoreId = $request->get('store_id');
            $query->where(function($q) use ($targetStoreId) {
                $q->whereHas('stores', function($sq) use ($targetStoreId) {
                    $sq->where('stores.id', $targetStoreId);
                })->orWhere('store_id', $targetStoreId);
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
            'store_id' => 'nullable|integer|exists:stores,id',
            'store_ids' => 'nullable|array',
            'store_ids.*' => 'integer|exists:stores,id',
            'role' => 'nullable|string',
            'salary' => 'nullable|numeric|min:0',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'hired_at' => 'nullable|date',
            'can_sell' => 'boolean',
            'is_molder' => 'boolean',
        ]);

        $storeIds = $validated['store_ids'] ?? [];
        if (empty($storeIds) && !empty($validated['store_id'])) {
            $storeIds = [(int)$validated['store_id']];
        }
        if (!empty($storeIds)) {
            $validated['store_id'] = $storeIds[0];
        }

        $employee = Employee::create($validated);
        if (!empty($storeIds)) {
            $employee->stores()->sync($storeIds);
        }

        if ($employee->user_id && !empty($storeIds)) {
            $employee->user->stores()->syncWithoutDetaching($storeIds);
        }

        return response()->json($employee->load(['user', 'store', 'stores']), 201);
    }

    public function show(Employee $employee)
    {
        return response()->json($employee->load(['user', 'store', 'stores']));
    }

    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'tax_id' => 'required|string|unique:employees,tax_id,' . $employee->id,
            'store_id' => 'nullable|integer|exists:stores,id',
            'store_ids' => 'nullable|array',
            'store_ids.*' => 'integer|exists:stores,id',
            'role' => 'nullable|string',
            'salary' => 'nullable|numeric|min:0',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'hired_at' => 'nullable|date',
            'can_sell' => 'boolean',
            'is_molder' => 'boolean',
        ]);

        $storeIds = $validated['store_ids'] ?? null;
        if (is_array($storeIds)) {
            $validated['store_id'] = !empty($storeIds) ? $storeIds[0] : null;
        }

        $employee->update($validated);

        if (is_array($storeIds)) {
            $employee->stores()->sync($storeIds);
            if ($employee->user_id) {
                $employee->user->stores()->sync($storeIds);
            }
        } elseif (!empty($validated['store_id'])) {
            $employee->stores()->syncWithoutDetaching([$validated['store_id']]);
            if ($employee->user_id) {
                $employee->user->stores()->syncWithoutDetaching([$validated['store_id']]);
            }
        }

        return response()->json($employee->load(['user', 'store', 'stores']));
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();
        return response()->json(null, 204);
    }
}
