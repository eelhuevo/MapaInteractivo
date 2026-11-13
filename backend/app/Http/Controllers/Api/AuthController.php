<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    /**
     * HU-17 — Registrar usuario.
     * Permite ingresar nombre, correo y contraseña.
     * El correo no debe estar previamente registrado.
     * Registro público: se asigna automáticamente el rol 'personal'
     * (nunca se permite elegir administrador ni ningún otro rol).
     */
    public function registrar(Request $request): JsonResponse
    {
        $datosValidados = $request->validate([
            'nombreUsuario' => ['required', 'string', 'max:120'],
            // Apellidos separados (3FN); si llegan vacios el backend
            // divide el nombre completo (nombreUsuario) automaticamente
            'apellidoPaternoUsuario' => ['nullable', 'string', 'max:60'],
            'apellidoMaternoUsuario' => ['nullable', 'string', 'max:60'],
            'correoUsuario' => ['required', 'email', 'max:150', 'unique:usuarios,correoUsuario'],
            'contrasena' => ['required', 'string', 'min:8'],
            'idiomaPreferido' => ['nullable', Rule::in(['es', 'en'])],
        ], [
            'correoUsuario.unique' => 'El correo ya está registrado.',
        ]);

        /* Rol fijo para todo registro público: nunca se elige desde el formulario. */
        $rolUsuario = Rol::where('nombreRol', 'personal')->firstOrFail();

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

        $tokenAcceso = $usuarioNuevo->createToken('token-mapa')->plainTextToken;

        return response()->json([
            'mensaje' => 'Registro exitoso.',
            'usuario' => $this->formatearUsuario($usuarioNuevo),
            'tokenAcceso' => $tokenAcceso,
        ], 201);
    }

    /**
     * HU-16 — Iniciar sesión con correo y contraseña.
     * Muestra mensaje de error si los datos son incorrectos.
     */
    public function iniciarSesion(Request $request): JsonResponse
    {
        $datosValidados = $request->validate([
            'correoUsuario' => ['required', 'email'],
            'contrasena' => ['required', 'string'],
        ]);

        $usuarioEncontrado = Usuario::where('correoUsuario', $datosValidados['correoUsuario'])->first();

        if (! $usuarioEncontrado || ! Hash::check($datosValidados['contrasena'], $usuarioEncontrado->contrasenaHash)) {
            return response()->json([
                'mensaje' => 'Correo o contraseña incorrectos.',
            ], 401);
        }

        if (! $usuarioEncontrado->estaActivo) {
            return response()->json([
                'mensaje' => 'Tu cuenta está desactivada. Contacta al administrador.',
            ], 403);
        }

        $tokenAcceso = $usuarioEncontrado->createToken('token-mapa')->plainTextToken;

        return response()->json([
            'mensaje' => 'Inicio de sesión exitoso.',
            'usuario' => $this->formatearUsuario($usuarioEncontrado),
            'tokenAcceso' => $tokenAcceso,
        ]);
    }

    /**
     * Cerrar sesión: revoca el token actual.
     */
    public function cerrarSesion(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['mensaje' => 'Sesión cerrada correctamente.']);
    }

    /**
     * Perfil del usuario autenticado.
     */
    public function perfil(Request $request): JsonResponse
    {
        return response()->json([
            'usuario' => $this->formatearUsuario($request->user()),
        ]);
    }

    /**
     * HU-15 — Cambiar el idioma del sistema (español / inglés).
     */
    public function actualizarIdioma(Request $request): JsonResponse
    {
        $datosValidados = $request->validate([
            'idiomaPreferido' => ['required', Rule::in(['es', 'en'])],
        ]);

        $usuarioAutenticado = $request->user();
        $usuarioAutenticado->idiomaPreferido = $datosValidados['idiomaPreferido'];
        $usuarioAutenticado->save();

        return response()->json([
            'mensaje' => 'Idioma actualizado correctamente.',
            'idiomaPreferido' => $usuarioAutenticado->idiomaPreferido,
        ]);
    }

    private function formatearUsuario(Usuario $usuario): array
    {
        $usuario->loadMissing(['rol', 'estudiante.carrera', 'docente']);

        return [
            'idUsuario' => $usuario->idUsuario,
            'nombreUsuario' => $usuario->nombreUsuario,
            'apellidoPaternoUsuario' => $usuario->apellidoPaternoUsuario ?? '',
            'apellidoMaternoUsuario' => $usuario->apellidoMaternoUsuario ?? '',
            'nombreCompleto' => $usuario->nombre_completo,
            'correoUsuario' => $usuario->correoUsuario,
            'idiomaPreferido' => $usuario->idiomaPreferido,
            'rol' => $usuario->rol?->nombreRol,
            'estudiante' => $usuario->estudiante ? [
                'idEstudiante' => $usuario->estudiante->idEstudiante,
                'semestreEstudiante' => $usuario->estudiante->semestreEstudiante,
                'carrera' => $usuario->estudiante->carrera ? [
                    'idCarrera' => $usuario->estudiante->carrera->idCarrera,
                    'nombreCarrera' => $usuario->estudiante->carrera->nombreCarrera,
                ] : null,
            ] : null,
            'docente' => $usuario->docente ? [
                'idDocente' => $usuario->docente->idDocente,
                'departamentoDocente' => $usuario->docente->departamentoDocente,
            ] : null,
        ];
    }
}
