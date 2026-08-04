<?php

namespace App\Modules\Customer\Models;

use App\Models\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;

class FrameBarStock extends BaseModel
{
    use SoftDeletes;

    protected $table = 'frame_bars_stock';

    protected $fillable = ['product_id', 'bar_size', 'quantity', 'is_active'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
