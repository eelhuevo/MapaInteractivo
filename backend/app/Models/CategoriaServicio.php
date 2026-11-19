<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CategoriaServicio extends Model
{
    protected $table = 'categoriasServicio';

    protected $primaryKey = 'idCategoriaServicio';

    public $timestamps = false;

    protected $fillable = ['nombreCategoriaServicio'];

    public function espacios(): HasMany
    {
        return $this->hasMany(Espacio::class, 'idCategoriaServicio', 'idCategoriaServicio');
    }
}
