<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUsuarioController extends Controller
{
    /**
     * HU-17 — El administrador registra nuevos usuarios con nombre,
     * correo, contraseña y rol. El correo debe ser único.
     */
    public function store(Request $request): JsonResponse
    {
        $datosValidados = $request->validate([
            'nombreUsuario' => ['required', 'string', 'max:120'],
            'correoUsuario' => ['required', 'email', 'max:150', 'unique:usuarios,correoUsuario'],
            'contrasena' => ['required', 'string', 'min:8'],
            'nombreRol' => ['required', Rule::in(['estudiante', 'docente', 'administrador', 'personalAdministrativo'])],
            'idiomaPreferido' => ['nullable', Rule::in(['es', 'en'])],
            'idCarrera' => ['required_if:nombreRol,estudiante', 'nullable', 'integer', 'exists:carreras,idCarrera'],
            'semestreEstudiante' => ['required_if:nombreRol,estudiante', 'nullable', 'integer', 'min:1', 'max:15'],
            'departamentoDocente' => ['nullable', 'string', 'max:120'],
        ], [
            'correoUsuario.unique' => 'El correo ya está registrado.',
        ]);

        $rolUsuario = Rol::where('nombreRol', $datosValidados['nombreRol'])->firstOrFail();

        $usuarioNuevo = Usuario::create([
            'idRol' => $rolUsuario->idRol,
            'nombreUsuario' => $datosValidados['nombreUsuario'],
            'correoUsuario' => $datosValidados['correoUsuario'],
            'contrasenaHash' => $datosValidados['contrasena'],
            'idiomaPreferido' => $datosValidados['idiomaPreferido'] ?? 'es',
        ]);

        if ($datosValidados['nombreRol'] === 'estudiante') {
            Estudiante::create([
                'idUsuario' => $usuarioNuevo->idUsuario,
                'idCarrera' => $datosValidados['idCarrera'],
                'semestreEstudiante' => $datosValidados['semestreEstudiante'],
            ]);
        }

        if ($datosValidados['nombreRol'] === 'docente' && ! empty($datosValidados['departamentoDocente'])) {
            $usuarioNuevo->docente()->create([
                'departamentoDocente' => $datosValidados['departamentoDocente'],
            ]);
        }

        return response()->json([
            'mensaje' => 'Registro exitoso.',
            'usuario' => [
                'idUsuario' => $usuarioNuevo->idUsuario,
                'nombreUsuario' => $usuarioNuevo->nombreUsuario,
                'correoUsuario' => $usuarioNuevo->correoUsuario,
                'rol' => $rolUsuario->nombreRol,
            ],
        ], 201);
    }

    /**
     * Lista de usuarios registrados (panel de administración).
     */
    public function index(): JsonResponse
    {
        $coleccionUsuarios = Usuario::with('rol')->orderBy('nombreUsuario')->get();

        return response()->json([
            'usuarios' => $coleccionUsuarios->map(fn (Usuario $usuario) => [
                'idUsuario' => $usuario->idUsuario,
                'nombreUsuario' => $usuario->nombreUsuario,
                'correoUsuario' => $usuario->correoUsuario,
                'idiomaPreferido' => $usuario->idiomaPreferido,
                'estaActivo' => $usuario->estaActivo,
                'rol' => $usuario->rol?->nombreRol,
                'creadoEn' => $usuario->creadoEn?->toDateTimeString(),
            ])->values(),
        ]);
    }
}
