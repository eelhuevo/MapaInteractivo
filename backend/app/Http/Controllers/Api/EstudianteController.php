<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Listado de estudiantes (datos academicos: carrera, semestre, correo).
 *
 * Requiere token Sanctum a diferencia de los catalogos publicos
 * (roles, materias, carreras): aqui hay datos personales, asi que
 * no se expone a visitantes. El nombre viaja en 3FN (nombre,
 * apellidoPaterno, apellidoMaterno) mas el nombreCompleto ya unido.
 */
class EstudianteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'buscar' => ['nullable', 'string', 'max:120'],
        ]);

        $textoBusqueda = trim((string) $request->string('buscar'));

        $estudiantes = Estudiante::query()
            ->with(['usuario', 'carrera'])
            ->whereHas('usuario', function ($usuario) {
                $usuario->where('estaActivo', true);
            })
            ->when($textoBusqueda !== '', function ($consulta) use ($textoBusqueda) {
                $consulta->whereHas('usuario', function ($usuario) use ($textoBusqueda) {
                    $usuario->where(function ($campos) use ($textoBusqueda) {
                        $campos->where('nombreUsuario', 'ilike', '%'.$textoBusqueda.'%')
                            ->orWhere('apellidoPaternoUsuario', 'ilike', '%'.$textoBusqueda.'%')
                            ->orWhere('apellidoMaternoUsuario', 'ilike', '%'.$textoBusqueda.'%')
                            ->orWhere('correoUsuario', 'ilike', '%'.$textoBusqueda.'%');
                    });
                });
            })
            ->orderBy('idEstudiante')
            ->get()
            ->map(fn (Estudiante $estudiante) => [
                'idEstudiante' => $estudiante->idEstudiante,
                'idUsuario' => $estudiante->idUsuario,
                'nombre' => $estudiante->usuario?->nombreUsuario,
                'apellidoPaterno' => $estudiante->usuario?->apellidoPaternoUsuario,
                'apellidoMaterno' => $estudiante->usuario?->apellidoMaternoUsuario,
                'nombreCompleto' => $estudiante->usuario?->nombreCompleto,
                'correoUsuario' => $estudiante->usuario?->correoUsuario,
                'idCarrera' => $estudiante->idCarrera,
                'nombreCarrera' => $estudiante->carrera?->nombreCarrera,
                'semestreEstudiante' => (int) $estudiante->semestreEstudiante,
            ])
            ->values();

        return response()->json(['estudiantes' => $estudiantes]);
    }
}
