<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoEspacio extends Model
{
    protected $table = 'tiposEspacio';

    protected $primaryKey = 'idTipoEspacio';

    public $timestamps = false;

    protected $fillable = ['nombreTipoEspacio'];

    public function espacios(): HasMany
    {
        return $this->hasMany(Espacio::class, 'idTipoEspacio', 'idTipoEspacio');
    }
}
