<?php

namespace App\Models;

use App\Models\Concerns\TienePuntoGeografico;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Zona extends Model
{
    use TienePuntoGeografico;

    protected $table = 'zonas';

    protected $primaryKey = 'idZona';

    public $timestamps = false;

    protected $fillable = ['nombreZona', 'tipoZona'];

    protected $hidden = ['coordenadasZona'];

    public function edificios(): HasMany
    {
        return $this->hasMany(Edificio::class, 'idZona', 'idZona');
    }
}
