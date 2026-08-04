<?php

namespace App\Modules\Identity\Models;

use Illuminate\Database\Eloquent\Model;

class SystemModule extends Model
{
    protected $fillable = ['name', 'label', 'is_active'];

    public function permissions()
    {
        return $this->hasMany(UserModulePermission::class, 'module_id');
    }
}
