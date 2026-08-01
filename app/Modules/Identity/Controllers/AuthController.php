<?php

namespace App\Modules\Identity\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Firebase\JWT\JWT;

class AuthController extends Controller
{
    /**
     * Autenticação simples via JWT para o SDM Modern.
     */
    public function login(Request $request)
    {
        $request->validate([
            'user' => 'required|string',
            'password' => 'required|string',
        ]);

        // No legado o campo era usuário, aqui mapeamos para o email criado no seeder
        $user = User::where('email', $request->user)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Credenciais inválidas'], 401);
        }

        // Carrega permissões com dados do módulo
        $user->load('modulePermissions.module');

        $payload = [
            'iss' => config('app.url'),
            'sub' => $user->id,
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24), // 24 horas
        ];

        $token = JWT::encode($payload, config('app.key'), 'HS256');

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->formatUserPayload($user)
        ]);
    }

    public function logout()
    {
        return response()->json(['message' => 'Deslogado com sucesso']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->load('modulePermissions.module');
        return response()->json($this->formatUserPayload($user));
    }

    /**
     * Formata o payload do usuário com permissões para o frontend.
     */
    private function formatUserPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => (bool) ($user->is_admin || ($user->id === 1)),
            'permissions' => $user->modulePermissions->map(fn ($p) => [
                'module_id' => $p->module_id,
                'module_name' => $p->module?->name,
                'module_label' => $p->module?->label,
                'can_view' => (bool) $p->can_view,
                'can_create' => (bool) $p->can_create,
                'can_update' => (bool) $p->can_update,
                'can_delete' => (bool) $p->can_delete,
            ])
        ];
    }
}
