<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tiposLaboratorio', function (Blueprint $table) {
            $table->id('idTipoLaboratorio');
            // química, redes, física, sistemas, etc.
            $table->string('nombreTipoLaboratorio', 80)->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tiposLaboratorio');
    }
};
