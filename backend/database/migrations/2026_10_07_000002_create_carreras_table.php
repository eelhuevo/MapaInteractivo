<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carreras', function (Blueprint $table) {
            $table->id('idCarrera');
            $table->string('nombreCarrera', 120)->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carreras');
    }
};
