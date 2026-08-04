<?php

namespace App\Modules\Customer\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Customer\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('tax_id', 'like', "%{$search}%")
                  ->orWhere('contact_name', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%")
                  ->orWhere('uf', 'like', "%{$search}%");
            });
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
            'tax_id' => 'required|string|unique:suppliers,tax_id',
            'state_registration' => 'nullable|string|max:20',
            'contact_email' => 'nullable|email',
            'contact_name' => 'nullable|string',
            'phone1' => 'nullable|string',
            'phone2' => 'nullable|string',
            'website' => 'nullable|string',
            'cep' => 'nullable|string',
            'city' => 'nullable|string',
            'uf' => 'nullable|string|max:2',
            'address' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:50',
            'manager_name' => 'nullable|string|max:80',
            'manager_phone' => 'nullable|string|max:30',
            'seller_name' => 'nullable|string|max:80',
            'seller_phone1' => 'nullable|string|max:30',
            'seller_phone2' => 'nullable|string|max:30',
            'billing_contact' => 'nullable|string|max:50',
            'billing_phone' => 'nullable|string|max:30',
            'tips' => 'nullable|string|max:250',
            'notes' => 'nullable|string',
        ]);

        $supplier = Supplier::create($validated);
        return response()->json($supplier, 201);
    }

    public function show(Supplier $supplier)
    {
        return response()->json($supplier);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'tax_id' => 'required|string|unique:suppliers,tax_id,' . $supplier->id,
            'state_registration' => 'nullable|string|max:20',
            'contact_email' => 'nullable|email',
            'contact_name' => 'nullable|string',
            'phone1' => 'nullable|string',
            'phone2' => 'nullable|string',
            'website' => 'nullable|string',
            'cep' => 'nullable|string',
            'city' => 'nullable|string',
            'uf' => 'nullable|string|max:2',
            'address' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:50',
            'manager_name' => 'nullable|string|max:80',
            'manager_phone' => 'nullable|string|max:30',
            'seller_name' => 'nullable|string|max:80',
            'seller_phone1' => 'nullable|string|max:30',
            'seller_phone2' => 'nullable|string|max:30',
            'billing_contact' => 'nullable|string|max:50',
            'billing_phone' => 'nullable|string|max:30',
            'tips' => 'nullable|string|max:250',
            'notes' => 'nullable|string',
        ]);

        $supplier->update($validated);
        return response()->json($supplier);
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();
        return response()->json(null, 204);
    }
}
