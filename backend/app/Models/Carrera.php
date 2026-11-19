<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Carrera extends Model
{
    protected $table = 'carreras';

    protected $primaryKey = 'idCarrera';

    public $timestamps = false;

    protected $fillable = ['nombreCarrera'];

    public function estudiantes(): HasMany
    {
        return $this->hasMany(Estudiante::class, 'idCarrera', 'idCarrera');
    }

    public function sugerenciasEspacio(): HasMany
    {
        return $this->hasMany(SugerenciaEspacio::class, 'idCarrera', 'idCarrera');
    }
}
