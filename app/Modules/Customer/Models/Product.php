<?php

namespace App\Modules\Customer\Models;

use App\Models\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends BaseModel
{
    use SoftDeletes;

    protected $fillable = ['category_id', 'code', 'name', 'width', 'allow_margin', 'unit_price', 'cost_price', 'is_active', 'legacy_id'];

    protected $casts = [
        'allow_margin' => 'boolean',
        'width' => 'float',
        'unit_price' => 'float',
        'cost_price' => 'float',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
