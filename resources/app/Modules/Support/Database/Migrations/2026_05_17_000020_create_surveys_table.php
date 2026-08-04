<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surveys', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->string('question', 200);
            $blueprint->boolean('is_active')->default(true);
            $blueprint->timestamps();
        });

        Schema::create('survey_responses', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->foreignId('survey_id')->constrained('surveys');
            $blueprint->foreignId('customer_id')->constrained('customers');
            $blueprint->integer('rating')->comment('1 to 5');
            $blueprint->text('comment')->nullable();
            $blueprint->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('survey_responses');
        Schema::dropIfExists('surveys');
    }
};
