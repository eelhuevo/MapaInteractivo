<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Turno de atencion de un docente (dia + rango "HH:MM:SS").
 * Tabla horariosDocente, creada por la migracion
 * 2026_11_02_000001_create_horarios_docente_table.
 */
class HorarioDocente extends Model
{
    protected $table = 'horariosDocente';

    protected $primaryKey = 'idHorarioDocente';

    public $timestamps = false;

    protected $fillable = ['idDocente', 'diaSemana', 'horaInicio', 'horaFin'];

    public function docente(): BelongsTo
    {
        return $this->belongsTo(Docente::class, 'idDocente', 'idDocente');
    }
}
