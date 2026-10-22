<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EspacioMapaResource;
use App\Http\Resources\EspacioResource;
use App\Models\Espacio;
use App\Models\EventoConsulta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EspacioController extends Controller
{
    private const RELACIONES_MAPA = [
        'tipoEspacio',
        'categoriaServicio',
        'edificio',
        'piso',
        'horariosEspacio',
        'aula',
        'laboratorio.tipoLaboratorio',
    ];

    /**
     * HU-01 — Espacios activos con coordenadas para dibujar el mapa.
     * HU-02 — Filtro por categoría de servicio (idCategoriaServicio).
     * HU-19 — Filtro por tipo de laboratorio (idTipoLaboratorio).
     * Filtros adicionales: tipo de espacio, piso, edificio y disponibilidad.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'idCategoriaServicio' => ['nullable', 'integer', 'exists:categoriasServicio,idCategoriaServicio'],
            'idTipoEspacio' => ['nullable', 'integer', 'exists:tiposEspacio,idTipoEspacio'],
            'idTipoLaboratorio' => ['nullable', 'integer', 'exists:tiposLaboratorio,idTipoLaboratorio'],
            'idPiso' => ['nullable', 'integer', 'exists:pisos,idPiso'],
            'idEdificio' => ['nullable', 'integer', 'exists:edificios,idEdificio'],
            'disponible' => ['nullable', 'boolean'],
            'buscar' => ['nullable', 'string', 'max:150'],
        ]);

        $consultaEspacios = Espacio::query()
            ->activos()
            ->conLatitudLongitud('coordenadasEspacio')
            ->with(self::RELACIONES_MAPA);

        // HU-02: filtrar por categoría (caja, bienestar, secretaría, laboratorio…)
        $consultaEspacios->when(
            $request->integer('idCategoriaServicio'),
            fn ($consulta, int $idCategoriaServicio) => $consulta->where('idCategoriaServicio', $idCategoriaServicio)
        );

        // Filtro por tipo de espacio (aula, laboratorio, oficina, biblioteca…)
        $consultaEspacios->when(
            $request->integer('idTipoEspacio'),
            fn ($consulta, int $idTipoEspacio) => $consulta->where('idTipoEspacio', $idTipoEspacio)
        );

        // HU-19: filtrar por tipo de laboratorio (química, redes, física, sistemas…)
        $consultaEspacios->when(
            $request->integer('idTipoLaboratorio'),
            fn ($consulta, int $idTipoLaboratorio) => $consulta->whereHas(
                'laboratorio',
                fn ($consultaLaboratorio) => $consultaLaboratorio->where('idTipoLaboratorio', $idTipoLaboratorio)
            )
        );

        // Filtro por piso y por edificio
        $consultaEspacios->when(
            $request->integer('idPiso'),
            fn ($consulta, int $idPiso) => $consulta->where('idPiso', $idPiso)
        );

        $consultaEspacios->when(
            $request->integer('idEdificio'),
            fn ($consulta, int $idEdificio) => $consulta->where('idEdificio', $idEdificio)
        );

        // HU-05: búsqueda por nombre mientras se escribe
        $consultaEspacios->when(
            $request->filled('buscar'),
            fn ($consulta) => $consulta->buscarPorNombre((string) $request->string('buscar'))
        );

        $coleccionEspacios = $consultaEspacios->get();

        // Filtro por disponibilidad: solo espacios abiertos en este momento (HU-09)
        if ($request->boolean('disponible')) {
            $coleccionEspacios = $coleccionEspacios->filter->estaAbierto()->values();
        }

        return EspacioMapaResource::collection($coleccionEspacios);
    }

    /**
     * HU-03 — Ficha de información del espacio: nombre, edificio, piso,
     * horario y contacto. HU-09 — incluye el estado (abierto/cerrado).
     */
    public function show(Request $request, int $idEspacio): EspacioResource
    {
        $espacioEncontrado = Espacio::query()
            ->activos()
            ->conLatitudLongitud('coordenadasEspacio')
            ->with(array_merge(self::RELACIONES_MAPA, ['oficina', 'favoritos']))
            ->findOrFail($idEspacio);

        // HU-14: registrar el evento de consulta (usuario opcional)
        EventoConsulta::registrar(
            $idEspacio,
            'consulta',
            $request->user('sanctum')?->idUsuario
        );

        return new EspacioResource($espacioEncontrado);
    }

    /**
     * HU-09 — Consultar solo el estado de atención (abierto/cerrado),
     * derivado del horario registrado.
     */
    public function estado(int $idEspacio): JsonResponse
    {
        $espacioEncontrado = Espacio::query()
            ->activos()
            ->with('horariosEspacio')
            ->findOrFail($idEspacio);

        return response()->json([
            'idEspacio' => $espacioEncontrado->idEspacio,
            'nombreEspacio' => $espacioEncontrado->nombreEspacio,
            'estadoAtencion' => $espacioEncontrado->estadoAtencion,
            'consultadoEn' => now()->toDateTimeString(),
        ]);
    }
}
