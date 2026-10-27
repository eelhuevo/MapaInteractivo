<?php

namespace App\Models;

use App\Models\Concerns\TienePuntoGeografico;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Edificio extends Model
{
    use TienePuntoGeografico;

    protected $table = 'edificios';

    protected $primaryKey = 'idEdificio';

    public $timestamps = false;

    protected $fillable = [
        'idZona',
        'nombreEdificio',
        'codigoEdificio',
        'descripcionEdificio',
    ];

    protected $hidden = ['coordenadasEdificio'];

    public function zona(): BelongsTo
    {
        return $this->belongsTo(Zona::class, 'idZona', 'idZona');
    }

    public function pisos(): HasMany
    {
        return $this->hasMany(Piso::class, 'idEdificio', 'idEdificio')->orderBy('numeroPiso');
    }

    public function espacios(): HasMany
    {
        return $this->hasMany(Espacio::class, 'idEdificio', 'idEdificio');
    }

    public function codigosQr(): HasMany
    {
        return $this->hasMany(CodigoQr::class, 'idEdificio', 'idEdificio');
    }
}
