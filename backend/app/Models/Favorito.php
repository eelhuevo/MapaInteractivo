<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Favorito extends Model
{
    protected $table = 'favoritos';

    protected $primaryKey = 'idFavorito';

    public $timestamps = false;

    const CREATED_AT = 'creadoEn';

    protected $fillable = ['idUsuario', 'idEspacio'];

    protected function casts(): array
    {
        return ['creadoEn' => 'datetime'];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'idUsuario', 'idUsuario');
    }

    public function espacio(): BelongsTo
    {
        return $this->belongsTo(Espacio::class, 'idEspacio', 'idEspacio');
    }
}
