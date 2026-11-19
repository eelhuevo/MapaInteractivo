<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Carrera;
use App\Models\CategoriaServicio;
use App\Models\Rol;
use App\Models\TipoEspacio;
use App\Models\TipoLaboratorio;
use App\Models\Materia;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * CRUD de los catalogos simples del sistema desde el panel de
 * administracion: roles, materias, carreras, tipos de espacio,
 * categorias de servicio y tipos de laboratorio.
 *
 * Cada catalogo tiene su propia GET publica (ver CatalogoController y
 * RolController / MateriaController); aqui solo se dan de alta, se
 * editan y se eliminan. El borrado se protege: si la tabla referenciada
 * tiene registros (RESTRICT en la base de datos) se responde 409 con el
 * motivo en vez de un error 500.
 */
class AdminCatalogoController extends Controller
{
    /**
     * Configuracion por entidad:
     *  - modelo/clave/campo: tabla, columna primaria y columna de nombre
     *  - descripcion: columna de observacion opcional (solo roles)
     *  - bloqueo: tablas que impiden el borrado (tabla, columna, motivo)
     */
    private const CATALOGOS = [
        'roles' => [
            'modelo' => Rol::class,
            'clave' => 'idRol',
            'campo' => 'nombreRol',
            'descripcion' => 'descripcionRol',
            'bloqueo' => [
                ['tabla' => 'usuarios', 'columna' => 'idRol', 'motivo' => 'Hay usuarios con este rol.'],
            ],
        ],
        'materias' => [
            'modelo' => Materia::class,
            'clave' => 'idMateria',
            'campo' => 'nombreMateria',
            'descripcion' => null,
            'bloqueo' => [],
        ],
        'carreras' => [
            'modelo' => Carrera::class,
            'clave' => 'idCarrera',
            'campo' => 'nombreCarrera',
            'descripcion' => null,
            'bloqueo' => [
                ['tabla' => 'estudiantes', 'columna' => 'idCarrera', 'motivo' => 'Hay estudiantes inscritos en esta carrera.'],
            ],
        ],
        'tipos-espacio' => [
            'modelo' => TipoEspacio::class,
            'clave' => 'idTipoEspacio',
            'campo' => 'nombreTipoEspacio',
            'descripcion' => null,
            'bloqueo' => [
                ['tabla' => 'espacios', 'columna' => 'idTipoEspacio', 'motivo' => 'Hay espacios de este tipo.'],
            ],
        ],
        'categorias-servicio' => [
            'modelo' => CategoriaServicio::class,
            'clave' => 'idCategoriaServicio',
            'campo' => 'nombreCategoriaServicio',
            'descripcion' => null,
            'bloqueo' => [],
        ],
        'tipos-laboratorio' => [
            'modelo' => TipoLaboratorio::class,
            'clave' => 'idTipoLaboratorio',
            'campo' => 'nombreTipoLaboratorio',
            'descripcion' => null,
            'bloqueo' => [
                ['tabla' => 'laboratorios', 'columna' => 'idTipoLaboratorio', 'motivo' => 'Hay laboratorios de este tipo.'],
            ],
        ],
    ];

    /** Configuracion de la entidad pedida (o null si no existe). */
    private function configuracion(string $entidad): ?array
    {
        return self::CATALOGOS[$entidad] ?? null;
    }

    /**
     * Listado de materias para el panel: a diferencia de la GET publica
     * (/api/materias) incluye tambien los docentes desactivados, para
     * que al guardar no se pierdan los vinculos existentes.
     */
    public function materias(): JsonResponse
    {
        $materias = Materia::query()
            ->with(['docentes.usuario'])
            ->orderBy('nombreMateria')
            ->get()
            ->map(fn (Materia $materia) => [
                'idMateria' => $materia->idMateria,
                'nombreMateria' => $materia->nombreMateria,
                'docentes' => $materia->docentes->map(fn ($docente) => [
                    'idDocente' => $docente->idDocente,
                    'nombreCompleto' => $docente->usuario?->nombreCompleto,
                    'estaActivo' => (bool) ($docente->usuario?->estaActivo ?? false),
                ])->values(),
                'idDocentes' => $materia->docentes->pluck('idDocente')->values(),
            ]);

        return response()->json(['materias' => $materias]);
    }

