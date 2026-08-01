<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders');
            $table->foreignId('parent_id')->nullable()->constrained('payments')->onDelete('cascade');
            $table->integer('installment_number');
            $table->date('due_date');
            $table->char('status', 1)->default('A')->comment('A=Aberto, P=Pago');
            $table->decimal('value', 15, 2);
            $table->decimal('paid_value', 15, 2)->default(0);
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_method')->nullable();
            $table->bigInteger('legacy_id')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
