<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Horario semanal de atencion de cada docente (panel "Horarios"
     * de la web, MANUAL-USUARIO seccion 9). Antes estos datos solo
     * existian inventados en el navegador (data/docentes.js).
     */
    public function up(): void
    {
        Schema::create('horariosDocente', function (Blueprint $table) {
            $table->id('idHorarioDocente');
            $table->foreignId('idDocente')->constrained('docentes', 'idDocente')->cascadeOnDelete();
            // lunes, martes, miercoles, jueves, viernes, sabado, domingo
            $table->string('diaSemana', 12);
            $table->time('horaInicio');
            $table->time('horaFin');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('horariosDocente');
    }
};
