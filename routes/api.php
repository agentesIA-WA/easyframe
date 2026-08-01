<?php

use Illuminate\Support\Facades\Route;

// Agregador de rotas dos módulos (Modular Monolith)
Route::prefix('v1')->group(function () {
    // Identity
    if (file_exists($path = base_path('app/Modules/Identity/Routes/api.php'))) {
        require $path;
    }
    
    // Customers
    if (file_exists($path = base_path('app/Modules/Customer/Routes/api.php'))) {
        require $path;
    }

    // Sales
    if (file_exists($path = base_path('app/Modules/Sales/Routes/api.php'))) {
        require $path;
    }

    // Finance
    if (file_exists($path = base_path('app/Modules/Finance/Routes/api.php'))) {
        require $path;
    }

    // BI
    if (file_exists($path = base_path('app/Modules/BI/Routes/api.php'))) {
        require $path;
    }
    
    // HR
    if (file_exists($path = base_path('app/Modules/HR/Routes/api.php'))) {
        require $path;
    }
    
    // Support
    if (file_exists($path = base_path('app/Modules/Support/Routes/api.php'))) {
        require $path;
    }

    // Core
    if (file_exists($path = base_path('app/Modules/Core/Routes/api.php'))) {
        require $path;
    }
});
