<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Docente;
use App\Models\Materia;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Listado y edicion de docentes desde el panel de administracion.
 *
 * El alta se hace con POST /api/admin/usuarios (nombreRol = docente),
 * que crea la cuenta y la fila de docente. Aqui se listan (incluidos
 * los desactivados) y se editan departamento, oficina, materias que
 * imparte y los datos de la cuenta.
 */
class AdminDocenteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'buscar' => ['nullable', 'string', 'max:120'],
        ]);

        $texto = trim((string) $request->string('buscar'));

        $docentes = Docente::query()
            ->with(['usuario.rol', 'oficina', 'materias'])
            ->when($texto !== '', function ($consulta) use ($texto) {
                $consulta->whereHas('usuario', function ($usuario) use ($texto) {
                    $usuario->where(function ($campos) use ($texto) {
                        $campos->where('nombreUsuario', 'ilike', '%'.$texto.'%')
                            ->orWhere('apellidoPaternoUsuario', 'ilike', '%'.$texto.'%')
                            ->orWhere('apellidoMaternoUsuario', 'ilike', '%'.$texto.'%')
                            ->orWhere('correoUsuario', 'ilike', '%'.$texto.'%')
                            ->orWhere('departamentoDocente', 'ilike', '%'.$texto.'%');
                    });
                })->orWhere('departamentoDocente', 'ilike', '%'.$texto.'%');
            })
            ->orderBy('idDocente')
            ->get()
            ->map(fn (Docente $docente) => $this->forma($docente))
            ->values();

        return response()->json(['docentes' => $docentes]);
    }

    /**
     * Edita departamento, oficina, materias impartidas y los datos de
     * la cuenta vinculada.
     */
    public function update(Request $request, int $idDocente): JsonResponse
    {
        $docente = Docente::with('usuario')->findOrFail($idDocente);
        $usuario = $docente->usuario;

        $datos = $request->validate([
            'nombreUsuario' => ['required', 'string', 'max:120'],
            'apellidoPaternoUsuario' => ['nullable', 'string', 'max:60'],
            'apellidoMaternoUsuario' => ['nullable', 'string', 'max:60'],
            'correoUsuario' => ['required', 'email', 'max:150',
                Rule::unique('usuarios', 'correoUsuario')->ignore($usuario->idUsuario, 'idUsuario')],
            'contrasena' => ['nullable', 'string', 'min:8'],
            'departamentoDocente' => ['nullable', 'string', 'max:120'],
            'idEspacioOficina' => ['nullable', 'integer', 'exists:espacios,idEspacio'],
            'idMaterias' => ['nullable', 'array'],
            'idMaterias.*' => ['integer', 'exists:materias,idMateria'],
        ], [
            'correoUsuario.unique' => 'El correo ya esta registrado.',
        ]);

        [$nombreReal, $paternoReal, $maternoReal] = Usuario::resolverNombre($datos);

        DB::transaction(function () use ($datos, $docente, $usuario, $nombreReal, $paternoReal, $maternoReal) {
            $usuario->nombreUsuario = $nombreReal;
            $usuario->apellidoPaternoUsuario = $paternoReal;
            $usuario->apellidoMaternoUsuario = $maternoReal;
            $usuario->correoUsuario = $datos['correoUsuario'];
            if (! empty($datos['contrasena'])) {
                $usuario->contrasenaHash = $datos['contrasena'];
            }
            $usuario->save();

            $docente->departamentoDocente = $datos['departamentoDocente'] ?? null;
            $docente->idEspacioOficina = $datos['idEspacioOficina'] ?? null;
            $docente->save();

            if (array_key_exists('idMaterias', $datos) && is_array($datos['idMaterias'])) {
                /* El pivot exige semestreMateria (NOT NULL): se usa 1 por
                   omision, igual que el seeder de docentes */
                $vinculos = [];
                foreach ($datos['idMaterias'] as $idMateria) {
                    $vinculos[(int) $idMateria] = ['semestreMateria' => 1];
                }
                $docente->materias()->sync($vinculos);
            }
        });

        return response()->json([
            'mensaje' => 'Docente actualizado.',
            'docente' => $this->forma($docente->fresh(['usuario.rol', 'oficina', 'materias'])),
        ]);
    }

    /**
     * Forma comun de un docente para el panel.
     */
    private function forma(Docente $docente): array
    {
        $usuario = $docente->usuario;

        return [
            'idDocente' => $docente->idDocente,
            'idUsuario' => $docente->idUsuario,
            'nombre' => $usuario?->nombreUsuario ?? '',
            'apellidoPaterno' => $usuario?->apellidoPaternoUsuario ?? '',
            'apellidoMaterno' => $usuario?->apellidoMaternoUsuario ?? '',
            'nombreCompleto' => $usuario?->nombre_completo ?? '',
            'correoUsuario' => $usuario?->correoUsuario ?? '',
            'estaActivo' => (bool) ($usuario?->estaActivo ?? false),
            'rol' => $usuario?->rol?->nombreRol,
            'departamentoDocente' => $docente->departamentoDocente ?? '',
            'idEspacioOficina' => $docente->idEspacioOficina,
            'nombreEspacioOficina' => $docente->oficina?->nombreEspacio ?? '',
            'materias' => $docente->materias->map(fn (Materia $materia) => [
                'idMateria' => $materia->idMateria,
                'nombreMateria' => $materia->nombreMateria,
            ])->values(),
        ];
    }
}
