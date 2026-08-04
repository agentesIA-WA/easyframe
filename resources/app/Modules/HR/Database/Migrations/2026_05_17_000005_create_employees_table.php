<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('tax_id')->unique()->comment('CPF (cpf_funcionario)');
            $table->string('role')->nullable()->comment('Cargo (cargo_func)');
            $table->decimal('salary', 15, 2)->default(0);
            $table->decimal('commission_rate', 5, 2)->default(0);
            $table->date('hired_at')->nullable();
            $table->boolean('can_sell')->default(false)->comment('FAZ_VENDA');
            $table->boolean('is_molder')->default(false)->comment('MOLDURISTA');
            $table->string('phone')->nullable();
            $table->string('cellphone')->nullable();
            $table->text('notes')->nullable();
            $table->bigInteger('legacy_id')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
