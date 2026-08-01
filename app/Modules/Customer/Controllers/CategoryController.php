<?php

namespace App\Modules\Customer\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Customer\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::query();

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
            'name' => 'required|string|max:255|unique:categories,name',
            'description' => 'nullable|string',
            'calculation_type' => 'required|integer|min:1|max:6',
        ]);

        $category = Category::create($validated);
        return response()->json($category, 201);
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $category->id,
            'description' => 'nullable|string',
            'calculation_type' => 'required|integer|min:1|max:6',
        ]);

        $category->update($validated);
        return response()->json($category);
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return response()->json(null, 204);
    }
}
