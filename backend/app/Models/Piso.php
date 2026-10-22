<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Piso extends Model
{
    protected $table = 'pisos';

    protected $primaryKey = 'idPiso';

    public $timestamps = false;

    protected $fillable = ['idEdificio', 'numeroPiso', 'nombrePiso'];

    public function edificio(): BelongsTo
    {
        return $this->belongsTo(Edificio::class, 'idEdificio', 'idEdificio');
    }

    public function espacios(): HasMany
    {
        return $this->hasMany(Espacio::class, 'idPiso', 'idPiso');
    }
}
