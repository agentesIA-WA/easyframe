<?php

namespace App\Modules\Customer\Models;

use App\Models\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;

class Purchase extends BaseModel
{
    use SoftDeletes;

    protected $fillable = ['supplier_id', 'invoice_number', 'purchase_date', 'total_amount', 'notes'];

    protected $casts = [
        'purchase_date' => 'date',
    ];

    public function items()
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
}
