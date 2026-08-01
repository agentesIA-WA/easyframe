<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('order_items', 'increase_percent')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->decimal('increase_percent', 8, 2)->default(0)->after('quantity');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('order_items', 'increase_percent')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropColumn('increase_percent');
            });
        }
    }
};
