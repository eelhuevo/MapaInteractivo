<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoLaboratorio extends Model
{
    protected $table = 'tiposLaboratorio';

    protected $primaryKey = 'idTipoLaboratorio';

    public $timestamps = false;

    protected $fillable = ['nombreTipoLaboratorio'];

    public function laboratorios(): HasMany
    {
        return $this->hasMany(Laboratorio::class, 'idTipoLaboratorio', 'idTipoLaboratorio');
    }
}
