<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('edificios', function (Blueprint $table) {
            $table->id('idEdificio');
            $table->foreignId('idZona')->nullable()->constrained('zonas', 'idZona')->nullOnDelete();
            $table->string('nombreEdificio', 120);
            $table->string('codigoEdificio', 20)->unique();
            $table->text('descripcionEdificio')->nullable();
            $table->geometry('coordenadasEdificio', subtype: 'point', srid: 4326);
            $table->spatialIndex('coordenadasEdificio');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('edificios');
    }
};
