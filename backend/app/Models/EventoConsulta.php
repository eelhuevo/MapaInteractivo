<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventoConsulta extends Model
{
    protected $table = 'eventosConsulta';

    protected $primaryKey = 'idEventoConsulta';

    public $timestamps = false;

    const CREATED_AT = 'creadoEn';

    /** Tipos válidos: consulta, busqueda, ruta */
    public const TIPOS_EVENTO = ['consulta', 'busqueda', 'ruta'];

    protected $fillable = ['idEspacio', 'idUsuario', 'tipoEvento'];

    protected function casts(): array
    {
        return ['creadoEn' => 'datetime'];
    }

    public function espacio(): BelongsTo
    {
        return $this->belongsTo(Espacio::class, 'idEspacio', 'idEspacio');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'idUsuario', 'idUsuario');
    }

    /**
     * Registra un evento de consulta (HU-14). idUsuario es opcional
     * porque los visitantes consultan sin iniciar sesión.
     */
    public static function registrar(int $idEspacio, string $tipoEvento, ?int $idUsuario = null): void
    {
        if (! in_array($tipoEvento, self::TIPOS_EVENTO, true)) {
            return;
        }

        static::create([
            'idEspacio' => $idEspacio,
            'idUsuario' => $idUsuario,
            'tipoEvento' => $tipoEvento,
        ]);
    }
}
