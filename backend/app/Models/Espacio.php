<?php

namespace App\Models;

use App\Models\Concerns\TienePuntoGeografico;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Espacio extends Model
{
    use TienePuntoGeografico;

    protected $table = 'espacios';

    protected $primaryKey = 'idEspacio';

    public $timestamps = false;

    protected $fillable = [
        'idEdificio',
        'idPiso',
        'idTipoEspacio',
        'idCategoriaServicio',
        'nombreEspacio',
        'descripcionEspacio',
        'contactoEspacio',
        'estaActivo',
    ];

    protected $hidden = ['coordenadasEspacio'];

    protected $appends = ['estadoAtencion'];

    /** Nombres de día usados en horariosEspacio.diaSemana (índice ISO-8601). */
    public const DIAS_SEMANA = [
        1 => 'lunes',
        2 => 'martes',
        3 => 'miercoles',
        4 => 'jueves',
        5 => 'viernes',
        6 => 'sabado',
        7 => 'domingo',
    ];

    protected function casts(): array
    {
        return ['estaActivo' => 'boolean'];
    }

    /*
    |----------------------------------------------------------------------
    | Relaciones
    |----------------------------------------------------------------------
    */

    public function edificio(): BelongsTo
    {
        return $this->belongsTo(Edificio::class, 'idEdificio', 'idEdificio');
    }

    public function piso(): BelongsTo
    {
        return $this->belongsTo(Piso::class, 'idPiso', 'idPiso');
    }

    public function tipoEspacio(): BelongsTo
    {
        return $this->belongsTo(TipoEspacio::class, 'idTipoEspacio', 'idTipoEspacio');
    }

    public function categoriaServicio(): BelongsTo
    {
        return $this->belongsTo(CategoriaServicio::class, 'idCategoriaServicio', 'idCategoriaServicio');
    }

    public function aula(): HasOne
    {
        return $this->hasOne(Aula::class, 'idEspacio', 'idEspacio');
    }

    public function laboratorio(): HasOne
    {
        return $this->hasOne(Laboratorio::class, 'idEspacio', 'idEspacio');
    }

    public function oficina(): HasOne
    {
        return $this->hasOne(Oficina::class, 'idEspacio', 'idEspacio');
    }

    public function horariosEspacio(): HasMany
    {
        return $this->hasMany(HorarioEspacio::class, 'idEspacio', 'idEspacio');
    }

    public function favoritos(): HasMany
    {
        return $this->hasMany(Favorito::class, 'idEspacio', 'idEspacio');
    }

    /*
    |----------------------------------------------------------------------
    | Estado de atención (HU-09): se deriva de los horarios, no se guarda.
    |----------------------------------------------------------------------
    */

    public function estaAbierto(?Carbon $momento = null): bool
    {
        $momento ??= now();

        $diaActual = self::DIAS_SEMANA[$momento->dayOfWeekIso];
        $horaActual = $momento->format('H:i:s');

        return $this->horariosEspacio
            ->where('diaSemana', $diaActual)
            ->contains(
                fn (HorarioEspacio $horario) => substr((string) $horario->horaApertura, 0, 8) <= $horaActual
                    && substr((string) $horario->horaCierre, 0, 8) >= $horaActual
            );
    }

    public function getEstadoAtencionAttribute(): string
    {
        return $this->estaAbierto() ? 'abierto' : 'cerrado';
    }

    /*
    |----------------------------------------------------------------------
    | Scopes de filtrado (HU-02, HU-05, HU-19, filtros por piso y edificio)
    |----------------------------------------------------------------------
    */

    public function scopeActivos(Builder $consulta): Builder
    {
        return $consulta->where('estaActivo', true);
    }

    public function scopeBuscarPorNombre(Builder $consulta, string $textoBusqueda): Builder
    {
        return $consulta->where('nombreEspacio', 'ilike', '%'.$textoBusqueda.'%');
    }
}
