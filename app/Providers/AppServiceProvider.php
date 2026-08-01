<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\File;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Carrega automaticamente todas as migrations de todos os módulos
        $modulesPath = app_path('Modules');
        
        if (File::exists($modulesPath)) {
            $modules = File::directories($modulesPath);
            
            foreach ($modules as $module) {
                $migrationsPath = $module . '/Database/Migrations';
                if (File::exists($migrationsPath)) {
                    $this->loadMigrationsFrom($migrationsPath);
                }
            }
        }
    }
}
