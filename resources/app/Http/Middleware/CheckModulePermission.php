<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckModulePermission
{
    /**
     * Verifica se o usuário autenticado tem permissão para o módulo/ação.
     *
     * Uso na rota: ->middleware('module.permission:customers,view')
     *
     * Resolve o usuário a partir do token JWT (Firebase\JWT),
     * já que o sistema não usa os guards nativos do Laravel.
     */
    public function handle(Request $request, Closure $next, string $module, string $action = 'view'): Response
    {
        $user = $this->resolveUser($request);

        // Sem token ou token inválido — permite passar
        if (!$user) {
            return $next($request);
        }

        // Valida permissão na matriz de acesso (hasModuleAccess trata fallback de admin se módulo não estiver setado)
        if (!$user->hasModuleAccess($module, $action)) {
            return response()->json([
                'message' => 'Acesso negado. Você não tem permissão para esta funcionalidade.',
                'required_module' => $module,
                'required_action' => $action
            ], 403);
        }

        return $next($request);
    }

    /**
     * Extrai o usuário do token JWT Bearer.
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
}
