<?php

namespace App\Modules\Core\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Core\Models\Store;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StoreController extends Controller
{
    private function resolveUser(Request $request)
    {
        $user = Auth::user();
        if ($user) {
            return $user;
        }

        $token = $request->bearerToken();
        if ($token) {
            try {
                $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key(config('app.key'), 'HS256'));
                return User::find($decoded->sub);
            } catch (\Throwable $e) {
                return null;
            }
        }

        return null;
    }

    /**
     * Retorna a lista de Lojas / Identidades Corporativas.
     * Administradores veem todas; Usuários normais veem apenas as permitidas.
     */
    public function index(Request $request)
    {
        $user = $this->resolveUser($request);

        if ($user && ($user->is_admin || $user->id === 1 || $user->hasModuleAccess('stores', 'view') || $user->hasModuleAccess('stores', 'update') || $user->hasModuleAccess('stores', 'create'))) {
            $stores = Store::where('is_active', true)->orderBy('id', 'asc')->get();
        } else if ($user) {
            $stores = $user->getAllowedStores();
        } else {
            $stores = Store::where('is_active', true)->orderBy('id', 'asc')->get();
        }

        return response()->json($stores);
    }

    /**
     * Retorna detalhes de uma loja específica.
     */
    public function show(Request $request, Store $store)
    {
        $user = $this->resolveUser($request);
        if ($user && !$user->hasStoreAccess($store->id)) {
            return response()->json(['message' => 'Você não tem permissão para acessar esta loja.'], 403);
        }

        return response()->json($store);
    }

    /**
     * Cadastra uma nova Loja / Identidade Corporativa.
     */
    public function store(Request $request)
    {
        $user = $this->resolveUser($request);
        if ($user && !$user->is_admin && $user->id !== 1 && !$user->hasModuleAccess('stores', 'create')) {
            return response()->json(['message' => 'Apenas administradores ou usuários autorizados podem cadastrar novas lojas.'], 403);
        }

        if (!$request->filled('company_name') && $request->filled('name')) {
            $request->merge(['company_name' => $request->input('name')]);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'company_name' => 'required|string|max:255',
            'corporate_name' => 'nullable|string|max:255',
            'cnpj' => 'nullable|string|max:50',
            'cpf' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'cep' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|string|max:255',
            'website' => 'nullable|string|max:255',
            'business_hours' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $newStore = Store::create($validated);

        // Dá acesso automático ao criador / admin
        if ($user) {
            DB::table('user_stores')->updateOrInsert(
                ['user_id' => $user->id, 'store_id' => $newStore->id],
                ['is_default' => false, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        return response()->json($newStore, 201);
    }

    /**
     * Atualiza dados de uma Loja / Identidade Corporativa.
     */
    public function update(Request $request, Store $store)
    {
        $user = $this->resolveUser($request);
        if ($user && !$user->is_admin && $user->id !== 1 && !$user->hasModuleAccess('stores', 'update')) {
            return response()->json(['message' => 'Sem permissão para alterar dados da loja.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'nullable|string|max:50',
            'company_name' => 'sometimes|required|string|max:255',
            'corporate_name' => 'nullable|string|max:255',
            'cnpj' => 'nullable|string|max:50',
            'cpf' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'cep' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|string|max:255',
            'website' => 'nullable|string|max:255',
            'business_hours' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $store->update($validated);

        return response()->json($store);
    }

    /**
     * Retorna a lista de usuários com indicação de permissão para esta loja.
     */
    public function getUsers(Request $request, Store $store)
    {
        $user = $this->resolveUser($request);
        if ($user && !$user->is_admin && $user->id !== 1 && !$user->hasModuleAccess('stores', 'update') && !$user->hasModuleAccess('stores', 'create')) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $users = User::select('id', 'name', 'email', 'is_admin')->get()->map(function ($u) use ($store) {
            $hasAccess = $u->hasStoreAccess($store->id);
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'is_admin' => (bool)$u->is_admin,
                'has_access' => (bool)$hasAccess,
            ];
        });

        return response()->json($users);
    }

    /**
     * Atualiza as permissões dos usuários para esta loja.
     */
    public function assignUsers(Request $request, Store $store)
    {
        $user = $this->resolveUser($request);
        if ($user && !$user->is_admin && $user->id !== 1 && !$user->hasModuleAccess('stores', 'update') && !$user->hasModuleAccess('stores', 'create')) {
            return response()->json(['message' => 'Apenas administradores ou usuários autorizados podem atribuir permissões.'], 403);
        }

        $request->validate([
            'user_ids' => 'array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        $userIds = $request->input('user_ids', []);

        // Atualiza a tabela pivô user_stores para esta loja
        DB::table('user_stores')->where('store_id', $store->id)->delete();

        foreach ($userIds as $uId) {
            DB::table('user_stores')->insert([
                'user_id' => $uId,
                'store_id' => $store->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Permissões da loja atualizadas com sucesso.']);
    }
}
