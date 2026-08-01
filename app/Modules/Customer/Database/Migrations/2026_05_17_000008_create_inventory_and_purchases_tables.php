<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('suppliers');
            $table->string('invoice_number')->comment('Número da Nota/Documento');
            $table->date('purchase_date');
            $table->decimal('total_amount', 15, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained('purchases')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products');
            $table->decimal('quantity', 15, 3);
            $table->decimal('unit_cost', 15, 2);
            $table->decimal('total_cost', 15, 2);
            $table->timestamps();
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products');
            $table->enum('type', ['in', 'out', 'adjustment'])->comment('Entrada, Saída ou Ajuste');
            $table->decimal('quantity', 15, 3);
            $table->string('reference_type')->nullable()->comment('Purchase, Order, etc.');
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();
        });

        Schema::create('frame_bars_stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->comment('Deve ser um produto do tipo Moldura');
            $table->decimal('bar_size', 10, 2)->comment('Tamanho da vara (m)');
            $table->integer('quantity')->comment('Quantidade de varas');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('frame_bars_stock');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('purchase_items');
        Schema::dropIfExists('purchases');
    }
};
