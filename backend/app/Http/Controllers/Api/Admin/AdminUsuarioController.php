<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Docente;
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
            // Apellidos separados (3FN); si llegan vacios se divide el nombre
            'apellidoPaternoUsuario' => ['nullable', 'string', 'max:60'],
            'apellidoMaternoUsuario' => ['nullable', 'string', 'max:60'],
            'correoUsuario' => ['required', 'email', 'max:150', 'unique:usuarios,correoUsuario'],
            'contrasena' => ['required', 'string', 'min:8'],
            'nombreRol' => ['required', Rule::in(['estudiante', 'docente', 'administrador', 'personalAdministrativo'])],
            'idiomaPreferido' => ['nullable', Rule::in(['es', 'en'])],
            'idCarrera' => ['required_if:nombreRol,estudiante', 'nullable', 'integer', 'exists:carreras,idCarrera'],
            'semestreEstudiante' => ['required_if:nombreRol,estudiante', 'nullable', 'integer', 'min:1', 'max:15'],
            'departamentoDocente' => ['nullable', 'string', 'max:120'],
            'idEspacioOficina' => ['nullable', 'integer', 'exists:espacios,idEspacio'],
            'idMaterias' => ['nullable', 'array'],
            'idMaterias.*' => ['integer', 'exists:materias,idMateria'],
        ], [
            'correoUsuario.unique' => 'El correo ya está registrado.',
        ]);

        $rolUsuario = Rol::where('nombreRol', $datosValidados['nombreRol'])->firstOrFail();

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

        if ($datosValidados['nombreRol'] === 'estudiante') {
            Estudiante::create([
                'idUsuario' => $usuarioNuevo->idUsuario,
                'idCarrera' => $datosValidados['idCarrera'],
                'semestreEstudiante' => $datosValidados['semestreEstudiante'],
            ]);
        }

        if ($datosValidados['nombreRol'] === 'docente') {
            /* La fila de docente se crea siempre (aunque venga sin
               departamento): si no, el docente no apareceria en el
               listado del panel. */
            $docenteNuevo = Docente::firstOrCreate(['idUsuario' => $usuarioNuevo->idUsuario]);
            $docenteNuevo->departamentoDocente = $datosValidados['departamentoDocente'] ?? null;
            $docenteNuevo->idEspacioOficina = $datosValidados['idEspacioOficina'] ?? null;
            $docenteNuevo->save();

            if (array_key_exists('idMaterias', $datosValidados) && is_array($datosValidados['idMaterias'])) {
                /* El pivot exige semestreMateria (NOT NULL): 1 por omision */
                $vinculos = [];
                foreach ($datosValidados['idMaterias'] as $idMateria) {
                    $vinculos[(int) $idMateria] = ['semestreMateria' => 1];
                }
                $docenteNuevo->materias()->sync($vinculos);
            }
        }

        return response()->json([
            'mensaje' => 'Registro exitoso.',
            'usuario' => [
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
     * Lista de usuarios registrados (panel de administración).
     */
    public function index(): JsonResponse
    {
        $coleccionUsuarios = Usuario::with(['rol', 'docente', 'estudiante'])->orderBy('nombreUsuario')->get();

        return response()->json([
            'usuarios' => $coleccionUsuarios->map(fn (Usuario $usuario) => [
                'idUsuario' => $usuario->idUsuario,
                'nombreUsuario' => $usuario->nombreUsuario,
                'apellidoPaternoUsuario' => $usuario->apellidoPaternoUsuario ?? '',
                'apellidoMaternoUsuario' => $usuario->apellidoMaternoUsuario ?? '',
                'nombreCompleto' => $usuario->nombre_completo,
                'correoUsuario' => $usuario->correoUsuario,
                'idiomaPreferido' => $usuario->idiomaPreferido,
                'estaActivo' => $usuario->estaActivo,
                'rol' => $usuario->rol?->nombreRol,
                // Campos del rol, para precargar el modal de edicion
                'idCarrera' => $usuario->estudiante?->idCarrera,
                'semestreEstudiante' => $usuario->estudiante?->semestreEstudiante,
                'departamentoDocente' => $usuario->docente?->departamentoDocente,
                'creadoEn' => $usuario->creadoEn?->toDateTimeString(),
            ])->values(),
        ]);
    }

    /**
     * Edita un usuario desde el panel de administracion (HU-17).
     * Ademas de los datos personales actualiza los campos propios del
     * rol: carrera + semestre si es estudiante y departamento si es
     * docente (creando la fila si aun no existia).
     */
    public function update(Request $request, int $idUsuario): JsonResponse
    {
        $usuario = Usuario::findOrFail($idUsuario);

        $datos = $request->validate([
            'nombreUsuario' => ['required', 'string', 'max:120'],
            'apellidoPaternoUsuario' => ['nullable', 'string', 'max:60'],
            'apellidoMaternoUsuario' => ['nullable', 'string', 'max:60'],
            'correoUsuario' => ['required', 'email', 'max:150',
                Rule::unique('usuarios', 'correoUsuario')->ignore($idUsuario, 'idUsuario')],
            'contrasena' => ['nullable', 'string', 'min:8'],
            'nombreRol' => ['required', Rule::in(['estudiante', 'docente', 'administrador', 'personalAdministrativo'])],
            'idiomaPreferido' => ['nullable', Rule::in(['es', 'en'])],
            'idCarrera' => ['required_if:nombreRol,estudiante', 'nullable', 'integer', 'exists:carreras,idCarrera'],
            'semestreEstudiante' => ['required_if:nombreRol,estudiante', 'nullable', 'integer', 'min:1', 'max:15'],
            'departamentoDocente' => ['nullable', 'string', 'max:120'],
        ], [
            'correoUsuario.unique' => 'El correo ya esta registrado.',
        ]);

        $rol = Rol::where('nombreRol', $datos['nombreRol'])->firstOrFail();
        [$nombreReal, $paternoReal, $maternoReal] = Usuario::resolverNombre($datos);

        $usuario->idRol = $rol->idRol;
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

        if ($rol->nombreRol === 'estudiante') {
            Estudiante::updateOrCreate(
                ['idUsuario' => $usuario->idUsuario],
                ['idCarrera' => $datos['idCarrera'], 'semestreEstudiante' => $datos['semestreEstudiante']]
            );
        }

        if ($rol->nombreRol === 'docente') {
            $docente = Docente::firstOrCreate(['idUsuario' => $usuario->idUsuario]);
            $docente->departamentoDocente = $datos['departamentoDocente'] ?? $docente->departamentoDocente;
            $docente->save();
        }

        $usuario->load('rol');

        return response()->json([
            'mensaje' => 'Usuario actualizado.',
            'usuario' => $this->formaUsuario($usuario),
        ]);
    }

    /**
     * Activa o desactiva una cuenta (en vez de borrarla) para no
     * perder el historial de favoritos, avisos y estadisticas.
     * Una cuenta desactivada ya no puede iniciar sesion: ademas se
     * revocan sus tokens de API.
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
            'usuario' => $this->formaUsuario($usuario),
        ]);
    }

    /**
     * Forma comun de un usuario para las respuestas de edicion.
     */
    private function formaUsuario(Usuario $usuario): array
    {
        $usuario->loadMissing(['docente', 'estudiante']);

        return [
            'idUsuario' => $usuario->idUsuario,
            'nombreUsuario' => $usuario->nombreUsuario,
            'apellidoPaternoUsuario' => $usuario->apellidoPaternoUsuario ?? '',
            'apellidoMaternoUsuario' => $usuario->apellidoMaternoUsuario ?? '',
            'nombreCompleto' => $usuario->nombre_completo,
            'correoUsuario' => $usuario->correoUsuario,
            'idiomaPreferido' => $usuario->idiomaPreferido,
            'estaActivo' => $usuario->estaActivo,
            'rol' => $usuario->rol?->nombreRol,
            // Campos del rol, para precargar el modal de edicion
            'idCarrera' => $usuario->estudiante?->idCarrera,
            'semestreEstudiante' => $usuario->estudiante?->semestreEstudiante,
            'departamentoDocente' => $usuario->docente?->departamentoDocente,
        ];
    }
}
