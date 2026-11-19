<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Estudiante extends Model
{
    protected $table = 'estudiantes';

    protected $primaryKey = 'idEstudiante';

    public $timestamps = false;

    protected $fillable = ['idUsuario', 'idCarrera', 'semestreEstudiante'];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'idUsuario', 'idUsuario');
    }

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class, 'idCarrera', 'idCarrera');
    }
}
