<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'usuarios';

    protected $primaryKey = 'idUsuario';

    public $timestamps = false;

    const CREATED_AT = 'creadoEn';

    protected $fillable = [
        'idRol',
        'nombreUsuario',
        'correoUsuario',
        'contrasenaHash',
        'idiomaPreferido',
        'estaActivo',
    ];

    protected $hidden = ['contrasenaHash'];

    protected function casts(): array
    {
        return [
            'estaActivo' => 'boolean',
            'creadoEn' => 'datetime',
            'contrasenaHash' => 'hashed',
        ];
    }

    /**
     * Laravel Auth usa este método para verificar la contraseña.
     */
    public function getAuthPassword(): string
    {
        return $this->contrasenaHash;
    }

    public function rol(): BelongsTo
    {
        return $this->belongsTo(Rol::class, 'idRol', 'idRol');
    }

    public function estudiante(): HasOne
    {
        return $this->hasOne(Estudiante::class, 'idUsuario', 'idUsuario');
    }

    public function docente(): HasOne
    {
        return $this->hasOne(Docente::class, 'idUsuario', 'idUsuario');
    }

    public function favoritos(): HasMany
    {
        return $this->hasMany(Favorito::class, 'idUsuario', 'idUsuario');
    }

    public function notificaciones(): HasMany
    {
        return $this->hasMany(Notificacion::class, 'idUsuario', 'idUsuario');
    }

    public function tieneRol(string ...$nombresRol): bool
    {
        $this->loadMissing('rol');

        return in_array($this->rol?->nombreRol, $nombresRol, true);
    }
}
