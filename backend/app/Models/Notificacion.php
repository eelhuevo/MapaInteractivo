<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notificacion extends Model
{
    protected $table = 'notificaciones';

    protected $primaryKey = 'idNotificacion';

    public $timestamps = false;

    const CREATED_AT = 'creadoEn';

    protected $fillable = [
        'idUsuario',
        'idEspacio',
        'mensajeNotificacion',
        'tipoCambio',
        'estaLeida',
    ];

    protected function casts(): array
    {
        return [
            'estaLeida' => 'boolean',
            'creadoEn' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'idUsuario', 'idUsuario');
    }

    public function espacio(): BelongsTo
    {
        return $this->belongsTo(Espacio::class, 'idEspacio', 'idEspacio');
    }
}
