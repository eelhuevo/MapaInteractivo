<?php

namespace Database\Seeders;

use App\Models\Docente;
use App\Models\HorarioDocente;
use App\Models\Materia;
use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

/**
 * 10 docentes de demostracion con su horario semanal (HU "Consulta de
 * docentes" y "Consulta de horarios").
 *
 * Reemplaza a los 8 docentes inventados que vivian en
 * frontend/js/data/docentes.js: desde ahora la web pide la lista a
 * GET /api/docentes y estos son los unicos datos falsos que existen.
 *
 * Idempotente (firstOrCreate en todo), se puede correr las veces que
 * haga falta con `php artisan db:seed --class=DocenteSeeder`.
 */
class DocenteSeeder extends Seeder
{
    /**
     * 'idEspacioOficina' es el espacio donde atiende/imparte (el panel
     * de horarios usa ese vinculo para llevarte a su aula al pulsar un
     * bloque). Todas las oficinas elegidas son aulas/laboratorios del
     * Edificio A y B, que son los que el plano del frontend conoce.
     */
    private const DOCENTES = [
        [
            'correoUsuario' => 'docente@univalle.edu.bo',
            'nombre' => 'Marco', 'apellidoPaterno' => 'Vargas', 'apellidoMaterno' => 'Choque',
            'departamento' => 'Ingeniería de Sistemas',
            'idEspacioOficina' => 13, // Dirección de Carrera – Sistemas
            'materias' => ['Programación I' => 2, 'Base de Datos I' => 2],
            'horario' => [
                'lunes' => [['08:00', '10:00'], ['14:00', '16:00']],
                'miercoles' => [['08:00', '10:00']],
                'jueves' => [['14:00', '16:00']],
                'viernes' => [['10:00', '12:00']],
            ],
        ],
        [
            'correoUsuario' => 'docente2@univalle.edu.bo',
            'nombre' => 'Jorge Alberto', 'apellidoPaterno' => 'Salazar', 'apellidoMaterno' => 'Vargas',
            'departamento' => 'Ingeniería Electrónica',
            'idEspacioOficina' => 1, // Aula A-101
            'materias' => ['Redes de Computadoras' => 4],
            'horario' => [
                'lunes' => [['10:00', '12:00']],
                'martes' => [['08:00', '10:00'], ['16:00', '18:00']],
                'jueves' => [['08:00', '10:00']],
                'viernes' => [['14:00', '16:00']],
            ],
        ],
        [
            'correoUsuario' => 'docente3@univalle.edu.bo',
            'nombre' => 'María Elena', 'apellidoPaterno' => 'Condori', 'apellidoMaterno' => 'Ramos',
            'departamento' => 'Ingeniería Industrial',
            'idEspacioOficina' => 2, // Aula A-102
            'materias' => ['Cálculo I' => 1],
            'horario' => [
                'lunes' => [['14:00', '16:00'], ['16:00', '18:00']],
                'martes' => [['08:00', '10:00']],
                'miercoles' => [['08:00', '10:00']],
                'viernes' => [['08:00', '12:00']],
            ],
        ],
        [
            'correoUsuario' => 'docente4@univalle.edu.bo',
            'nombre' => 'Fernando Luis', 'apellidoPaterno' => 'Ticona', 'apellidoMaterno' => 'Apaza',
            'departamento' => 'Ingeniería Civil',
            'idEspacioOficina' => 3, // Aula A-201
            'materias' => ['Física I' => 2],
            'horario' => [
                'martes' => [['14:00', '16:00']],
                'miercoles' => [['10:00', '12:00'], ['14:00', '16:00']],
                'jueves' => [['14:00', '16:00']],
                'sabado' => [['09:00', '11:00']],
            ],
        ],
        [
            'correoUsuario' => 'docente5@univalle.edu.bo',
            'nombre' => 'Carla Beatriz', 'apellidoPaterno' => 'Rojas', 'apellidoMaterno' => 'Flores',
            'departamento' => 'Administración',
            'idEspacioOficina' => 4, // Aula A-301
            'materias' => ['Contabilidad General' => 1],
            'horario' => [
                'lunes' => [['08:00', '10:00']],
                'martes' => [['10:00', '12:00']],
                'jueves' => [['10:00', '12:00'], ['16:00', '18:00']],
                'viernes' => [['14:00', '16:00']],
            ],
        ],
        [
            'correoUsuario' => 'docente6@univalle.edu.bo',
            'nombre' => 'Diego Martín', 'apellidoPaterno' => 'Mamani', 'apellidoMaterno' => 'Quispe',
            'departamento' => 'Derecho',
            'idEspacioOficina' => 5, // Aula A-401
            'materias' => ['Derecho Civil' => 3],
            'horario' => [
                'lunes' => [['16:00', '18:00']],
                'miercoles' => [['14:00', '16:00'], ['16:00', '18:00']],
                'viernes' => [['08:00', '10:00']],
            ],
        ],
        [
            'correoUsuario' => 'docente7@univalle.edu.bo',
            'nombre' => 'Sandra Roxana', 'apellidoPaterno' => 'Flores', 'apellidoMaterno' => 'Céspedes',
            'departamento' => 'Ciencias Básicas',
            'idEspacioOficina' => 6, // Laboratorio de Sistemas B-101
            'materias' => ['Química General' => 1],
            'horario' => [
                'lunes' => [['10:00', '12:00']],
                'martes' => [['14:00', '16:00']],
                'miercoles' => [['10:00', '12:00']],
                'jueves' => [['08:00', '10:00']],
                'viernes' => [['16:00', '18:00']],
            ],
        ],
        [
            'correoUsuario' => 'docente8@univalle.edu.bo',
            'nombre' => 'Pedro Andrés', 'apellidoPaterno' => 'Choque', 'apellidoMaterno' => 'Huanca',
            'departamento' => 'Ingeniería de Sistemas',
            'idEspacioOficina' => 7, // Laboratorio de Redes B-102
            'materias' => ['Programación I' => 2, 'Redes de Computadoras' => 4],
            'horario' => [
                'lunes' => [['08:00', '10:00']],
                'martes' => [['10:00', '12:00']],
                'miercoles' => [['16:00', '18:00']],
                'jueves' => [['14:00', '16:00']],
                'viernes' => [['10:00', '12:00']],
            ],
        ],
        [
            'correoUsuario' => 'docente9@univalle.edu.bo',
            'nombre' => 'Valeria Nicole', 'apellidoPaterno' => 'Guzmán', 'apellidoMaterno' => 'Arce',
            'departamento' => 'Ingeniería de Sistemas',
            'idEspacioOficina' => 8, // Laboratorio de Física B-201
            'materias' => ['Base de Datos I' => 2, 'Programación I' => 3],
            'horario' => [
                'martes' => [['08:00', '10:00'], ['14:00', '16:00']],
                'miercoles' => [['10:00', '12:00']],
                'jueves' => [['16:00', '18:00']],
                'viernes' => [['08:00', '10:00']],
            ],
        ],
        [
            'correoUsuario' => 'docente10@univalle.edu.bo',
            'nombre' => 'Hugo René', 'apellidoPaterno' => 'Paredes', 'apellidoMaterno' => 'Colque',
            'departamento' => 'Ingeniería Electrónica',
            'idEspacioOficina' => 9, // Laboratorio de Química B-301
            'materias' => ['Física I' => 2, 'Cálculo I' => 1],
            'horario' => [
                'lunes' => [['14:00', '16:00']],
                'martes' => [['16:00', '18:00']],
                'miercoles' => [['08:00', '10:00']],
                'jueves' => [['10:00', '12:00']],
                'sabado' => [['09:00', '11:00']],
            ],
        ],
    ];

