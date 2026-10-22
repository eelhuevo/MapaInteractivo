<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodigoQr extends Model
{
    protected $table = 'codigosQr';

    protected $primaryKey = 'idCodigoQr';

    public $timestamps = false;

    protected $fillable = ['idEdificio', 'codigoQr', 'urlFichaEdificio'];

    public function edificio(): BelongsTo
    {
        return $this->belongsTo(Edificio::class, 'idEdificio', 'idEdificio');
    }
}
