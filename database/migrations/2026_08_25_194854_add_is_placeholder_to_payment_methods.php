<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->boolean('is_placeholder')->default(false)->after('is_cash')
                  ->comment('Se true, não considera esse método como valor alocado e ele será substituído na baixa. Útil para "A Pagar na Entrega"');
        });

        // Atualiza os existentes
        DB::table('payment_methods')
            ->where('description', 'like', '%PAGAR NA ENTREGA%')
            ->update(['is_placeholder' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn('is_placeholder');
        });
    }
};
