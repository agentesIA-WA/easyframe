<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'store_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->foreignId('store_id')->nullable()->default(1)->after('customer_id')->constrained('stores')->nullOnDelete();
            });
            DB::table('orders')->whereNull('store_id')->update(['store_id' => 1]);
        }

        if (Schema::hasTable('expenses') && !Schema::hasColumn('expenses', 'store_id')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->foreignId('store_id')->nullable()->default(1)->after('supplier_id')->constrained('stores')->nullOnDelete();
            });
            DB::table('expenses')->whereNull('store_id')->update(['store_id' => 1]);
        }

        if (Schema::hasTable('daily_balances') && !Schema::hasColumn('daily_balances', 'store_id')) {
            Schema::table('daily_balances', function (Blueprint $table) {
                $table->foreignId('store_id')->nullable()->default(1)->after('user_id')->constrained('stores')->nullOnDelete();
            });
            DB::table('daily_balances')->whereNull('store_id')->update(['store_id' => 1]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'store_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropForeign(['store_id']);
                $table->dropColumn('store_id');
            });
        }

        if (Schema::hasTable('expenses') && Schema::hasColumn('expenses', 'store_id')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->dropForeign(['store_id']);
                $table->dropColumn('store_id');
            });
        }

        if (Schema::hasTable('daily_balances') && Schema::hasColumn('daily_balances', 'store_id')) {
            Schema::table('daily_balances', function (Blueprint $table) {
                $table->dropForeign(['store_id']);
                $table->dropColumn('store_id');
            });
        }
    }
};
