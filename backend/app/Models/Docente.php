<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Docente extends Model
{
    protected $table = 'docentes';

    protected $primaryKey = 'idDocente';

    public $timestamps = false;

    protected $fillable = ['idUsuario', 'departamentoDocente', 'idEspacioOficina'];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'idUsuario', 'idUsuario');
    }

    public function oficina(): BelongsTo
    {
        return $this->belongsTo(Espacio::class, 'idEspacioOficina', 'idEspacio');
    }

    public function materias(): BelongsToMany
    {
        return $this->belongsToMany(Materia::class, 'docenteMaterias', 'idDocente', 'idMateria', 'idDocente', 'idMateria')
            ->withPivot('semestreMateria');
    }

    /**
     * Turnos de atencion (lunes a sabado) que muestra el panel de
     * horarios de la web.
     */
    public function horarios(): HasMany
    {
        return $this->hasMany(HorarioDocente::class, 'idDocente', 'idDocente');
    }
}
