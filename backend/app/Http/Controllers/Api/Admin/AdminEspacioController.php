<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\EspacioResource;
use App\Models\Espacio;
use App\Models\Favorito;
use App\Models\HorarioEspacio;
use App\Models\Notificacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminEspacioController extends Controller
{
    private const RELACIONES_FICHA = [
        'tipoEspacio',
        'categoriaServicio',
        'edificio',
        'piso',
        'horariosEspacio',
        'aula',
        'laboratorio.tipoLaboratorio',
        'oficina',
        'favoritos',
    ];

    /**
     * HU-06 — Crear una oficina o servicio del mapa.
     * Solo usuarios autorizados (middleware rol). El cambio se
     * refleja inmediatamente porque el mapa lee la misma tabla.
     */
    public function store(Request $request): JsonResponse
    {
        $datosValidados = $this->validarDatosEspacio($request);

        $espacioCreado = DB::transaction(function () use ($datosValidados) {
            $espacioNuevo = new Espacio($datosValidados['espacio']);
            $espacioNuevo->asignarPunto(
                'coordenadasEspacio',
                $datosValidados['espacio']['latitud'],
                $datosValidados['espacio']['longitud']
            );
            $espacioNuevo->save();

            $this->guardarHorarios($espacioNuevo, $datosValidados['horarios']);
            $this->guardarSubtipo($espacioNuevo, $datosValidados['subtipo']);

            return $espacioNuevo;
        });

        return response()->json([
            'mensaje' => 'Espacio creado correctamente.',
            'espacio' => new EspacioResource($this->cargarFicha($espacioCreado->idEspacio)),
        ], 201);
    }

    /**
     * HU-06 — Modificar un espacio. HU-13 — si cambia la ubicación,
     * el horario o el contacto, se notifica a los usuarios que lo
     * tienen marcado como favorito.
     */
    public function update(Request $request, int $idEspacio): JsonResponse
    {
        $espacioEncontrado = Espacio::with('horariosEspacio')->findOrFail($idEspacio);

        $datosValidados = $this->validarDatosEspacio($request, esActualizacion: true);

        $tiposCambioDetectados = [];

        DB::transaction(function () use ($espacioEncontrado, $datosValidados, &$tiposCambioDetectados) {
            $datosEspacio = $datosValidados['espacio'];

            // Detectar cambio de contacto (HU-13)
            if (array_key_exists('contactoEspacio', $datosEspacio)
                && $datosEspacio['contactoEspacio'] !== $espacioEncontrado->contactoEspacio) {
                $tiposCambioDetectados[] = 'contacto';
            }

            // Detectar cambio de ubicación: coordenadas, edificio o piso (HU-13)
            $cambianCoordenadas = isset($datosEspacio['latitud'], $datosEspacio['longitud']);
            $cambiaUbicacionFisica = (array_key_exists('idEdificio', $datosEspacio) && (int) $datosEspacio['idEdificio'] !== (int) $espacioEncontrado->idEdificio)
                || (array_key_exists('idPiso', $datosEspacio) && (int) $datosEspacio['idPiso'] !== (int) $espacioEncontrado->idPiso);

            if ($cambianCoordenadas || $cambiaUbicacionFisica) {
                $tiposCambioDetectados[] = 'ubicacion';
            }

            $espacioEncontrado->fill(collect($datosEspacio)->except(['latitud', 'longitud'])->toArray());

            if ($cambianCoordenadas) {
                $espacioEncontrado->asignarPunto(
                    'coordenadasEspacio',
                    (float) $datosEspacio['latitud'],
                    (float) $datosEspacio['longitud']
                );
            }

            $espacioEncontrado->save();

            // Detectar cambio de horarios (HU-13)
            if ($datosValidados['horarios'] !== null) {
                $horariosAnteriores = $espacioEncontrado->horariosEspacio
                    ->map(fn ($horario) => $horario->diaSemana.' '.substr((string) $horario->horaApertura, 0, 5).'-'.substr((string) $horario->horaCierre, 0, 5))
                    ->sort()->values()->toArray();

                $horariosNuevos = collect($datosValidados['horarios'])
                    ->map(fn ($horario) => $horario['diaSemana'].' '.$horario['horaApertura'].'-'.$horario['horaCierre'])
                    ->sort()->values()->toArray();

                if ($horariosAnteriores !== $horariosNuevos) {
                    $tiposCambioDetectados[] = 'horario';
                }

                $espacioEncontrado->horariosEspacio()->delete();
                $this->guardarHorarios($espacioEncontrado, $datosValidados['horarios']);
            }

            $this->guardarSubtipo($espacioEncontrado, $datosValidados['subtipo']);
        });

        $this->notificarUsuariosInteresados($espacioEncontrado, array_unique($tiposCambioDetectados));

        return response()->json([
            'mensaje' => 'Espacio actualizado correctamente.',
            'espacio' => new EspacioResource($this->cargarFicha($espacioEncontrado->idEspacio)),
        ]);
    }

    /**
     * HU-06 — Eliminar una oficina o servicio del mapa.
     */
    public function destroy(int $idEspacio): JsonResponse
    {
        $espacioEncontrado = Espacio::findOrFail($idEspacio);
        $nombreEspacioEliminado = $espacioEncontrado->nombreEspacio;
        $espacioEncontrado->delete();

        return response()->json([
            'mensaje' => "El espacio «{$nombreEspacioEliminado}» fue eliminado del mapa.",
        ]);
    }

    /*
    |----------------------------------------------------------------------
    | Helpers internos
    |----------------------------------------------------------------------
    */

    private function validarDatosEspacio(Request $request, bool $esActualizacion = false): array
    {
        $reglaRequerido = $esActualizacion ? 'sometimes' : 'required';

        $datosValidados = $request->validate([
            'idEdificio' => [$reglaRequerido, 'integer', 'exists:edificios,idEdificio'],
            'idPiso' => [$reglaRequerido, 'integer', 'exists:pisos,idPiso'],
            'idTipoEspacio' => [$reglaRequerido, 'integer', 'exists:tiposEspacio,idTipoEspacio'],
            'idCategoriaServicio' => ['nullable', 'integer', 'exists:categoriasServicio,idCategoriaServicio'],
            'nombreEspacio' => [$reglaRequerido, 'string', 'max:150'],
            'descripcionEspacio' => ['nullable', 'string'],
            'contactoEspacio' => ['nullable', 'string', 'max:150'],
            'latitud' => [$reglaRequerido, 'numeric', 'between:-90,90'],
            'longitud' => [$reglaRequerido, 'numeric', 'between:-180,180'],
            'estaActivo' => ['nullable', 'boolean'],
            // Horarios del espacio (se reemplazan completos si se envían)
            'horarios' => ['nullable', 'array'],
            'horarios.*.diaSemana' => ['required_with:horarios', Rule::in(array_values(Espacio::DIAS_SEMANA))],
            'horarios.*.horaApertura' => ['required_with:horarios', 'date_format:H:i'],
            'horarios.*.horaCierre' => ['required_with:horarios', 'date_format:H:i', 'after:horarios.*.horaApertura'],
            // Subtipos
            'aula' => ['nullable', 'array'],
            'aula.numeroAula' => ['required_with:aula', 'string', 'max:20'],
            'aula.capacidadAula' => ['nullable', 'integer', 'min:1'],
            'laboratorio' => ['nullable', 'array'],
            'laboratorio.numeroLaboratorio' => ['required_with:laboratorio', 'string', 'max:20'],
            'laboratorio.idTipoLaboratorio' => ['required_with:laboratorio', 'integer', 'exists:tiposLaboratorio,idTipoLaboratorio'],
            'oficina' => ['nullable', 'array'],
            'oficina.nombreOficina' => ['required_with:oficina', 'string', 'max:120'],
            'oficina.responsableOficina' => ['nullable', 'string', 'max:120'],
        ]);

        return [
            'espacio' => collect($datosValidados)->except(['horarios', 'aula', 'laboratorio', 'oficina'])->toArray(),
            'horarios' => $datosValidados['horarios'] ?? null,
            'subtipo' => [
                'aula' => $datosValidados['aula'] ?? null,
                'laboratorio' => $datosValidados['laboratorio'] ?? null,
                'oficina' => $datosValidados['oficina'] ?? null,
            ],
        ];
    }

    private function guardarHorarios(Espacio $espacio, ?array $horarios): void
    {
        if ($horarios === null) {
            return;
        }

        foreach ($horarios as $datosHorario) {
            HorarioEspacio::create([
                'idEspacio' => $espacio->idEspacio,
                'diaSemana' => $datosHorario['diaSemana'],
                'horaApertura' => $datosHorario['horaApertura'],
                'horaCierre' => $datosHorario['horaCierre'],
            ]);
        }
    }

    private function guardarSubtipo(Espacio $espacio, array $subtipo): void
    {
        if ($subtipo['aula'] !== null) {
            $espacio->aula()->updateOrCreate(['idEspacio' => $espacio->idEspacio], $subtipo['aula']);
        }

        if ($subtipo['laboratorio'] !== null) {
            $espacio->laboratorio()->updateOrCreate(['idEspacio' => $espacio->idEspacio], $subtipo['laboratorio']);
        }

        if ($subtipo['oficina'] !== null) {
            $espacio->oficina()->updateOrCreate(['idEspacio' => $espacio->idEspacio], $subtipo['oficina']);
        }
    }

    /**
     * HU-13 — Crea notificaciones para los usuarios que tienen el
     * espacio en favoritos cuando cambia ubicación, horario o contacto.
     */
    private function notificarUsuariosInteresados(Espacio $espacio, array $tiposCambio): void
    {
        if (empty($tiposCambio)) {
            return;
        }

        $etiquetasCambio = [
            'ubicacion' => 'cambió de ubicación',
            'horario' => 'actualizó su horario de atención',
            'contacto' => 'actualizó sus datos de contacto',
        ];

        $idsUsuariosInteresados = Favorito::where('idEspacio', $espacio->idEspacio)->pluck('idUsuario');

        foreach ($idsUsuariosInteresados as $idUsuarioInteresado) {
            foreach ($tiposCambio as $tipoCambio) {
                Notificacion::create([
                    'idUsuario' => $idUsuarioInteresado,
                    'idEspacio' => $espacio->idEspacio,
                    'mensajeNotificacion' => "«{$espacio->nombreEspacio}» {$etiquetasCambio[$tipoCambio]}.",
                    'tipoCambio' => $tipoCambio,
                ]);
            }
        }
    }

    private function cargarFicha(int $idEspacio): Espacio
    {
        return Espacio::query()
            ->conLatitudLongitud('coordenadasEspacio')
            ->with(self::RELACIONES_FICHA)
            ->findOrFail($idEspacio);
    }
}
