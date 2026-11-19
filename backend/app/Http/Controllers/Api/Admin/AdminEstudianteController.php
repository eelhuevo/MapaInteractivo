<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Carrera;
use App\Models\Estudiante;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Alta, edicion y activacion de estudiantes desde el panel de
 * administracion.
 *
 * El alta no vive aqui a proposito: se hace con POST /api/admin/usuarios
 * (nombreRol = estudiante), que crea la cuenta y la fila academica en la
 * misma operacion. Aqui solo se listan y se editan (carrera, semestre y
 * datos personales de la cuenta).
 */
class AdminEstudianteController extends Controller
{
    /**
     * Listado completo (tambien las cuentas desactivadas) con los
     * datos personales en 3FN y la carrera cursada.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'buscar' => ['nullable', 'string', 'max:120'],
        ]);

        $texto = trim((string) $request->string('buscar'));

        $estudiantes = Estudiante::query()
            ->with(['usuario.rol', 'carrera'])
            ->when($texto !== '', function ($consulta) use ($texto) {
                $consulta->whereHas('usuario', function ($usuario) use ($texto) {
                    $usuario->where(function ($campos) use ($texto) {
                        $campos->where('nombreUsuario', 'ilike', '%'.$texto.'%')
                            ->orWhere('apellidoPaternoUsuario', 'ilike', '%'.$texto.'%')
                            ->orWhere('apellidoMaternoUsuario', 'ilike', '%'.$texto.'%')
                            ->orWhere('correoUsuario', 'ilike', '%'.$texto.'%');
                    });
                });
            })
            ->orderBy('idEstudiante')
            ->get()
            ->map(fn (Estudiante $estudiante) => $this->forma($estudiante))
            ->values();

        return response()->json(['estudiantes' => $estudiantes]);
    }

    /**
     * Edita carrera, semestre y los datos de la cuenta vinculada.
     */
    public function update(Request $request, int $idEstudiante): JsonResponse
    {
        $estudiante = Estudiante::with('usuario')->findOrFail($idEstudiante);
        $usuario = $estudiante->usuario;

        $datos = $request->validate([
            'nombreUsuario' => ['required', 'string', 'max:120'],
            'apellidoPaternoUsuario' => ['nullable', 'string', 'max:60'],
            'apellidoMaternoUsuario' => ['nullable', 'string', 'max:60'],
            'correoUsuario' => ['required', 'email', 'max:150',
                Rule::unique('usuarios', 'correoUsuario')->ignore($usuario->idUsuario, 'idUsuario')],
            'contrasena' => ['nullable', 'string', 'min:8'],
            'idCarrera' => ['required', 'integer', 'exists:carreras,idCarrera'],
            'semestreEstudiante' => ['required', 'integer', 'min:1', 'max:15'],
        ], [
            'correoUsuario.unique' => 'El correo ya esta registrado.',
        ]);

        [$nombreReal, $paternoReal, $maternoReal] = Usuario::resolverNombre($datos);

        DB::transaction(function () use ($datos, $estudiante, $usuario, $nombreReal, $paternoReal, $maternoReal) {
            $usuario->nombreUsuario = $nombreReal;
            $usuario->apellidoPaternoUsuario = $paternoReal;
            $usuario->apellidoMaternoUsuario = $maternoReal;
            $usuario->correoUsuario = $datos['correoUsuario'];
            if (! empty($datos['contrasena'])) {
                $usuario->contrasenaHash = $datos['contrasena'];
            }
            $usuario->save();

            $estudiante->idCarrera = $datos['idCarrera'];
            $estudiante->semestreEstudiante = $datos['semestreEstudiante'];
            $estudiante->save();
        });

        return response()->json([
            'mensaje' => 'Estudiante actualizado.',
            'estudiante' => $this->forma($estudiante->fresh(['usuario.rol', 'carrera'])),
        ]);
    }

    /**
     * Forma comun de un estudiante para el panel.
     */
    private function forma(Estudiante $estudiante): array
    {
        $usuario = $estudiante->usuario;

        return [
            'idEstudiante' => $estudiante->idEstudiante,
            'idUsuario' => $estudiante->idUsuario,
            'nombre' => $usuario?->nombreUsuario ?? '',
            'apellidoPaterno' => $usuario?->apellidoPaternoUsuario ?? '',
            'apellidoMaterno' => $usuario?->apellidoMaternoUsuario ?? '',
            'nombreCompleto' => $usuario?->nombre_completo ?? '',
            'correoUsuario' => $usuario?->correoUsuario ?? '',
            'estaActivo' => (bool) ($usuario?->estaActivo ?? false),
            'rol' => $usuario?->rol?->nombreRol,
            'idCarrera' => $estudiante->idCarrera,
            'nombreCarrera' => $estudiante->carrera?->nombreCarrera ?? '',
            'semestreEstudiante' => (int) $estudiante->semestreEstudiante,
        ];
    }
}
