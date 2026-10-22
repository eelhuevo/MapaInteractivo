<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Espacio;
use App\Models\EventoConsulta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RutaController extends Controller
{
    /** Velocidad peatonal promedio: 5 km/h ≈ 83.33 m/min. */
    private const METROS_POR_MINUTO_PEATONAL = 83.33;

    /**
     * HU-10 — Calcular y mostrar una ruta peatonal desde la ubicación
     * del usuario hasta un espacio del campus.
     *
     * Devuelve la geometría de la ruta en GeoJSON, la distancia en
     * metros y el tiempo estimado de caminata. Si existe la red de
     * vías peatonales (pgRouting, tabla viasCampus) se calcula sobre
     * la red; si no, se devuelve la línea recta como aproximación.
     */
    public function calcular(Request $request): JsonResponse
    {
        $datosValidados = $request->validate([
            'latitudOrigen' => ['required', 'numeric', 'between:-90,90'],
            'longitudOrigen' => ['required', 'numeric', 'between:-180,180'],
            'idEspacioDestino' => ['required', 'integer', 'exists:espacios,idEspacio'],
        ]);

        $espacioDestino = Espacio::activos()
            ->conLatitudLongitud('coordenadasEspacio')
            ->findOrFail($datosValidados['idEspacioDestino']);

        $latitudOrigen = (float) $datosValidados['latitudOrigen'];
        $longitudOrigen = (float) $datosValidados['longitudOrigen'];

        $resultadoRuta = $this->calcularRutaPeatonal(
            $latitudOrigen,
            $longitudOrigen,
            (float) $espacioDestino->latitud,
            (float) $espacioDestino->longitud
        );

        // HU-14: registrar el evento de tipo ruta
        EventoConsulta::registrar(
            $espacioDestino->idEspacio,
            'ruta',
            $request->user('sanctum')?->idUsuario
        );

        return response()->json([
            'destino' => [
                'idEspacio' => $espacioDestino->idEspacio,
                'nombreEspacio' => $espacioDestino->nombreEspacio,
                'latitud' => (float) $espacioDestino->latitud,
                'longitud' => (float) $espacioDestino->longitud,
            ],
            'distanciaMetros' => $resultadoRuta['distanciaMetros'],
            'duracionMinutos' => $resultadoRuta['duracionMinutos'],
            'tipoRuta' => $resultadoRuta['tipoRuta'],
            'rutaGeoJson' => $resultadoRuta['rutaGeoJson'],
        ]);
    }

    private function calcularRutaPeatonal(
        float $latitudOrigen,
        float $longitudOrigen,
        float $latitudDestino,
        float $longitudDestino
    ): array {
        $puntoOrigenWkt = "SRID=4326;POINT($longitudOrigen $latitudOrigen)";
        $puntoDestinoWkt = "SRID=4326;POINT($longitudDestino $latitudDestino)";

        // ¿Existe la red de vías peatonales cargada desde QGIS para pgRouting?
        $existeRedVial = DB::scalar(
            "SELECT to_regclass('public.viasCampus') IS NOT NULL"
        );

        if ($existeRedVial) {
            $rutaPorRed = $this->calcularConPgRouting($puntoOrigenWkt, $puntoDestinoWkt);

            if ($rutaPorRed !== null) {
                return $rutaPorRed;
            }
        }

        // Aproximación: línea recta entre origen y destino.
        $filaDistancia = DB::selectOne(
            'SELECT ST_DistanceSphere(
                ST_GeomFromEWKT(?),
                ST_GeomFromEWKT(?)
            ) AS distancia_metros',
            [$puntoOrigenWkt, $puntoDestinoWkt]
        );

        $distanciaMetros = round((float) $filaDistancia->distancia_metros, 2);

        return [
            'distanciaMetros' => $distanciaMetros,
            'duracionMinutos' => round($distanciaMetros / self::METROS_POR_MINUTO_PEATONAL, 1),
            'tipoRuta' => 'lineaRecta',
            'rutaGeoJson' => [
                'type' => 'Feature',
                'properties' => new \stdClass,
                'geometry' => [
                    'type' => 'LineString',
                    'coordinates' => [
                        [$longitudOrigen, $latitudOrigen],
                        [$longitudDestino, $latitudDestino],
                    ],
                ],
            ],
        ];
    }

    /**
     * Ruta sobre la red vial con pgRouting (pgr_dijkstra) usando los
     * vértices más cercanos al origen y al destino.
     */
    private function calcularConPgRouting(string $puntoOrigenWkt, string $puntoDestinoWkt): ?array
    {
        try {
            $filaRuta = DB::selectOne(
                'WITH origen AS (
                    SELECT id FROM "viasCampus_vertices_pgr"
                    ORDER BY the_geom <-> ST_GeomFromEWKT(?) LIMIT 1
                ),
                destino AS (
                    SELECT id FROM "viasCampus_vertices_pgr"
                    ORDER BY the_geom <-> ST_GeomFromEWKT(?) LIMIT 1
                ),
                ruta AS (
                    SELECT * FROM pgr_dijkstra(
                        \'SELECT id, source, target, cost, reverse_cost FROM "viasCampus"\',
                        (SELECT id FROM origen),
                        (SELECT id FROM destino),
                        directed := false
                    )
                )
                SELECT
                    SUM(v.length_m) AS distancia_metros,
                    ST_AsGeoJSON(ST_LineMerge(ST_Union(v.geom))) AS geojson_ruta
                FROM ruta
                JOIN "viasCampus" v ON v.id = ruta.edge',
                [$puntoOrigenWkt, $puntoDestinoWkt]
            );
        } catch (\Throwable) {
            return null;
        }

        if (! $filaRuta || $filaRuta->geojson_ruta === null) {
            return null;
        }

        $distanciaMetros = round((float) $filaRuta->distancia_metros, 2);

        return [
            'distanciaMetros' => $distanciaMetros,
            'duracionMinutos' => round($distanciaMetros / self::METROS_POR_MINUTO_PEATONAL, 1),
            'tipoRuta' => 'redPeatonal',
            'rutaGeoJson' => [
                'type' => 'Feature',
                'properties' => new \stdClass,
                'geometry' => json_decode($filaRuta->geojson_ruta),
            ],
        ];
    }
}
