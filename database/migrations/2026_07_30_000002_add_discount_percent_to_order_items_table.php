<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('order_items', 'discount_percent')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->decimal('discount_percent', 8, 2)->default(0)->after('increase_percent');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('order_items', 'discount_percent')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropColumn('discount_percent');
            });
        }
    }
};
