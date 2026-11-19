<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CodigoQr;
use App\Models\Edificio;
use Illuminate\Http\JsonResponse;

class CodigoQrController extends Controller
{
    /**
     * HU-11 — Resolver un código QR escaneado: devuelve la ficha del
     * edificio correspondiente para abrirla automáticamente.
     */
    public function resolver(string $codigoQr): JsonResponse
    {
        $codigoEncontrado = CodigoQr::where('codigoQr', $codigoQr)->first();

        if (! $codigoEncontrado) {
            return response()->json([
                'mensaje' => 'Código QR no reconocido.',
            ], 404);
        }

        $edificioVinculado = Edificio::query()
            ->conLatitudLongitud('coordenadasEdificio')
            ->findOrFail($codigoEncontrado->idEdificio);

        return response()->json([
            'codigoQr' => $codigoEncontrado->codigoQr,
            'urlFichaEdificio' => $codigoEncontrado->urlFichaEdificio,
            'edificio' => [
                'idEdificio' => $edificioVinculado->idEdificio,
                'nombreEdificio' => $edificioVinculado->nombreEdificio,
                'codigoEdificio' => $edificioVinculado->codigoEdificio,
                'descripcionEdificio' => $edificioVinculado->descripcionEdificio,
                'latitud' => (float) $edificioVinculado->latitud,
                'longitud' => (float) $edificioVinculado->longitud,
            ],
        ]);
    }
}
