<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Carrera;
use App\Models\Estudiante;
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
     * Permite ingresar nombre, correo, contraseña y rol.
     * El correo no debe estar previamente registrado.
     * Registro público: solo roles estudiante y docente.
     */
    public function registrar(Request $request): JsonResponse
    {
        $datosValidados = $request->validate([
            'nombreUsuario' => ['required', 'string', 'max:120'],
            'correoUsuario' => ['required', 'email', 'max:150', 'unique:usuarios,correoUsuario'],
            'contrasena' => ['required', 'string', 'min:8'],
            'nombreRol' => ['required', Rule::in(['estudiante', 'docente'])],
            // Opcionales: completan el perfil de estudiante (HU-20)
            'idCarrera' => ['required_if:nombreRol,estudiante', 'nullable', 'integer', 'exists:carreras,idCarrera'],
            'semestreEstudiante' => ['required_if:nombreRol,estudiante', 'nullable', 'integer', 'min:1', 'max:15'],
            'idiomaPreferido' => ['nullable', Rule::in(['es', 'en'])],
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
