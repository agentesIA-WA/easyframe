<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employees') && !Schema::hasColumn('employees', 'store_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->foreignId('store_id')->nullable()->default(1)->after('user_id')->constrained('stores')->nullOnDelete();
            });
            DB::table('employees')->whereNull('store_id')->update(['store_id' => 1]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('employees') && Schema::hasColumn('employees', 'store_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->dropForeign(['store_id']);
                $table->dropColumn('store_id');
            });
        }
    }
};
