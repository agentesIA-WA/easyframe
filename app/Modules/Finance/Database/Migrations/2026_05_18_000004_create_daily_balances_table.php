<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_balances', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            
            // Inventário físico por denominação
            $table->integer('qty_005')->default(0)->comment('Moedas de R$ 0,05');
            $table->integer('qty_010')->default(0)->comment('Moedas de R$ 0,10');
            $table->integer('qty_025')->default(0)->comment('Moedas de R$ 0,25');
            $table->integer('qty_050')->default(0)->comment('Moedas de R$ 0,50');
            $table->integer('qty_100')->default(0)->comment('Moedas de R$ 1,00');
            $table->integer('qty_200')->default(0)->comment('Cédulas de R$ 2,00');
            $table->integer('qty_500')->default(0)->comment('Cédulas de R$ 5,00');
            $table->integer('qty_1000')->default(0)->comment('Cédulas de R$ 10,00');
            $table->integer('qty_2000')->default(0)->comment('Cédulas de R$ 20,00');
            $table->integer('qty_5000')->default(0)->comment('Cédulas de R$ 50,00');
            $table->integer('qty_10000')->default(0)->comment('Cédulas de R$ 100,00');
            
            $table->decimal('total_cash', 15, 2)->default(0);
            $table->decimal('total_checks', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            
            $table->foreignId('user_id')->constrained()->comment('Usuário que realizou o fechamento');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_balances');
    }
};
