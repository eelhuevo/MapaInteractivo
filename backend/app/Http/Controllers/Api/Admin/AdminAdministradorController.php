<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * CRUD de administradores desde el panel de administracion.
 *
 * Listado, alta, edicion y activacion/desactivacion de cuentas cuyo
 * rol es 'administrador'. Las cuentas no se borran: se desactivan para
 * conservar el historial de favoritos, avisos y estadisticas.
 */
class AdminAdministradorController extends Controller
{
    /**
     * Lista de administradores registrados (panel de administración).
     */
    public function index(): JsonResponse
    {
        $coleccionUsuarios = Usuario::with(['rol'])->whereHas('rol', function ($q) {
            $q->where('nombreRol', 'administrador');
        })->orderBy('nombreUsuario')->get();

        return response()->json([
            'administradores' => $coleccionUsuarios->map(fn (Usuario $usuario) => [
                'idUsuario' => $usuario->idUsuario,
                'nombreUsuario' => $usuario->nombreUsuario,
                'apellidoPaternoUsuario' => $usuario->apellidoPaternoUsuario ?? '',
                'apellidoMaternoUsuario' => $usuario->apellidoMaternoUsuario ?? '',
                'nombreCompleto' => $usuario->nombre_completo,
                'correoUsuario' => $usuario->correoUsuario,
                'idiomaPreferido' => $usuario->idiomaPreferido,
                'estaActivo' => $usuario->estaActivo,
                'rol' => $usuario->rol?->nombreRol,
                'creadoEn' => $usuario->creadoEn?->toDateTimeString(),
            ])->values(),
        ]);
    }

    /**
     * Registra un nuevo administrador (nombre, correo, contraseña y rol fijo administrador).
     */
    public function store(Request $request): JsonResponse
    {
        $datosValidados = $request->validate([
            'nombreUsuario' => ['required', 'string', 'max:120'],
            'apellidoPaternoUsuario' => ['nullable', 'string', 'max:60'],
            'apellidoMaternoUsuario' => ['nullable', 'string', 'max:60'],
            'correoUsuario' => ['required', 'email', 'max:150', 'unique:usuarios,correoUsuario'],
            'contrasena' => ['required', 'string', 'min:8'],
            'idiomaPreferido' => ['nullable', Rule::in(['es', 'en'])],
        ], [
            'correoUsuario.unique' => 'El correo ya está registrado.',
        ]);

        $rolUsuario = Rol::where('nombreRol', 'administrador')->firstOrFail();

        [$nombreReal, $paternoReal, $maternoReal] = Usuario::resolverNombre($datosValidados);

        $usuarioNuevo = Usuario::create([
            'idRol' => $rolUsuario->idRol,
            'nombreUsuario' => $nombreReal,
            'apellidoPaternoUsuario' => $paternoReal,
            'apellidoMaternoUsuario' => $maternoReal,
            'correoUsuario' => $datosValidados['correoUsuario'],
            'contrasenaHash' => $datosValidados['contrasena'],
            'idiomaPreferido' => $datosValidados['idiomaPreferido'] ?? 'es',
        ]);

        return response()->json([
            'mensaje' => 'Registro exitoso.',
            'administrador' => [
                'idUsuario' => $usuarioNuevo->idUsuario,
                'nombreUsuario' => $usuarioNuevo->nombreUsuario,
                'apellidoPaternoUsuario' => $usuarioNuevo->apellidoPaternoUsuario,
                'apellidoMaternoUsuario' => $usuarioNuevo->apellidoMaternoUsuario,
                'nombreCompleto' => $usuarioNuevo->nombre_completo,
                'correoUsuario' => $usuarioNuevo->correoUsuario,
                'rol' => $rolUsuario->nombreRol,
            ],
        ], 201);
    }

