<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_stores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['employee_id', 'store_id']);
        });

        // Migra dados existentes de employees.store_id para employee_stores
        $employees = DB::table('employees')->whereNotNull('store_id')->get();
        foreach ($employees as $emp) {
            DB::table('employee_stores')->insertOrIgnore([
                'employee_id' => $emp->id,
                'store_id' => $emp->store_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_stores');
    }
};
