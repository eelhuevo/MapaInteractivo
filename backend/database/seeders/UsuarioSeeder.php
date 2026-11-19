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

        // Cuentas de demostracion. Los nombres van separados en tres
        // columnas (3FN): nombre, apellidoPaterno y apellidoMaterno.
        // Las contrasenas no cambian (las usan los tests HU).
        $cuentasDemo = [
            [
                'correoUsuario' => 'admin@univalle.edu.bo',
                'idRol' => $mapaRoles['administrador'],
                'nombreUsuario' => 'Adriana',
                'apellidoPaternoUsuario' => 'Quispe',
                'apellidoMaternoUsuario' => 'Mamani',
                'contrasenaHash' => 'Admin12345',
            ],
            [
                'correoUsuario' => 'gestion@univalle.edu.bo',
                'idRol' => $mapaRoles['personalAdministrativo'],
                'nombreUsuario' => 'Carla',
                'apellidoPaternoUsuario' => 'Flores',
                'apellidoMaternoUsuario' => 'Rojas',
                'contrasenaHash' => 'Gestion12345',
            ],
            [
                'correoUsuario' => 'docente@univalle.edu.bo',
                'idRol' => $mapaRoles['docente'],
                'nombreUsuario' => 'Marco',
                'apellidoPaternoUsuario' => 'Vargas',
                'apellidoMaternoUsuario' => 'Choque',
                'contrasenaHash' => 'Docente12345',
            ],
            [
                'correoUsuario' => 'estudiante@univalle.edu.bo',
                'idRol' => $mapaRoles['estudiante'],
                'nombreUsuario' => 'Lucia',
                'apellidoPaternoUsuario' => 'Mamani',
                'apellidoMaternoUsuario' => 'Ticona',
                'contrasenaHash' => 'Estudiante12345',
            ],
        ];

        foreach ($cuentasDemo as $datosCuenta) {
            $usuarioCuenta = Usuario::firstOrCreate(
                ['correoUsuario' => $datosCuenta['correoUsuario']],
                $datosCuenta + ['idiomaPreferido' => 'es']
            );

            // Si la cuenta ya existia (p. ej. con el nombre completo en
            // una sola columna), se actualizan los tres campos de nombre.
            $usuarioCuenta->fill([
                'nombreUsuario' => $datosCuenta['nombreUsuario'],
                'apellidoPaternoUsuario' => $datosCuenta['apellidoPaternoUsuario'],
                'apellidoMaternoUsuario' => $datosCuenta['apellidoMaternoUsuario'],
            ])->save();
        }

        // Docente de ejemplo con materias asignadas
        $usuarioDocente = Usuario::where('correoUsuario', 'docente@univalle.edu.bo')->firstOrFail();

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
        $usuarioEstudiante = Usuario::where('correoUsuario', 'estudiante@univalle.edu.bo')->firstOrFail();

        Estudiante::firstOrCreate(
            ['idUsuario' => $usuarioEstudiante->idUsuario],
            [
                'idCarrera' => Carrera::where('nombreCarrera', 'Ingeniería de Sistemas')->value('idCarrera'),
                'semestreEstudiante' => 3,
            ]
        );
    }
}
