<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Materia extends Model
{
    protected $table = 'materias';

    protected $primaryKey = 'idMateria';

    public $timestamps = false;

    protected $fillable = ['nombreMateria'];

    public function docentes(): BelongsToMany
    {
        return $this->belongsToMany(Docente::class, 'docenteMaterias', 'idMateria', 'idDocente', 'idMateria', 'idDocente')
            ->withPivot('semestreMateria');
    }
}
