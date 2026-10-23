<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Orden de ejecución: primero los catálogos (roles, carreras,
     * tipos), luego el campus (zonas, edificios, espacios) y al
     * final los usuarios y las sugerencias que los referencian.
     */
    public function run(): void
    {
        $this->call([
            CatalogoSeeder::class,
            CampusSeeder::class,
            UsuarioSeeder::class,
            SugerenciaSeeder::class,
        ]);
    }
}