    /** Alta en el catalogo. */
    public function store(Request $request, string $entidad): JsonResponse
    {
        $config = $this->configuracion($entidad);
        if (! $config) {
            return response()->json(['mensaje' => 'Catalogo desconocido.'], 404);
        }

        $tabla = $config['modelo']::query()->getTable();
        $reglas = [
            $config['campo'] => ['required', 'string', 'max:120',
                Rule::unique($tabla, $config['campo'])],
        ];
        if ($config['descripcion']) {
            $reglas[$config['descripcion']] = ['nullable', 'string', 'max:255'];
        }
        /* Materias: al crear ya se pueden asignar los docentes que la
           imparten (mismo formato que en update) */
        $vinculosDocentes = null;
        if ($entidad === 'materias') {
            $reglas['idDocentes'] = ['nullable', 'array'];
            $reglas['idDocentes.*'] = ['integer', 'exists:docentes,idDocente'];
        }

        $datos = $request->validate($reglas);

        if ($entidad === 'materias') {
            $vinculosDocentes = [];
            foreach ($datos['idDocentes'] ?? [] as $idDocente) {
                $vinculosDocentes[(int) $idDocente] = ['semestreMateria' => 1];
            }
            unset($datos['idDocentes']);
        }

        $registro = $config['modelo']::create($datos);

        if ($vinculosDocentes !== null) {
            /** @var Materia $registro */
            $registro->docentes()->sync($vinculosDocentes);
        }

        return response()->json([
            'mensaje' => 'Registro creado.',
            'registro' => $registro,
        ], 201);
    }

    /** Edicion de un registro del catalogo. */
    public function update(Request $request, string $entidad, int $id): JsonResponse
    {
        $config = $this->configuracion($entidad);
        if (! $config) {
            return response()->json(['mensaje' => 'Catalogo desconocido.'], 404);
        }

        /** @var Model $registro */
        $registro = $config['modelo']::query()->findOrFail($id);

        $tabla = $registro->getTable();
        $reglas = [
            $config['campo'] => ['required', 'string', 'max:120',
                Rule::unique($tabla, $config['campo'])->ignore($id, $config['clave'])],
        ];
        if ($config['descripcion']) {
            $reglas[$config['descripcion']] = ['nullable', 'string', 'max:255'];
        }
        /* Materias: tambien se actualiza que docentes la imparten */
        if ($entidad === 'materias') {
            $reglas['idDocentes'] = ['nullable', 'array'];
            $reglas['idDocentes.*'] = ['integer', 'exists:docentes,idDocente'];
        }

        $datos = $request->validate($reglas);

        if ($entidad === 'materias' && array_key_exists('idDocentes', $datos)) {
            $vinculos = [];
            foreach ($datos['idDocentes'] ?? [] as $idDocente) {
                $vinculos[(int) $idDocente] = ['semestreMateria' => 1];
            }
            /** @var Materia $registro */
            $registro->docentes()->sync($vinculos);
            unset($datos['idDocentes']);
        }

        $registro->fill($datos);
        $registro->save();

        return response()->json([
            'mensaje' => 'Registro actualizado.',
            'registro' => $registro,
        ]);
    }

    /**
     * Borrado definitivo (los catalogos no tienen columna de estado).
     * Si otra tabla lo referencia se responde 409 con el motivo.
     */
    public function destroy(string $entidad, int $id): JsonResponse
    {
        $config = $this->configuracion($entidad);
        if (! $config) {
            return response()->json(['mensaje' => 'Catalogo desconocido.'], 404);
        }

        foreach ($config['bloqueo'] as $referencia) {
            $enUso = (int) DB::table($referencia['tabla'])
                ->where($referencia['columna'], $id)
                ->count();

            if ($enUso > 0) {
                return response()->json([
                    'mensaje' => $referencia['motivo'].' No se puede eliminar ('.$enUso.' registro(s)).',
                ], 409);
            }
        }

        try {
            /** @var Model $registro */
            $registro = $config['modelo']::query()->findOrFail($id);
            $registro->delete();
        } catch (QueryException) {
            return response()->json([
                'mensaje' => 'No se puede eliminar: otros registros lo usan.',
            ], 409);
        }

        return response()->json(['mensaje' => 'Registro eliminado.']);
    }
}
