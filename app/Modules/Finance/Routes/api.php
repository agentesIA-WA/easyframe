<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Finance\Controllers\PaymentController;
use App\Modules\Finance\Controllers\ExpenseController;
use App\Modules\Finance\Controllers\ExpenseTypeController;

Route::prefix('finance')->group(function () {
    Route::get('/payments', [PaymentController::class, 'index'])->middleware('module.permission:payments,view');
    Route::post('/payments/{payment}/pay', [PaymentController::class, 'pay'])->middleware('module.permission:payments,update');
    Route::get('/cash-flow', [PaymentController::class, 'cashFlow'])->middleware('module.permission:payments,view');
    
    // Despesas
    Route::prefix('expenses')->middleware('module.permission:expenses,view')->group(function () {
        Route::get('/', [ExpenseController::class, 'index']);
        Route::post('/', [ExpenseController::class, 'store'])->middleware('module.permission:expenses,create');
        Route::get('/{expense}', [ExpenseController::class, 'show']);
        Route::put('/{expense}', [ExpenseController::class, 'update'])->middleware('module.permission:expenses,update');
        Route::delete('/{expense}', [ExpenseController::class, 'destroy'])->middleware('module.permission:expenses,delete');
    });

    Route::prefix('expense-types')->middleware('module.permission:expense_types,view')->group(function () {
        Route::get('/', [ExpenseTypeController::class, 'index']);
        Route::post('/', [ExpenseTypeController::class, 'store'])->middleware('module.permission:expense_types,create');
        Route::put('/{expenseType}', [ExpenseTypeController::class, 'update'])->middleware('module.permission:expense_types,update');
        Route::delete('/{expenseType}', [ExpenseTypeController::class, 'destroy'])->middleware('module.permission:expense_types,delete');
    });

    Route::prefix('expense-subtypes')->middleware('module.permission:expense_subtypes,view')->group(function () {
        Route::get('/', [\App\Modules\Finance\Controllers\ExpenseSubtypeController::class, 'index']);
        Route::post('/', [\App\Modules\Finance\Controllers\ExpenseSubtypeController::class, 'store'])->middleware('module.permission:expense_subtypes,create');
        Route::delete('/{expenseSubtype}', [\App\Modules\Finance\Controllers\ExpenseSubtypeController::class, 'destroy'])->middleware('module.permission:expense_subtypes,delete');
    });

    Route::prefix('daily-balances')->middleware('module.permission:daily_balances,view')->group(function () {
        Route::get('/', [\App\Modules\Finance\Controllers\DailyBalanceController::class, 'index']);
        Route::get('/prepare', [\App\Modules\Finance\Controllers\DailyBalanceController::class, 'prepare']);
        Route::post('/', [\App\Modules\Finance\Controllers\DailyBalanceController::class, 'store'])->middleware('module.permission:daily_balances,create');
    });
});
