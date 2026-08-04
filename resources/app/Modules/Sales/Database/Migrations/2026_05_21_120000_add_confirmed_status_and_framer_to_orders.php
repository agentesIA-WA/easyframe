<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add confirmed status to the enum using raw DB statement (safer for enums in Laravel with MySQL)
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('draft', 'confirmed', 'production', 'ready', 'delivered', 'difficult_delivery', 'delivered_unpaid') NOT NULL DEFAULT 'draft'");

        // Add framer_id
        if (!Schema::hasColumn('orders', 'framer_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->foreignId('framer_id')->nullable()->after('seller_id')->constrained('employees')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('orders', 'framer_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropForeign(['framer_id']);
                $table->dropColumn('framer_id');
            });
        }

        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('draft', 'production', 'ready', 'delivered', 'difficult_delivery', 'delivered_unpaid') NOT NULL DEFAULT 'draft'");
    }
};
