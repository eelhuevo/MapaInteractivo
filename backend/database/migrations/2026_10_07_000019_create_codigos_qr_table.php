<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('codigosQr', function (Blueprint $table) {
            $table->id('idCodigoQr');
            $table->foreignId('idEdificio')->constrained('edificios', 'idEdificio')->cascadeOnDelete();
            $table->string('codigoQr', 80)->unique();
            $table->string('urlFichaEdificio', 255);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('codigosQr');
    }
};