    /**
     * Edita un administrador desde el panel de administración.
     * Mantiene el rol 'administrador' (no se puede cambiar de rol aquí).
     */
    public function update(Request $request, int $idUsuario): JsonResponse
    {
        $usuario = Usuario::findOrFail($idUsuario);

        // Asegura que el usuario sea administrador
        if ($usuario->rol?->nombreRol !== 'administrador') {
            $usuario->load('rol');
            if ($usuario->rol->nombreRol !== 'administrador') {
                return response()->json([
                    'mensaje' => 'El usuario no es un administrador.',
                ], 422);
            }
        }

        $datos = $request->validate([
            'nombreUsuario' => ['required', 'string', 'max:120'],
            'apellidoPaternoUsuario' => ['nullable', 'string', 'max:60'],
            'apellidoMaternoUsuario' => ['nullable', 'string', 'max:60'],
            'correoUsuario' => ['required', 'email', 'max:150',
                Rule::unique('usuarios', 'correoUsuario')->ignore($idUsuario, 'idUsuario')],
            'contrasena' => ['nullable', 'string', 'min:8'],
            'idiomaPreferido' => ['nullable', Rule::in(['es', 'en'])],
        ], [
            'correoUsuario.unique' => 'El correo ya está registrado.',
        ]);

        [$nombreReal, $paternoReal, $maternoReal] = Usuario::resolverNombre($datos);

        $usuario->nombreUsuario = $nombreReal;
        $usuario->apellidoPaternoUsuario = $paternoReal;
        $usuario->apellidoMaternoUsuario = $maternoReal;
        $usuario->correoUsuario = $datos['correoUsuario'];
        if (! empty($datos['contrasena'])) {
            $usuario->contrasenaHash = $datos['contrasena'];
        }
        if (isset($datos['idiomaPreferido'])) {
            $usuario->idiomaPreferido = $datos['idiomaPreferido'];
        }
        $usuario->save();

        $usuario->load('rol');

        return response()->json([
            'mensaje' => 'Administrador actualizado.',
            'administrador' => [
                'idUsuario' => $usuario->idUsuario,
                'nombreUsuario' => $usuario->nombreUsuario,
                'apellidoPaternoUsuario' => $usuario->apellidoPaternoUsuario ?? '',
                'apellidoMaternoUsuario' => $usuario->apellidoMaternoUsuario ?? '',
                'nombreCompleto' => $usuario->nombre_completo,
                'correoUsuario' => $usuario->correoUsuario,
                'idiomaPreferido' => $usuario->idiomaPreferido,
                'estaActivo' => $usuario->estaActivo,
                'rol' => $usuario->rol?->nombreRol,
            ],
        ]);
    }

    /**
     * Activa o desactiva una cuenta de administrador (en vez de borrarla).
     */
    public function cambiarEstado(Request $request, int $idUsuario): JsonResponse
    {
        $datos = $request->validate([
            'estaActivo' => ['required', 'boolean'],
        ]);

        $usuario = Usuario::findOrFail($idUsuario);
        $usuarioActual = $request->user();

        if ($usuarioActual && $usuarioActual->idUsuario === $usuario->idUsuario && ! $datos['estaActivo']) {
            return response()->json([
                'mensaje' => 'No puedes desactivar tu propia cuenta.',
            ], 422);
        }

        $usuario->estaActivo = $datos['estaActivo'];
        $usuario->save();

        if (! $datos['estaActivo']) {
            $usuario->tokens()->delete();
        }

        $usuario->load('rol');

        return response()->json([
            'mensaje' => $datos['estaActivo'] ? 'Cuenta activada.' : 'Cuenta desactivada.',
            'administrador' => [
                'idUsuario' => $usuario->idUsuario,
                'nombreUsuario' => $usuario->nombreUsuario,
                'apellidoPaternoUsuario' => $usuario->apellidoPaternoUsuario ?? '',
                'apellidoMaternoUsuario' => $usuario->apellidoMaternoUsuario ?? '',
                'nombreCompleto' => $usuario->nombre_completo,
                'correoUsuario' => $usuario->correoUsuario,
                'estaActivo' => $usuario->estaActivo,
                'rol' => $usuario->rol?->nombreRol,
            ],
        ]);
    }
}
