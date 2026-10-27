<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('docenteMaterias', function (Blueprint $table) {
            $table->id('idDocenteMateria');
            $table->foreignId('idDocente')->constrained('docentes', 'idDocente')->cascadeOnDelete();
            $table->foreignId('idMateria')->constrained('materias', 'idMateria')->cascadeOnDelete();
            $table->unsignedSmallInteger('semestreMateria')->default(1);

            $table->unique(['idDocente', 'idMateria']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('docenteMaterias');
    }
};
