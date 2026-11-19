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
        'apellidoPaternoUsuario',
        'apellidoMaternoUsuario',
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

    /**
     * Nombre completo armado a partir de las tres columnas (3FN).
     * Se expone como nombreCompleto en los respuestas de la API.
     */
    public function getNombreCompletoAttribute(): string
    {
        return trim(implode(' ', array_filter([
            $this->nombreUsuario,
            $this->apellidoPaternoUsuario,
            $this->apellidoMaternoUsuario,
        ])));
    }

    /**
     * Divide un nombre completo en [nombre, apellidoPaterno, apellidoMaterno].
     * Regla: 3+ partes -> nombre = menos las 2 ultimas; 2 -> nombre+paterno;
     * 1 -> solo nombre. Sirve cuando llega un nombre completo en un unico campo.
     *
     * @return array{0: string, 1: string, 2: string}
     */
    public static function dividirNombre(string $texto): array
    {
        $partes = preg_split('/\s+/', trim($texto), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if (count($partes) >= 3) {
            return [
                implode(' ', array_slice($partes, 0, -2)),
                $partes[count($partes) - 2],
                $partes[count($partes) - 1],
            ];
        }

        if (count($partes) === 2) {
            return [$partes[0], $partes[1], ''];
        }

        return [$partes[0] ?? '', '', ''];
    }

    /**
     * Resuelve los tres campos de nombre a partir de los datos recibidos:
     *  - si llegan apellidos separados, se usan tal cual
     *  - si llegan apellidos pegados en un solo campo, se parten
     *  - si no llegan apellidos, se divide el nombre completo
     * Devuelve [nombre, apellidoPaterno, apellidoMaterno].
     *
     * @return array{0: string, 1: string, 2: string}
     */
    public static function resolverNombre(array $datos): array
    {
        $nombre = trim((string) ($datos['nombreUsuario'] ?? ''));
        $paterno = trim((string) ($datos['apellidoPaternoUsuario'] ?? ''));
        $materno = trim((string) ($datos['apellidoMaternoUsuario'] ?? ''));

        if ($paterno === '' && $materno === '') {
            /* Solo llego un nombre completo: se divide solo */
            return self::dividirNombre($nombre);
        }

        if ($materno === '' && str_contains($paterno, ' ')) {
            /* Apellidos pegados en un solo campo: se parte por el primer espacio */
            [$p1, $p2] = explode(' ', $paterno, 2);
            $paterno = $p1;
            $materno = $p2;
        }

        /* Si el nombre venia completo (con los apellidos pegados), se limpia */
        foreach ([$materno, $paterno] as $apellido) {
            if ($apellido !== '' && str_ends_with($nombre, ' '.$apellido)) {
                $nombre = trim(substr($nombre, 0, -strlen($apellido) - 1));
            }
        }

        return [$nombre, $paterno, $materno];
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
