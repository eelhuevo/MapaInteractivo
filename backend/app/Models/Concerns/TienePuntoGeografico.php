<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Maneja columnas PostGIS geometry(Point, 4326):
 * expone latitud/longitud en las consultas y permite asignar
 * el punto a partir de coordenadas decimales.
 */
trait TienePuntoGeografico
{
    /**
     * Agrega los campos calculados "latitud" y "longitud" a la consulta.
     */
    public function scopeConLatitudLongitud(Builder $consulta, string $columnaGeometria): Builder
    {
        return $consulta
            ->addSelect($this->getTable().'.*')
            ->selectRaw('ST_Y("'.$columnaGeometria.'") AS latitud')
            ->selectRaw('ST_X("'.$columnaGeometria.'") AS longitud');
    }

    /**
     * Asigna un punto PostGIS a partir de latitud y longitud decimales.
     */
    public function asignarPunto(string $columnaGeometria, float $latitud, float $longitud): void
    {
        $this->attributes[$columnaGeometria] = DB::raw(
            "ST_SetSRID(ST_MakePoint($longitud, $latitud), 4326)"
        );
    }
}
