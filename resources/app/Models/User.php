<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use App\Modules\Identity\Models\UserModulePermission;
use App\Modules\HR\Models\Employee;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'is_admin',
    ];

    /**
     * Relacionamento com as Lojas / Identidades Corporativas que o usuário tem acesso.
     */
    public function stores()
    {
        return $this->belongsToMany(\App\Modules\Core\Models\Store::class, 'user_stores')->withPivot('is_default')->withTimestamps();
    }

    /**
     * Retorna todas as lojas que o usuário tem acesso, unificando a tabela de usuários com o cadastro de RH.
     */
    public function getAllowedStores()
    {
        if ($this->is_admin || $this->id === 1) {
            return \App\Modules\Core\Models\Store::where('is_active', true)->orderBy('id', 'asc')->get();
        }

        $stores = $this->stores()->where('is_active', true)->get();

        // Busca o cadastro de funcionário associado (por ID ou pelo Nome) para unificar o acesso às unidades do RH
        $employee = $this->employee ?? \App\Modules\HR\Models\Employee::where('user_id', $this->id)->orWhere('name', $this->name)->first();
        if ($employee) {
            $employeeStores = $employee->stores()->where('is_active', true)->get();
            $stores = $stores->merge($employeeStores);
        }

        return $stores->unique(fn($item) => (int) $item->id)->sortBy(fn($item) => (int) $item->id)->values();
    }

    /**
     * Verifica se o usuário tem permissão de acesso a uma Loja específica.
     */
    public function hasStoreAccess(int $storeId): bool
    {
        if ($this->is_admin || $this->id === 1) {
            return true;
        }

        foreach ($this->getAllowedStores() as $store) {
            if ((int) $store->id === (int) $storeId) {
                return true;
            }
        }

        return false;
    }

    /**
     * Relacionamento com permissões de módulo (RBAC).
     */
    public function modulePermissions()
    {
        return $this->hasMany(UserModulePermission::class);
    }

    /**
     * Relacionamento com o registro de funcionário.
     */
    public function employee()
    {
        return $this->hasOne(Employee::class);
    }

    /**
     * Verifica se o usuário tem permissão em um módulo específico.
     * Se a permissão estiver configurada na matriz para o módulo, a matriz tem prioridade total.
     * Caso não haja registro no módulo, utiliza o status de admin como fallback.
     */
    public function hasModuleAccess(string $moduleName, string $action = 'view'): bool
    {
        $permission = $this->modulePermissions()
            ->whereHas('module', fn ($q) => $q->where('name', $moduleName))
            ->first();

        if ($permission) {
            return match ($action) {
                'view' => (bool) $permission->can_view,
                'create' => (bool) $permission->can_create,
                'update' => (bool) $permission->can_update,
                'delete' => (bool) $permission->can_delete,
                default => false,
            };
        }

        return (bool) $this->is_admin;
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
        ];
    }
}
