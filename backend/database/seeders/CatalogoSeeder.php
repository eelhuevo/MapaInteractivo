<?php

namespace Database\Seeders;

use App\Models\Carrera;
use App\Models\CategoriaServicio;
use App\Models\Materia;
use App\Models\Rol;
use App\Models\TipoEspacio;
use App\Models\TipoLaboratorio;
use Illuminate\Database\Seeder;

class CatalogoSeeder extends Seeder
{
    public function run(): void
    {
        // Roles del sistema
        $rolesSistema = [
            ['nombreRol' => 'estudiante', 'descripcionRol' => 'Consulta aulas, laboratorios, biblioteca y sugerencias según su carrera.'],
            ['nombreRol' => 'docente', 'descripcionRol' => 'Consulta aulas, materias y horarios.'],
            ['nombreRol' => 'administrador', 'descripcionRol' => 'Administra el sistema y consulta estadísticas.'],
            ['nombreRol' => 'personalAdministrativo', 'descripcionRol' => 'Administra oficinas y servicios del mapa.'],
        ];

        foreach ($rolesSistema as $datosRol) {
            Rol::firstOrCreate(['nombreRol' => $datosRol['nombreRol']], $datosRol);
        }

        // Carreras
        $nombresCarreras = [
            'Ingeniería de Sistemas',
            'Ingeniería Industrial',
            'Administración de Empresas',
            'Derecho',
            'Arquitectura',
            'Psicología',
            'Contaduría Pública',
            'Ingeniería Comercial',
        ];

        foreach ($nombresCarreras as $nombreCarrera) {
            Carrera::firstOrCreate(['nombreCarrera' => $nombreCarrera]);
        }

        // Materias de ejemplo
        $nombresMaterias = [
            'Programación I',
            'Base de Datos I',
            'Redes de Computadoras',
            'Cálculo I',
            'Física I',
            'Química General',
            'Derecho Civil',
            'Contabilidad General',
        ];

        foreach ($nombresMaterias as $nombreMateria) {
            Materia::firstOrCreate(['nombreMateria' => $nombreMateria]);
        }

        // Tipos de espacio
        $nombresTiposEspacio = ['aula', 'laboratorio', 'oficina', 'biblioteca', 'areaDeportiva', 'estacionamiento'];

        foreach ($nombresTiposEspacio as $nombreTipoEspacio) {
            TipoEspacio::firstOrCreate(['nombreTipoEspacio' => $nombreTipoEspacio]);
        }

        // Categorías de servicio (filtros del mapa, HU-02)
        $nombresCategorias = [
            'caja',
            'bienestar estudiantil',
            'secretaría académica',
            'dirección de carrera',
            'biblioteca',
            'cafetería',
            'laboratorio',
            'aulas',
        ];

        foreach ($nombresCategorias as $nombreCategoria) {
            CategoriaServicio::firstOrCreate(['nombreCategoriaServicio' => $nombreCategoria]);
        }

        // Tipos de laboratorio (HU-19)
        $nombresTiposLaboratorio = ['química', 'redes', 'física', 'sistemas'];

        foreach ($nombresTiposLaboratorio as $nombreTipoLaboratorio) {
            TipoLaboratorio::firstOrCreate(['nombreTipoLaboratorio' => $nombreTipoLaboratorio]);
        }
    }
}
