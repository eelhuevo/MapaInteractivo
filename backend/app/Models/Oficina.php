<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Oficina extends Model
{
    protected $table = 'oficinas';

    protected $primaryKey = 'idOficina';

    public $timestamps = false;

    protected $fillable = ['idEspacio', 'nombreOficina', 'responsableOficina'];

    public function espacio(): BelongsTo
    {
        return $this->belongsTo(Espacio::class, 'idEspacio', 'idEspacio');
    }
}
