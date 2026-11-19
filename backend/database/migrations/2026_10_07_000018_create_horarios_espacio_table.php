<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('horariosEspacio', function (Blueprint $table) {
            $table->id('idHorario');
            $table->foreignId('idEspacio')->constrained('espacios', 'idEspacio')->cascadeOnDelete();
            // lunes, martes, miercoles, jueves, viernes, sabado, domingo
            $table->string('diaSemana', 12);
            $table->time('horaApertura');
            $table->time('horaCierre');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('horariosEspacio');
    }
};
