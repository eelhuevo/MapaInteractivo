<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HorarioEspacio extends Model
{
    protected $table = 'horariosEspacio';

    protected $primaryKey = 'idHorario';

    public $timestamps = false;

    protected $fillable = ['idEspacio', 'diaSemana', 'horaApertura', 'horaCierre'];

    public function espacio(): BelongsTo
    {
        return $this->belongsTo(Espacio::class, 'idEspacio', 'idEspacio');
    }
}
