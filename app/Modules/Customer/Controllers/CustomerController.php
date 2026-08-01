<?php

namespace App\Modules\Customer\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Customer\Models\Customer;
use App\Modules\Customer\Services\DuplicateChecker;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('customers.name', 'like', "%{$search}%")
                  ->orWhere('customers.tax_id', 'like', "%{$search}%")
                  ->orWhere('customers.phone', 'like', "%{$search}%")
                  ->orWhere('customers.city', 'like', "%{$search}%")
                  ->orWhere('customers.uf', 'like', "%{$search}%")
                  ->orWhere('customers.address', 'like', "%{$search}%")
                  ->orWhere('customers.cep', 'like', "%{$search}%")
                  ->orWhere('customers.notes', 'like', "%{$search}%");
            });
        }

        $sortBy = $request->get('sort_by', 'name');
        $sortDir = $request->get('sort_direction', 'asc');
        $sortDir = in_array(strtolower($sortDir), ['asc', 'desc']) ? $sortDir : 'asc';

        $query->orderBy($sortBy, $sortDir);

        return $query->paginate($request->get('per_page', 30));
    }

    public function store(Request $request, DuplicateChecker $checker)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'tax_id' => 'required|string|unique:customers,tax_id',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string',
            'cep' => 'nullable|string',
            'uf' => 'nullable|string|max:2',
            'city' => 'nullable|string',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
            'contacts' => 'nullable|array'
        ]);

        // Verificação de duplicidade por nome (BR-MIGRAR-002)
        if (!$request->has('force') && ($duplicates = $checker->check($validated['name']))->isNotEmpty()) {
            return response()->json([
                'message' => 'Possível duplicidade encontrada.',
                'duplicates' => $duplicates
            ], 409);
        }

        $customer = Customer::create($validated);
        return response()->json($customer, 201);
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'tax_id' => 'required|string|unique:customers,tax_id,' . $customer->id,
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string',
            'cep' => 'nullable|string',
            'uf' => 'nullable|string|max:2',
            'city' => 'nullable|string',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
            'contacts' => 'nullable|array'
        ]);

        $customer->update($validated);
        return response()->json($customer);
    }

    public function destroy(Customer $customer)
    {
        $customer->delete(); // Soft Delete (BR-MIGRAR-003)
        return response()->json(null, 204);
    }
}
