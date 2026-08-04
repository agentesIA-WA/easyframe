<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('orders', 'delivered_at')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->timestamp('delivered_at')->nullable()->after('delivery_date');
                $table->text('delivery_observation')->nullable()->after('delivered_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('orders', 'delivered_at')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropColumn(['delivered_at', 'delivery_observation']);
            });
        }
    }
};
