<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zonas', function (Blueprint $table) {
            $table->id('idZona');
            $table->string('nombreZona', 120);
            // entradaPrincipal, estacionamiento, areaDeportiva
            $table->string('tipoZona', 50);
            $table->geometry('coordenadasZona', subtype: 'point', srid: 4326)->nullable();
            $table->spatialIndex('coordenadasZona');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zonas');
    }
};
