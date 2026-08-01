<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('cheque_number')->nullable();
            $table->string('cheque_agency')->nullable();
            $table->string('cheque_account')->nullable();
            $table->string('card_brand')->nullable();
            $table->text('observation')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['cheque_number', 'cheque_agency', 'cheque_account', 'card_brand', 'observation']);
        });
    }
};
