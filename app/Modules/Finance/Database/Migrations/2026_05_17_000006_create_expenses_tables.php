<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('group_name')->nullable();
            $table->enum('category', ['store', 'personal'])->default('store');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_type_id')->constrained('expense_types');
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers'); // Vinculado a fornecedores
            $table->string('description');
            $table->decimal('amount', 15, 2);
            $table->date('due_date');
            $table->date('issue_date')->nullable();
            $table->date('payment_date')->nullable();
            $table->string('document_type')->nullable();
            $table->string('document_number')->nullable();
            $table->enum('status', ['pending', 'paid', 'cancelled'])->default('pending');
            $table->boolean('is_countable')->default(true)->comment('Contabilizar');
            $table->boolean('is_visible')->default(true)->comment('Mostrar no Relatório');
            $table->text('notes')->nullable();
            $table->bigInteger('legacy_id')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_types');
    }
};
