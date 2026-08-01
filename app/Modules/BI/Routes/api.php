<?php

use Illuminate\Support\Facades\Route;
use App\Modules\BI\Controllers\ReportController;

Route::prefix('bi')->group(function () {
    // Dashboard é público para qualquer usuário logado
    Route::get('/dashboard', [ReportController::class, 'dashboard']);
    
    // Relatórios requerem permissão
    Route::middleware('module.permission:reports,view')->group(function () {
        Route::get('/reports/daily-movement', [ReportController::class, 'dailyMovement']);
        Route::get('/reports/commissions', [ReportController::class, 'commissions']);
        Route::get('/reports/receivables', [ReportController::class, 'accountsReceivable']);
        Route::get('/reports/expenses', [ReportController::class, 'expenses']);
        Route::get('/reports/cash-flow', [ReportController::class, 'cashFlow']);
        Route::get('/reports/delivery-forecast', [ReportController::class, 'deliveryForecast']);
    });
});
