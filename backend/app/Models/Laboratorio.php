<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Laboratorio extends Model
{
    protected $table = 'laboratorios';

    protected $primaryKey = 'idLaboratorio';

    public $timestamps = false;

    protected $fillable = ['idEspacio', 'idTipoLaboratorio', 'numeroLaboratorio'];

    public function espacio(): BelongsTo
    {
        return $this->belongsTo(Espacio::class, 'idEspacio', 'idEspacio');
    }

    public function tipoLaboratorio(): BelongsTo
    {
        return $this->belongsTo(TipoLaboratorio::class, 'idTipoLaboratorio', 'idTipoLaboratorio');
    }
}
