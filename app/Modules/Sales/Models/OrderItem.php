<?php

namespace App\Modules\Sales\Models;

use App\Models\BaseModel;

class OrderItem extends BaseModel
{
    protected $fillable = ['order_id', 'description', 'observation', 'height', 'width', 'thickness', 'quantity', 'item_value', 'item_discount', 'increase_percent', 'discount_percent'];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function subItems()
    {
        // No legado, subitens eram linhas na string delimitada. 
        // Aqui podemos ter uma tabela order_sub_items ou tratar como componentes de um item.
        return $this->hasMany(OrderSubItem::class);
    }
}
