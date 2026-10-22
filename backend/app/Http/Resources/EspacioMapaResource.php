<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Versión ligera de un espacio para dibujar marcadores en el mapa (HU-01).
 */
class EspacioMapaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'idEspacio' => $this->idEspacio,
            'nombreEspacio' => $this->nombreEspacio,
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
            'laboratorio' => $this->whenLoaded('laboratorio', fn () => $this->laboratorio ? [
                'idLaboratorio' => $this->laboratorio->idLaboratorio,
                'numeroLaboratorio' => $this->laboratorio->numeroLaboratorio,
                'tipoLaboratorio' => $this->laboratorio->tipoLaboratorio ? [
                    'idTipoLaboratorio' => $this->laboratorio->tipoLaboratorio->idTipoLaboratorio,
                    'nombreTipoLaboratorio' => $this->laboratorio->tipoLaboratorio->nombreTipoLaboratorio,
                ] : null,
            ] : null),
            'aula' => $this->whenLoaded('aula', fn () => $this->aula ? [
                'idAula' => $this->aula->idAula,
                'numeroAula' => $this->aula->numeroAula,
            ] : null),
        ];
    }
}
