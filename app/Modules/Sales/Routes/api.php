<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Sales\Controllers\OrderController;

use App\Modules\Sales\Controllers\EmailController;

Route::prefix('sales')->group(function () {
    // Orçamentos e Pedidos compartilham as mesmas rotas — módulos budgets e orders
    Route::get('/orders', [OrderController::class, 'index'])->middleware('module.permission:budgets,view');
    Route::post('/orders', [OrderController::class, 'store'])->middleware('module.permission:budgets,create');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->middleware('module.permission:budgets,view');
    Route::put('/orders/{order}', [OrderController::class, 'update'])->middleware('module.permission:budgets,update');
    Route::post('/orders/{order}/convert', [OrderController::class, 'convertToOrder'])->middleware('module.permission:orders,create');
    Route::post('/orders/{order}/rescue', [OrderController::class, 'logRescue'])->middleware('module.permission:orders,update');
    Route::post('/orders/{order}/settle', [OrderController::class, 'settle'])->middleware('module.permission:orders,update');
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus'])->middleware('module.permission:orders,update');
    Route::get('/orders/{orderKey}/print', [OrderController::class, 'printOS'])->middleware('module.permission:orders,view');
    Route::delete('/orders/{order}', [OrderController::class, 'destroy'])->middleware('module.permission:budgets,delete');
    Route::post('/proposals/send-email', [EmailController::class, 'sendProposal'])->middleware('module.permission:budgets,view');
});
