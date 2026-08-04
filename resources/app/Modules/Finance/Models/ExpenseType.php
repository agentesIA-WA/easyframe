<?php

namespace App\Modules\Finance\Models;

use App\Models\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpenseType extends BaseModel
{
    use SoftDeletes;

    protected $fillable = ['name', 'group_name', 'category', 'is_active'];

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }
}
