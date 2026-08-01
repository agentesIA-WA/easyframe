<?php

namespace App\Modules\Finance\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpenseSubtype extends Model
{
    use SoftDeletes;

    protected $fillable = ['expense_type_id', 'name', 'is_active'];

    public function type()
    {
        return $this->belongsTo(ExpenseType::class, 'expense_type_id');
    }
}
