<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Ficha completa de un espacio (HU-03): nombre, edificio, piso,
 * horario, contacto y estado de atención derivado (HU-09).
 */
class EspacioResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'idEspacio' => $this->idEspacio,
            'nombreEspacio' => $this->nombreEspacio,
            'descripcionEspacio' => $this->descripcionEspacio,
            'contactoEspacio' => $this->contactoEspacio,
            'latitud' => $this->latitud !== null ? (float) $this->latitud : null,
            'longitud' => $this->longitud !== null ? (float) $this->longitud : null,
            'estadoAtencion' => $this->estadoAtencion,
            'tipoEspacio' => $this->whenLoaded('tipoEspacio', fn () => [
                'idTipoEspacio' => $this->tipoEspacio->idTipoEspacio,
                'nombreTipoEspacio' => $this->tipoEspacio->nombreTipoEspacio,
            ]),
            'categoriaServicio' => $this->whenLoaded('categoriaServicio', fn () => $this->categoriaServicio ? [
                'idCategoriaServicio' => $this->categoriaServicio->idCategoriaServicio,
                'nombreCategoriaServicio' => $this->categoriaServicio->nombreCategoriaServicio,
            ] : null),
            'edificio' => $this->whenLoaded('edificio', fn () => [
                'idEdificio' => $this->edificio->idEdificio,
                'nombreEdificio' => $this->edificio->nombreEdificio,
                'codigoEdificio' => $this->edificio->codigoEdificio,
            ]),
            'piso' => $this->whenLoaded('piso', fn () => [
                'idPiso' => $this->piso->idPiso,
                'numeroPiso' => $this->piso->numeroPiso,
                'nombrePiso' => $this->piso->nombrePiso,
            ]),
            'horarios' => $this->whenLoaded('horariosEspacio', fn () => $this->horariosEspacio->map(fn ($horario) => [
                'idHorario' => $horario->idHorario,
                'diaSemana' => $horario->diaSemana,
                'horaApertura' => substr((string) $horario->horaApertura, 0, 5),
                'horaCierre' => substr((string) $horario->horaCierre, 0, 5),
            ])->values()),
            'aula' => $this->whenLoaded('aula', fn () => $this->aula ? [
                'idAula' => $this->aula->idAula,
                'numeroAula' => $this->aula->numeroAula,
                'capacidadAula' => $this->aula->capacidadAula,
            ] : null),
            'laboratorio' => $this->whenLoaded('laboratorio', fn () => $this->laboratorio ? [
                'idLaboratorio' => $this->laboratorio->idLaboratorio,
                'numeroLaboratorio' => $this->laboratorio->numeroLaboratorio,
                'tipoLaboratorio' => $this->laboratorio->tipoLaboratorio ? [
                    'idTipoLaboratorio' => $this->laboratorio->tipoLaboratorio->idTipoLaboratorio,
                    'nombreTipoLaboratorio' => $this->laboratorio->tipoLaboratorio->nombreTipoLaboratorio,
                ] : null,
            ] : null),
            'oficina' => $this->whenLoaded('oficina', fn () => $this->oficina ? [
                'idOficina' => $this->oficina->idOficina,
                'nombreOficina' => $this->oficina->nombreOficina,
                'responsableOficina' => $this->oficina->responsableOficina,
            ] : null),
            'esFavorito' => $this->when(
                $request->user('sanctum') !== null,
                fn () => $this->favoritos->contains('idUsuario', $request->user('sanctum')->idUsuario)
            ),
        ];
    }
}
