<?php

namespace App\Modules\Customer\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Customer\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with('category');

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('products.name', 'like', "%{$search}%")
                  ->orWhere('products.code', 'like', "%{$search}%");
            });
        }

        $sortBy = $request->get('sort_by', 'name');
        $sortDir = $request->get('sort_direction', 'asc');
        $sortDir = in_array(strtolower($sortDir), ['asc', 'desc']) ? strtolower($sortDir) : 'asc';

        if ($sortBy === 'calculation_type') {
            $query->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                  ->orderBy('categories.calculation_type', $sortDir)
                  ->select('products.*');
        } else {
            $allowedSorts = ['code', 'name', 'unit_price', 'width', 'created_at'];
            if (!in_array($sortBy, $allowedSorts)) {
                $sortBy = 'name';
            }
            $query->orderBy("products.{$sortBy}", $sortDir);
        }

        if ($request->has('page')) {
            return response()->json($query->paginate($request->get('per_page', 50)));
        }

        if ($request->filled('search')) {
            return response()->json($query->limit(100)->get());
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'code' => 'required|string|unique:products,code',
            'name' => 'required|string|max:255',
            'unit_price' => 'required|numeric|min:0',
            'width' => 'nullable|numeric|min:0',
            'allow_margin' => 'nullable|boolean',
            'cost_price' => 'nullable|numeric|min:0',
        ]);

        $product = Product::create($validated);
        return response()->json($product->load('category'), 201);
    }

    public function show(Product $product)
    {
        return response()->json($product->load('category'));
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'code' => 'required|string|unique:products,code,' . $product->id,
            'name' => 'required|string|max:255',
            'unit_price' => 'required|numeric|min:0',
            'width' => 'nullable|numeric|min:0',
            'allow_margin' => 'nullable|boolean',
            'cost_price' => 'nullable|numeric|min:0',
        ]);

        $product->update($validated);
        return response()->json($product->load('category'));
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(null, 204);
    }

    public function bulkUpdatePrice(Request $request)
    {
        $validated = $request->validate([
            'product_ids' => 'required|array|min:1',
            'product_ids.*' => 'exists:products,id',
            'adjustment_type' => 'required|in:percent,fixed',
            'adjustment_value' => 'required|numeric',
        ]);

        return \Illuminate\Support\Facades\DB::transaction(function () use ($validated) {
            $products = Product::whereIn('id', $validated['product_ids'])->get();
            $type = $validated['adjustment_type'];
            $val = (float) $validated['adjustment_value'];

            $updatedCount = 0;
            foreach ($products as $product) {
                $currentPrice = (float) $product->unit_price;
                if ($type === 'percent') {
                    $newPrice = $currentPrice * (1 + ($val / 100));
                } else {
                    $newPrice = $currentPrice + $val;
                }

                $newPrice = max(0, round($newPrice, 2));

                $product->update(['unit_price' => $newPrice]);
                $updatedCount++;
            }

            return response()->json([
                'message' => "Preço de venda atualizado com sucesso para {$updatedCount} produto(s)!",
                'updated_count' => $updatedCount
            ]);
        });
    }
}
