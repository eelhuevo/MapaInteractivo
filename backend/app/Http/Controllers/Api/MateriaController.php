<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Materia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * HU "Consulta de materias" — catalogo de materias con los docentes
 * que las imparten (tablas materias + docenteMaterias).
 *
 * La lista sale de la base de datos: en el frontend no hay materias
 * inventadas, igual que con los docentes (GET /api/docentes).
 */
class MateriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'buscar' => ['nullable', 'string', 'max:120'],
        ]);

        $textoBusqueda = trim((string) $request->string('buscar'));

        $materias = Materia::query()
            ->with(['docentes' => function ($consulta) {
                $consulta->whereHas('usuario', function ($usuario) {
                    $usuario->where('estaActivo', true);
                });
            }, 'docentes.usuario'])
            ->when($textoBusqueda !== '', function ($consulta) use ($textoBusqueda) {
                $consulta->where('nombreMateria', 'ilike', '%'.$textoBusqueda.'%');
            })
            ->orderBy('nombreMateria')
            ->get()
            ->map(fn (Materia $materia) => [
                'idMateria' => $materia->idMateria,
                'nombreMateria' => $materia->nombreMateria,
                'docentes' => $materia->docentes->map(fn ($docente) => [
                    'idDocente' => $docente->idDocente,
                    'nombreCompleto' => $docente->usuario?->nombreCompleto,
                    'departamentoDocente' => $docente->departamentoDocente,
                ])->values(),
            ]);

        return response()->json(['materias' => $materias]);
    }
}
