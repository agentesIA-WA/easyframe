<?php

namespace App\Modules\Core\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Core\Models\PaymentMethod;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    public function index(Request $request)
    {
        $query = PaymentMethod::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('commission_rate', 'like', "%{$search}%");
            });
        }

        $sortBy = $request->get('sort_by', 'description');
        $sortDir = $request->get('sort_direction', 'asc');
        $sortDir = in_array(strtolower($sortDir), ['asc', 'desc']) ? $sortDir : 'asc';

        $query->orderBy($sortBy, $sortDir);

        return response()->json($query->paginate($request->get('per_page', 50)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'description' => 'required|string|max:50',
            'commission_rate' => 'required|numeric|min:0|max:100',
            'is_cash' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        return response()->json(PaymentMethod::create($data));
    }

    public function update(Request $request, PaymentMethod $paymentMethod)
    {
        $data = $request->validate([
            'description' => 'sometimes|required|string|max:50',
            'commission_rate' => 'sometimes|required|numeric|min:0|max:100',
            'is_cash' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        $paymentMethod->update($data);
        return response()->json($paymentMethod);
    }

    public function destroy(PaymentMethod $paymentMethod)
    {
        $paymentMethod->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
