<?php

namespace App\Modules\Core\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Core\Models\Setting;
use App\Modules\Core\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SettingController extends Controller
{
    /**
     * Retorna as configurações corporativas da Loja / Identidade selecionada.
     */
    public function index(Request $request)
    {
        $storeId = $request->header('X-Store-Id') ?? $request->query('store_id');
        $user = Auth::user();

        if ($storeId) {
            $store = Store::find($storeId);
            if ($store && (!$user || $user->hasStoreAccess($store->id))) {
                return response()->json([
                    'id' => $store->id,
                    'company_name' => $store->company_name,
                    'corporate_name' => $store->corporate_name,
                    'company_social_name' => $store->corporate_name ?: $store->company_name,
                    'cnpj' => $store->cnpj,
                    'cpf' => $store->cpf,
                    'address' => $store->address,
                    'city' => $store->city,
                    'cep' => $store->cep,
                    'phone' => $store->phone,
                    'email' => $store->email,
                    'website' => $store->website,
                    'business_hours' => $store->business_hours,
                ]);
            }
        }

        // Se o usuário está logado, tenta pegar a primeira loja com permissão
        if ($user) {
            $allowedStore = ($user->is_admin || $user->id === 1)
                ? Store::where('is_active', true)->first()
                : $user->stores()->where('is_active', true)->first();

            if ($allowedStore) {
                return response()->json([
                    'id' => $allowedStore->id,
                    'company_name' => $allowedStore->company_name,
                    'corporate_name' => $allowedStore->corporate_name,
                    'company_social_name' => $allowedStore->corporate_name ?: $allowedStore->company_name,
                    'cnpj' => $allowedStore->cnpj,
                    'cpf' => $allowedStore->cpf,
                    'address' => $allowedStore->address,
                    'city' => $allowedStore->city,
                    'cep' => $allowedStore->cep,
                    'phone' => $allowedStore->phone,
                    'email' => $allowedStore->email,
                    'website' => $allowedStore->website,
                    'business_hours' => $allowedStore->business_hours,
                ]);
            }
        }

        // Fallback: tabela original `settings`
        $settings = Setting::first();
        if (!$settings) {
            $settings = Setting::create(['id' => 1, 'company_name' => 'EASY FRAME']);
        }

        return response()->json($settings);
    }

    /**
     * Atualiza as configurações da loja ativa.
     */
    public function update(Request $request)
    {
        $storeId = $request->header('X-Store-Id') ?? $request->input('store_id');
        if ($storeId) {
            $store = Store::find($storeId);
            if ($store) {
                $store->update($request->all());
                return response()->json($store);
            }
        }

        $settings = Setting::firstOrCreate(['id' => 1]);
        $settings->update($request->all());

        return response()->json($settings);
    }
}
