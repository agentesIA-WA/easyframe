<?php

namespace App\Modules\Identity\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class UserModulePermission extends Model
{
    protected $fillable = [
        'user_id',
        'module_id',
        'can_view',
        'can_create',
        'can_update',
        'can_delete',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function module()
    {
        return $this->belongsTo(SystemModule::class, 'module_id');
    }
}
