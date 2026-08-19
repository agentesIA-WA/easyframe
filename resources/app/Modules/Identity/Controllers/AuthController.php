<?php

namespace App\Modules\Identity\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthController extends Controller
{
    /**
     * Resolve o usuário autenticado através do Token JWT Bearer.
     */
    private function resolveUser(Request $request): ?User
    {
        $token = $request->bearerToken();
        if (!$token) {
            return null;
        }

        try {
            $decoded = JWT::decode($token, new Key(config('app.key'), 'HS256'));
            return User::find($decoded->sub);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Autenticação via JWT com suporte a seleção e validação de loja.
     */
    public function login(Request $request)
    {
        $request->validate([
            'user' => 'required|string',
            'password' => 'required|string',
            'store_id' => 'nullable|integer',
        ]);

        $user = User::where('email', $request->user)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Credenciais inválidas'], 401);
        }

        $user->load('modulePermissions.module');

        // Lojas permitidas
        $allowedStores = $this->getAllowedStores($user);

        // Se store_id foi informado, valida a permissão
        $selectedStoreId = $request->input('store_id');
        if ($selectedStoreId && !$user->hasStoreAccess($selectedStoreId)) {
            return response()->json(['message' => 'Você não possui permissão para acessar esta loja.'], 403);
        }

        // Se não foi informada a loja e o usuário só tem 1 loja, seleciona automaticamente
        if (!$selectedStoreId && count($allowedStores) === 1) {
            $selectedStoreId = $allowedStores[0]->id;
        }

        $payload = [
            'iss' => config('app.url'),
            'sub' => $user->id,
            'store_id' => $selectedStoreId,
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24),
        ];

        $token = JWT::encode($payload, config('app.key'), 'HS256');

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->formatUserPayload($user, $selectedStoreId)
        ]);
    }

    public function logout()
    {
        return response()->json(['message' => 'Deslogado com sucesso']);
    }

    public function me(Request $request)
    {
        $user = $this->resolveUser($request) ?? $request->user();
        if (!$user) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        $user->load('modulePermissions.module');
        $storeId = $request->header('X-Store-Id');
        return response()->json($this->formatUserPayload($user, $storeId ? (int)$storeId : null));
    }

    /**
     * Alterna a loja ativa da sessão.
     */
    public function switchStore(Request $request)
    {
        $request->validate([
            'store_id' => 'required|integer|exists:stores,id',
        ]);

        $user = $this->resolveUser($request) ?? $request->user();
        if (!$user) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        $storeId = (int) $request->input('store_id');

        if (!$user->hasStoreAccess($storeId)) {
            return response()->json(['message' => 'Acesso negado para esta loja.'], 403);
        }

        $activeStore = Store::find($storeId);

        return response()->json([
            'message' => 'Loja alternada com sucesso',
            'active_store' => $activeStore,
            'user' => $this->formatUserPayload($user, $storeId)
        ]);
    }

    /**
     * Retorna a lista de lojas que o usuário tem acesso.
     */
    private function getAllowedStores(User $user)
    {
        return $user->getAllowedStores();
    }

    /**
     * Formata o payload do usuário com permissões e lojas autorizadas.
     */
    private function formatUserPayload(User $user, ?int $activeStoreId = null): array
    {
        if (!$user->relationLoaded('modulePermissions')) {
            $user->load('modulePermissions.module');
        }

        $allowedStores = $this->getAllowedStores($user);
        
        $activeStore = null;
        if ($activeStoreId) {
            $activeStore = $allowedStores->first(fn ($s) => (int) $s->id === (int) $activeStoreId);
        }
        if (!$activeStore && $allowedStores->count() > 0) {
            $activeStore = $allowedStores->first();
        }

        $permissions = $user->modulePermissions ? $user->modulePermissions->map(fn ($p) => [
            'module_id' => $p->module_id,
            'module_name' => $p->module?->name,
            'module_label' => $p->module?->label,
            'can_view' => (bool) $p->can_view,
            'can_create' => (bool) $p->can_create,
            'can_update' => (bool) $p->can_update,
            'can_delete' => (bool) $p->can_delete,
        ]) : [];

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => (bool) ($user->is_admin || ($user->id === 1)),
            'active_store' => $activeStore,
            'allowed_stores' => $allowedStores->map(fn($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'code' => $s->code,
                'company_name' => $s->company_name,
                'corporate_name' => $s->corporate_name,
            ]),
            'permissions' => $permissions
        ];
    }
}
