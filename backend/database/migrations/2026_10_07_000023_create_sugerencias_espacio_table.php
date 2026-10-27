<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sugerenciasEspacio', function (Blueprint $table) {
            $table->id('idSugerencia');
            $table->foreignId('idCarrera')->constrained('carreras', 'idCarrera')->cascadeOnDelete();
            $table->unsignedSmallInteger('semestreObjetivo');
            $table->foreignId('idEspacio')->constrained('espacios', 'idEspacio')->cascadeOnDelete();

            $table->unique(['idCarrera', 'semestreObjetivo', 'idEspacio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sugerenciasEspacio');
    }
};
