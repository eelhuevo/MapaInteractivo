<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pisos', function (Blueprint $table) {
            $table->id('idPiso');
            $table->foreignId('idEdificio')->constrained('edificios', 'idEdificio')->cascadeOnDelete();
            $table->smallInteger('numeroPiso');
            $table->string('nombrePiso', 60);

            $table->unique(['idEdificio', 'numeroPiso']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pisos');
    }
};
