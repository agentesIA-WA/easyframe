<?php

use App\Modules\Support\Controllers\CepController;
use App\Modules\Support\Controllers\SurveyController;
use Illuminate\Support\Facades\Route;

Route::prefix('support')->group(function () {
    Route::get('cep/search', [CepController::class, 'search']);
    
    Route::get('surveys', [SurveyController::class, 'index']);
    Route::post('surveys/responses', [SurveyController::class, 'storeResponse']);
});
