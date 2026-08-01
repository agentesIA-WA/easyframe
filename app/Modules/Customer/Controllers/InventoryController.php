<?php

namespace App\Modules\Customer\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Customer\Models\Product;
use App\Modules\Customer\Models\InventoryMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        return $this->stockReport($request);
    }

    /**
     * Lista o saldo atual de todos os produtos com abatimento de vendas (SCR-008).
     */
    public function stockReport(Request $request)
    {
        $query = Product::with('category');

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('products.name', 'like', "%{$search}%")
                  ->orWhere('products.code', 'like', "%{$search}%")
                  ->orWhereHas('category', function($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $sortBy = $request->get('sort_by', 'name');
        $sortDir = strtolower($request->get('sort_direction', 'asc')) === 'desc' ? 'desc' : 'asc';

        if ($sortBy === 'category.name') {
            $query->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                  ->select('products.*')
                  ->orderBy('categories.name', $sortDir);
        } elseif (in_array($sortBy, ['code', 'name', 'unit_price', 'created_at'])) {
            $query->orderBy("products.{$sortBy}", $sortDir);
        }

        $products = $query->get();

        // Busca vendas realizadas em pedidos (status != draft)
        $salesData = DB::table('order_sub_items')
            ->join('order_items', 'order_sub_items.order_item_id', '=', 'order_items.id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_sub_items.product_id', '=', 'products.id')
            ->where('orders.status', '!=', 'draft')
            ->whereNull('orders.deleted_at')
            ->select([
                'order_sub_items.product_id',
                'order_sub_items.quantity as sub_qty',
                'order_sub_items.calculation_type',
                'order_sub_items.margin',
                'order_items.quantity as item_qty',
                'order_items.height',
                'order_items.width',
                'products.width as product_width'
            ])
            ->get();

        $soldByProduct = [];
        foreach ($salesData as $row) {
            $pid = $row->product_id;
            $itemQty = (float) ($row->item_qty ?? 1);
            $subQty = (float) ($row->sub_qty ?? 1);
            $calcType = (int) ($row->calculation_type ?? 1);
            $pw = (float) ($row->product_width ?? 0);
            $margin = (float) ($row->margin ?? 0);
            
            $h = ceil(((float) $row->height) * 2) / 2;
            $w = ceil(((float) $row->width) * 2) / 2;
            
            $effectiveH = $h + ($margin * 2);
            $effectiveW = $w + ($margin * 2);
            
            if ($calcType === 1) {
                $consumed = $subQty * $itemQty;
            } elseif ($calcType === 2) {
                $perimeter = (($effectiveH + $effectiveW) * 2 + ($pw * 4)) / 100;
                $consumed = $perimeter * $subQty * $itemQty;
            } elseif ($calcType === 3 || $calcType === 4) {
                $area = ($effectiveH * $effectiveW) / 10000;
                $consumed = $area * $subQty * $itemQty;
            } else {
                $consumed = $subQty * $itemQty;
            }
            
            $soldByProduct[$pid] = ($soldByProduct[$pid] ?? 0) + $consumed;
        }

        $movements = DB::table('inventory_movements')
            ->select('product_id', 'type', DB::raw('SUM(quantity) as total_qty'))
            ->groupBy('product_id', 'type')
            ->get();

        $inByProduct = [];
        $outByProduct = [];
        foreach ($movements as $m) {
            if ($m->type === 'in') {
                $inByProduct[$m->product_id] = (float) $m->total_qty;
            } else {
                $outByProduct[$m->product_id] = (float) $m->total_qty;
            }
        }

        $result = $products->map(function($product) use ($soldByProduct, $inByProduct, $outByProduct) {
            $totalIn = (float) ($inByProduct[$product->id] ?? 0);
            $manualOut = (float) ($outByProduct[$product->id] ?? 0);
            $soldOut = (float) ($soldByProduct[$product->id] ?? 0);
            
            $product->total_in = round($totalIn, 2);
            $product->total_sold = round($soldOut, 2);
            $product->manual_out = round($manualOut, 2);
            $product->stock_balance = round($totalIn - $manualOut - $soldOut, 2);
            
            return $product;
        });

        if (in_array($sortBy, ['stock_balance', 'total_sold', 'total_in'])) {
            $result = $sortDir === 'asc' 
                ? $result->sortBy($sortBy)->values() 
                : $result->sortByDesc($sortBy)->values();
        }

        return response()->json($result);
    }

    public function indexPurchases(Request $request)
    {
        $query = \App\Modules\Customer\Models\Purchase::with(['supplier', 'items.product.category']);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('purchases.invoice_number', 'like', "%{$search}%")
                  ->orWhere('purchases.purchase_date', 'like', "%{$search}%")
                  ->orWhere('purchases.total_amount', 'like', "%{$search}%")
                  ->orWhereHas('supplier', function($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $sortBy = $request->get('sort_by', 'purchase_date');
        $sortDir = $request->get('sort_direction', 'desc');
        $sortDir = in_array(strtolower($sortDir), ['asc', 'desc']) ? $sortDir : 'desc';

        if ($sortBy === 'supplier.name') {
            $query->leftJoin('suppliers', 'purchases.supplier_id', '=', 'suppliers.id')
                  ->select('purchases.*')
                  ->orderBy('suppliers.name', $sortDir);
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        $purchases = $query->paginate($request->get('per_page', 30));
            
        return response()->json($purchases);
    }

    public function storePurchase(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'invoice_number' => 'required|string',
            'purchase_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated) {
            $totalAmount = 0;
            foreach ($validated['items'] as $item) {
                $totalAmount += $item['quantity'] * $item['unit_cost'];
            }

            $purchase = \App\Modules\Customer\Models\Purchase::create([
                'supplier_id' => $validated['supplier_id'],
                'invoice_number' => $validated['invoice_number'],
                'purchase_date' => $validated['purchase_date'],
                'total_amount' => $totalAmount
            ]);

            foreach ($validated['items'] as $item) {
                $purchase->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                    'total_cost' => $item['quantity'] * $item['unit_cost']
                ]);

                // Registra entrada no estoque
                InventoryMovement::create([
                    'product_id' => $item['product_id'],
                    'type' => 'in',
                    'quantity' => $item['quantity'],
                    'reference_type' => 'Purchase',
                    'reference_id' => $purchase->id,
                    'reason' => "Compra NF {$purchase->invoice_number}"
                ]);
            }

            return response()->json($purchase->load('items'), 201);
        });
    }

    public function showPurchase($id)
    {
        $purchase = \App\Modules\Customer\Models\Purchase::with(['supplier', 'items.product.category'])->findOrFail($id);
        return response()->json($purchase);
    }

    public function updatePurchase(Request $request, $id)
    {
        // Simplificação: Exclui e recria os itens e movimentos para manter integridade
        return DB::transaction(function () use ($request, $id) {
            $purchase = \App\Modules\Customer\Models\Purchase::findOrFail($id);
            
            // Reverte estoque removendo movimentos antigos
            InventoryMovement::where('reference_type', 'Purchase')
                ->where('reference_id', $purchase->id)
                ->delete();
                
            $purchase->items()->delete();
            
            // Reaproveita a lógica de store
            $validated = $request->validate([
                'supplier_id' => 'required|exists:suppliers,id',
                'invoice_number' => 'required|string',
                'purchase_date' => 'required|date',
                'items' => 'required|array|min:1',
                'items.*.product_id' => 'required|exists:products,id',
                'items.*.quantity' => 'required|numeric|min:0.001',
                'items.*.unit_cost' => 'required|numeric|min:0',
            ]);

            $totalAmount = 0;
            foreach ($validated['items'] as $item) {
                $totalAmount += $item['quantity'] * $item['unit_cost'];
            }

            $purchase->update([
                'supplier_id' => $validated['supplier_id'],
                'invoice_number' => $validated['invoice_number'],
                'purchase_date' => $validated['purchase_date'],
                'total_amount' => $totalAmount
            ]);

            foreach ($validated['items'] as $item) {
                $purchase->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                    'total_cost' => $item['quantity'] * $item['unit_cost']
                ]);

                InventoryMovement::create([
                    'product_id' => $item['product_id'],
                    'type' => 'in',
                    'quantity' => $item['quantity'],
                    'reference_type' => 'Purchase',
                    'reference_id' => $purchase->id,
                    'reason' => "Atualização de Compra NF {$purchase->invoice_number}"
                ]);
            }

            return response()->json($purchase->load('items'));
        });
    }

    public function destroyPurchase($id)
    {
        return DB::transaction(function () use ($id) {
            $purchase = \App\Modules\Customer\Models\Purchase::findOrFail($id);
            
            // Reverte estoque
            InventoryMovement::where('reference_type', 'Purchase')
                ->where('reference_id', $purchase->id)
                ->delete();
                
            $purchase->delete();
            
            return response()->json(['message' => 'Compra excluída e estoque revertido.']);
        });
    }
}
