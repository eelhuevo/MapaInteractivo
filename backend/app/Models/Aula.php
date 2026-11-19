<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Aula extends Model
{
    protected $table = 'aulas';

    protected $primaryKey = 'idAula';

    public $timestamps = false;

    protected $fillable = ['idEspacio', 'numeroAula', 'capacidadAula'];

    public function espacio(): BelongsTo
    {
        return $this->belongsTo(Espacio::class, 'idEspacio', 'idEspacio');
    }
}
