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

        $targetStoreId = $request->input('store_id') ?? $request->header('X-Store-Id');
        if ($targetStoreId) {
            $query->where(function($q) use ($targetStoreId) {
                $q->whereHas('stores', function($sq) use ($targetStoreId) {
                    $sq->where('stores.id', $targetStoreId);
                })->orWhere('store_id', $targetStoreId);
                if ((int)$targetStoreId === 1) {
                    $q->orWhereNull('store_id');
                }
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
            $validated['store_id'] = (int) $storeIds[0];
        }

        $employee = Employee::create($validated);
        if (!empty($storeIds)) {
            try { $employee->stores()->sync($storeIds); } catch (\Exception $e) { \Illuminate\Support\Facades\Log::error('Erro sync store employee: ' . $e->getMessage()); }
        }

        $targetUser = $employee->user ?? \App\Models\User::where('name', $employee->name)->orWhere('id', $employee->user_id)->first();
        if ($targetUser) {
            if (!$employee->user_id) {
                $employee->update(['user_id' => $targetUser->id]);
            }
            try { $targetUser->stores()->syncWithoutDetaching($storeIds); } catch (\Exception $e) { \Illuminate\Support\Facades\Log::error('Erro sync store user: ' . $e->getMessage()); }
        }

        $employee->unsetRelations();
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
            $validated['store_id'] = !empty($storeIds) ? (int) $storeIds[0] : null;
        }

        $employee->update($validated);

        $targetUser = $employee->user ?? \App\Models\User::where('name', $employee->name)->orWhere('id', $employee->user_id)->first();
        if ($targetUser && !$employee->user_id) {
            $employee->update(['user_id' => $targetUser->id]);
        }

        if (is_array($storeIds)) {
            try { $employee->stores()->sync($storeIds); } catch (\Exception $e) { \Illuminate\Support\Facades\Log::error('Erro sync update store employee: ' . $e->getMessage()); }
            if ($targetUser) {
                try { $targetUser->stores()->sync($storeIds); } catch (\Exception $e) { \Illuminate\Support\Facades\Log::error('Erro sync update store user: ' . $e->getMessage()); }
            }
        } elseif (!empty($validated['store_id'])) {
            try { $employee->stores()->syncWithoutDetaching([$validated['store_id']]); } catch (\Exception $e) { \Illuminate\Support\Facades\Log::error('Erro sync update single store: ' . $e->getMessage()); }
            if ($targetUser) {
                try { $targetUser->stores()->syncWithoutDetaching([$validated['store_id']]); } catch (\Exception $e) { \Illuminate\Support\Facades\Log::error('Erro sync update single store user: ' . $e->getMessage()); }
            }
        }

        $employee->unsetRelations();
        return response()->json($employee->load(['user', 'store', 'stores']));
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();
        return response()->json(null, 204);
    }
}
