<?php

namespace App\Modules\Support\Models;

use Illuminate\Database\Eloquent\Model;

class Survey extends Model
{
    protected $fillable = ['question', 'is_active'];
}
