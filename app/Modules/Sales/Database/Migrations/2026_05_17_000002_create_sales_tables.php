<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('customer_id')->constrained('customers');
            $table->enum('status', ['draft', 'production', 'ready', 'delivered', 'difficult_delivery', 'delivered_unpaid']);
            $table->decimal('total_value', 15, 2);
            $table->decimal('discount', 15, 2)->default(0);
            $table->timestamp('production_date')->nullable();
            $table->bigInteger('legacy_id')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->string('description');
            $table->decimal('height', 10, 2);
            $table->decimal('width', 10, 2);
            $table->decimal('thickness', 10, 2)->default(0);
            $table->integer('quantity')->default(1);
            $table->decimal('item_value', 15, 2);
            $table->decimal('item_discount', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
