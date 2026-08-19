<?php

namespace App\Modules\Identity\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Identity\Models\SystemModule;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index()
    {
        // 1. Busca todos os funcionários cadastrados, com seu usuário e permissões (se houver)
        $employees = \App\Modules\HR\Models\Employee::with(['user.modulePermissions'])->get()->map(function($emp) {
            return [
                'id' => $emp->user_id, // Pode ser null se não tiver conta
                'employee_id' => $emp->id,
                'name' => $emp->name,
                'email' => $emp->user ? $emp->user->email : 'Sem conta de acesso',
                'role' => $emp->role ?? 'N/A',
                'is_admin' => (bool) ($emp->user ? $emp->user->is_admin : false),
                'permissions' => $emp->user ? $emp->user->modulePermissions : []
            ];
        });

        // 2. Busca usuários do sistema que NÃO são funcionários (ex: Admin de TI)
        $systemUsers = User::doesntHave('employee')->with('modulePermissions')->get()->map(function($user) {
            return [
                'id' => $user->id,
                'employee_id' => null,
                'name' => $user->name . ' (Sistema)',
                'email' => $user->email,
                'role' => 'Administrador',
                'is_admin' => (bool) $user->is_admin,
                'permissions' => $user->modulePermissions
            ];
        });

        // Retorna a lista unificada
        return response()->json($employees->concat($systemUsers));
    }

    public function syncPermissions(Request $request, User $user)
    {
        $request->validate([
            'permissions' => 'required|array',
            'permissions.*.module_id' => 'required|exists:system_modules,id',
            'permissions.*.can_view' => 'boolean',
            'permissions.*.can_create' => 'boolean',
            'permissions.*.can_update' => 'boolean',
            'permissions.*.can_delete' => 'boolean',
            'is_admin' => 'nullable|boolean',
        ]);

        if ($request->has('is_admin')) {
            $user->is_admin = $request->is_admin;
            $user->save();
        }

        // Remove permissões atuais
        $user->modulePermissions()->delete();

        // Adiciona novas permissões detalhadas
        foreach ($request->permissions as $perm) {
            $user->modulePermissions()->create([
                'module_id' => $perm['module_id'],
                'can_view' => $perm['can_view'] ?? false,
                'can_create' => $perm['can_create'] ?? false,
                'can_update' => $perm['can_update'] ?? false,
                'can_delete' => $perm['can_delete'] ?? false
            ]);
        }

        return response()->json(['message' => 'Permissões sincronizadas com sucesso']);
    }

    public function createAccount(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $employee = \App\Modules\HR\Models\Employee::findOrFail($request->employee_id);

        if ($employee->user_id) {
            return response()->json(['message' => 'Este funcionário já possui uma conta de acesso.'], 422);
        }

        $user = User::create([
            'name' => $employee->name,
            'email' => $request->email,
            'password' => \Illuminate\Support\Facades\Hash::make($request->password),
        ]);

        $employee->update(['user_id' => $user->id]);

        return response()->json([
            'message' => 'Conta criada com sucesso!',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $employee->role,
                'permissions' => []
            ]
        ], 201);
    }
}
