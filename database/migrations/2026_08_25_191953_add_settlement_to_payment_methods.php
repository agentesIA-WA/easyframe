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
            $table->enum('settlement_type', ['immediate', 'credit_card', 'custom_date'])->default('immediate')->after('is_active');
            $table->integer('settlement_days')->default(1)->after('settlement_type');
            $table->integer('installment_interval_days')->default(30)->after('settlement_days');
            $table->decimal('fee_percentage', 5, 2)->default(0)->after('installment_interval_days');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn([
                'settlement_type',
                'settlement_days',
                'installment_interval_days',
                'fee_percentage'
            ]);
        });
    }
};
