<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tiposEspacio', function (Blueprint $table) {
            $table->id('idTipoEspacio');
            // aula, laboratorio, oficina, biblioteca, areaDeportiva, estacionamiento
            $table->string('nombreTipoEspacio', 60)->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tiposEspacio');
    }
};
