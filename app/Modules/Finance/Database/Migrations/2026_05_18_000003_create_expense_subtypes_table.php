<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_subtypes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_type_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            
            $table->unique(['expense_type_id', 'name']);
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->foreignId('expense_subtype_id')->nullable()->after('expense_type_id')->constrained();
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('expense_subtype_id');
        });
        Schema::dropIfExists('expense_subtypes');
    }
};
