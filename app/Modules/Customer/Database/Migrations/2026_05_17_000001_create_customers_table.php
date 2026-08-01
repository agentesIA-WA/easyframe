<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->string('tax_id')->unique()->comment('CPF/CNPJ');
            $table->json('contacts')->nullable();
            $table->string('cep')->nullable();
            $table->string('uf', 2)->nullable();
            $table->string('city')->nullable();
            $table->string('neighborhood')->nullable();
            $table->string('address')->nullable();
            $table->string('address_number')->nullable();
            $table->text('notes')->nullable();
            $table->bigInteger('legacy_id')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
