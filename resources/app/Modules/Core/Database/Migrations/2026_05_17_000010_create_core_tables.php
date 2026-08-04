<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->string('company_name', 80)->nullable();
            $blueprint->string('corporate_name', 80)->nullable();
            $blueprint->string('address', 100)->nullable();
            $blueprint->string('city', 50)->nullable();
            $blueprint->string('phone', 30)->nullable();
            $blueprint->string('fax', 30)->nullable();
            $blueprint->string('email', 80)->nullable();
            $blueprint->string('cnpj', 30)->nullable();
            $blueprint->string('cpf', 30)->nullable();
            $blueprint->string('cep', 10)->nullable();
            $blueprint->string('website', 80)->nullable();
            $blueprint->string('business_hours', 80)->nullable();
            
            // Order/Proposal settings
            $blueprint->boolean('enable_pagination')->default(true);
            $blueprint->boolean('show_order_number')->default(true);
            $blueprint->text('proposal_initiation')->nullable();
            $blueprint->text('proposal_observations')->nullable();

            // Commission Brackets (5 ranges)
            for ($i = 1; $i <= 5; $i++) {
                $blueprint->decimal("bracket_{$i}_start", 15, 2)->default(0);
                $blueprint->decimal("bracket_{$i}_end", 15, 2)->default(0);
                $blueprint->decimal("bracket_{$i}_commission", 5, 2)->default(0);
            }

            $blueprint->timestamps();
        });

        Schema::create('payment_methods', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->string('description', 50);
            $blueprint->decimal('commission_rate', 5, 2)->default(0);
            $blueprint->boolean('is_active')->default(true);
            $blueprint->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->integer('module_id')->nullable();
            $blueprint->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $blueprint->text('description');
            $blueprint->json('metadata')->nullable();
            $blueprint->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('payment_methods');
        Schema::dropIfExists('settings');
    }
};
