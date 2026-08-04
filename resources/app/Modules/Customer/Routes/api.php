<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Customer\Controllers\CustomerController;
use App\Modules\Customer\Controllers\ProductController;
use App\Modules\Customer\Controllers\SupplierController;
use App\Modules\Customer\Controllers\CategoryController;
use App\Modules\Customer\Controllers\InventoryController;

Route::prefix('customers')->middleware('module.permission:customers,view')->group(function () {
    Route::get('/', [CustomerController::class, 'index']);
    Route::post('/', [CustomerController::class, 'store'])->middleware('module.permission:customers,create');
    Route::get('/{customer}', [CustomerController::class, 'show']);
    Route::put('/{customer}', [CustomerController::class, 'update'])->middleware('module.permission:customers,update');
    Route::delete('/{customer}', [CustomerController::class, 'destroy'])->middleware('module.permission:customers,delete');
});

Route::prefix('products')->middleware('module.permission:products,view')->group(function () {
    Route::get('/', [ProductController::class, 'index']);
    Route::post('/', [ProductController::class, 'store'])->middleware('module.permission:products,create');
    Route::post('/bulk-price-update', [ProductController::class, 'bulkUpdatePrice'])->middleware('module.permission:products,update');
    Route::get('/{product}', [ProductController::class, 'show']);
    Route::put('/{product}', [ProductController::class, 'update'])->middleware('module.permission:products,update');
    Route::delete('/{product}', [ProductController::class, 'destroy'])->middleware('module.permission:products,delete');
});

Route::prefix('suppliers')->middleware('module.permission:suppliers,view')->group(function () {
    Route::get('/', [SupplierController::class, 'index']);
    Route::post('/', [SupplierController::class, 'store'])->middleware('module.permission:suppliers,create');
    Route::get('/{supplier}', [SupplierController::class, 'show']);
    Route::put('/{supplier}', [SupplierController::class, 'update'])->middleware('module.permission:suppliers,update');
    Route::delete('/{supplier}', [SupplierController::class, 'destroy'])->middleware('module.permission:suppliers,delete');
});

Route::prefix('inventory')->middleware('module.permission:inventory,view')->group(function () {
    Route::get('/report', [InventoryController::class, 'stockReport']);
    Route::get('/purchases', [InventoryController::class, 'indexPurchases'])->middleware('module.permission:purchases,view');
    Route::post('/purchases', [InventoryController::class, 'storePurchase'])->middleware('module.permission:purchases,create');
    Route::get('/purchases/{purchase}', [InventoryController::class, 'showPurchase'])->middleware('module.permission:purchases,view');
    Route::put('/purchases/{purchase}', [InventoryController::class, 'updatePurchase'])->middleware('module.permission:purchases,update');
    Route::delete('/purchases/{purchase}', [InventoryController::class, 'destroyPurchase'])->middleware('module.permission:purchases,delete');
});

Route::prefix('categories')->middleware('module.permission:categories,view')->group(function () {
    Route::get('/', [CategoryController::class, 'index']);
    Route::post('/', [CategoryController::class, 'store'])->middleware('module.permission:categories,create');
    Route::put('/{category}', [CategoryController::class, 'update'])->middleware('module.permission:categories,update');
    Route::delete('/{category}', [CategoryController::class, 'destroy'])->middleware('module.permission:categories,delete');
});
