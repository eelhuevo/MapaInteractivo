<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estudiantes', function (Blueprint $table) {
            $table->id('idEstudiante');
            $table->foreignId('idUsuario')->unique()->constrained('usuarios', 'idUsuario')->cascadeOnDelete();
            $table->foreignId('idCarrera')->constrained('carreras', 'idCarrera')->restrictOnDelete();
            $table->unsignedSmallInteger('semestreEstudiante')->default(1);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estudiantes');
    }
};
