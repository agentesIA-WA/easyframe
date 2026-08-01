<?php

namespace App\Modules\Core\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Core\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SettingController extends Controller
{
    private const CACHE_KEY = 'app_global_settings';

    /**
     * Retorna as configurações diretamente do banco.
     */
    public function index()
    {
        $settings = Setting::first();
        
        if (!$settings) {
            $settings = Setting::create([
                'id' => 1,
                'company_name' => 'SDM Modern',
            ]);
        }

        return response()->json($settings);
    }

    /**
     * Atualiza as configurações.
     */
    public function update(Request $request)
    {
        $settings = Setting::firstOrCreate(['id' => 1]);
        $settings->update($request->all());

        return response()->json($settings);
    }
}
