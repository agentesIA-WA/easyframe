<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('payment_methods', 'is_cash')) {
            Schema::table('payment_methods', function (Blueprint $table) {
                $table->boolean('is_cash')->default(false)->after('commission_rate');
            });
        }

        // Popula marcas à vista por padrão
        DB::table('payment_methods')
            ->whereIn(DB::raw('UPPER(description)'), ['DINHEIRO', 'PIX', 'CARTÃO DE DÉBITO', 'DEBITO', 'DÉBITO'])
            ->update(['is_cash' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('payment_methods', 'is_cash')) {
            Schema::table('payment_methods', function (Blueprint $table) {
                $table->dropColumn('is_cash');
            });
        }
    }
};
