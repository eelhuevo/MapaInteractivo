<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rol extends Model
{
    protected $table = 'roles';

    protected $primaryKey = 'idRol';

    public $timestamps = false;

    protected $fillable = ['nombreRol', 'descripcionRol'];

    public function usuarios(): HasMany
    {
        return $this->hasMany(Usuario::class, 'idRol', 'idRol');
    }
}
