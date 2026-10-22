<?php

namespace Database\Seeders;

use App\Models\Carrera;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Materia;
use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

class UsuarioSeeder extends Seeder
{
    public function run(): void
    {
        $mapaRoles = Rol::pluck('idRol', 'nombreRol');

        // Administrador del sistema
        Usuario::firstOrCreate(
            ['correoUsuario' => 'admin@univalle.edu.bo'],
            [
                'idRol' => $mapaRoles['administrador'],
                'nombreUsuario' => 'Administrador del Sistema',
                'contrasenaHash' => 'Admin12345',
                'idiomaPreferido' => 'es',
            ]
        );

        // Personal administrativo (gestiona oficinas del mapa, HU-06)
        Usuario::firstOrCreate(
            ['correoUsuario' => 'gestion@univalle.edu.bo'],
            [
                'idRol' => $mapaRoles['personalAdministrativo'],
                'nombreUsuario' => 'Gestión de Espacios',
                'contrasenaHash' => 'Gestion12345',
                'idiomaPreferido' => 'es',
            ]
        );

        // Docente de ejemplo con materias asignadas
        $usuarioDocente = Usuario::firstOrCreate(
            ['correoUsuario' => 'docente@univalle.edu.bo'],
            [
                'idRol' => $mapaRoles['docente'],
                'nombreUsuario' => 'Docente de Ejemplo',
                'contrasenaHash' => 'Docente12345',
                'idiomaPreferido' => 'es',
            ]
        );

        $docenteEjemplo = Docente::firstOrCreate(
            ['idUsuario' => $usuarioDocente->idUsuario],
            ['departamentoDocente' => 'Ingeniería de Sistemas']
        );

        $materiasEjemplo = Materia::whereIn('nombreMateria', ['Programación I', 'Base de Datos I'])->get();

        foreach ($materiasEjemplo as $materiaEjemplo) {
            $docenteEjemplo->materias()->syncWithoutDetaching([
                $materiaEjemplo->idMateria => ['semestreMateria' => 2],
            ]);
        }

        // Estudiante de ejemplo (para sugerencias HU-20)
        $usuarioEstudiante = Usuario::firstOrCreate(
            ['correoUsuario' => 'estudiante@univalle.edu.bo'],
            [
                'idRol' => $mapaRoles['estudiante'],
                'nombreUsuario' => 'Estudiante de Ejemplo',
                'contrasenaHash' => 'Estudiante12345',
                'idiomaPreferido' => 'es',
            ]
        );

        Estudiante::firstOrCreate(
            ['idUsuario' => $usuarioEstudiante->idUsuario],
            [
                'idCarrera' => Carrera::where('nombreCarrera', 'Ingeniería de Sistemas')->value('idCarrera'),
                'semestreEstudiante' => 3,
            ]
        );
    }
}
