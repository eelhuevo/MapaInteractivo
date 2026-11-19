<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SugerenciaEspacio extends Model
{
    protected $table = 'sugerenciasEspacio';

    protected $primaryKey = 'idSugerencia';

    public $timestamps = false;

    protected $fillable = ['idCarrera', 'semestreObjetivo', 'idEspacio'];

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class, 'idCarrera', 'idCarrera');
    }

    public function espacio(): BelongsTo
    {
        return $this->belongsTo(Espacio::class, 'idEspacio', 'idEspacio');
    }
}