    public function run(): void
    {
        $idRolDocente = Rol::where('nombreRol', 'docente')->value('idRol');
        $idsMaterias = Materia::pluck('idMateria', 'nombreMateria');

        foreach (self::DOCENTES as $datos) {
            /* Usuario con nombre en 3FN; la contrasena se hashea sola
               (cast 'hashed'). Todas las cuentas demo usan Docente12345. */
            $usuario = Usuario::firstOrCreate(
                ['correoUsuario' => $datos['correoUsuario']],
                [
                    'idRol' => $idRolDocente,
                    'nombreUsuario' => $datos['nombre'],
                    'apellidoPaternoUsuario' => $datos['apellidoPaterno'],
                    'apellidoMaternoUsuario' => $datos['apellidoMaterno'],
                    'contrasenaHash' => 'Docente12345',
                    'idiomaPreferido' => 'es',
                    'estaActivo' => true,
                ]
            );

            $docente = Docente::firstOrCreate(
                ['idUsuario' => $usuario->idUsuario],
                [
                    'departamentoDocente' => $datos['departamento'],
                    'idEspacioOficina' => $datos['idEspacioOficina'],
                ]
            );

            /* Si el docente ya existia sin oficina, se le asigna la suya */
            if ($docente->idEspacioOficina === null) {
                $docente->forceFill(['idEspacioOficina' => $datos['idEspacioOficina']])->save();
            }

            /* Horario semanal (dia + turno "HH:MM") */
            foreach ($datos['horario'] as $diaSemana => $turnosDia) {
                foreach ($turnosDia as [$horaInicio, $horaFin]) {
                    HorarioDocente::firstOrCreate([
                        'idDocente' => $docente->idDocente,
                        'diaSemana' => $diaSemana,
                        'horaInicio' => $horaInicio,
                        'horaFin' => $horaFin,
                    ]);
                }
            }

            /* Materias que imparte (pivot docenteMaterias) */
            foreach ($datos['materias'] as $nombreMateria => $semestre) {
                if (! isset($idsMaterias[$nombreMateria])) {
                    continue;
                }

                $docente->materias()->syncWithoutDetaching([
                    $idsMaterias[$nombreMateria] => ['semestreMateria' => $semestre],
                ]);
            }
        }
    }
}
