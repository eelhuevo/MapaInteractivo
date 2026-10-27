/* =========================================================
   data/edificios.js — torres del campus, dias de la semana
   y mapeo de los modelos 3D a cada piso.

   Los pisos se listan con su numeracion real:
     · Torre Antigua:    4-17 (los pisos sin modelo aun no
                          se muestran: p. ej. el 12)
     · Torre Innovacion: PB (0) y 4, 6-11

   Cada torre tiene varias "plantas tipo" (modelos 3D) que se
   repiten en los pisos que indican sus nombres de archivo:
     · TA pisos 4,6,8,10    -> TorreAntiguaBanos
     · TA pisos 5,9         -> TorreAntiguaConexion
     · TA pisos 7,11,13-17  -> TorreAntiguaCursos
     · TI pisos 4,7,8,9,11  -> TorreInnovacionCasilleros
     · TI pisos 6,10        -> TorreInnovacionConexion
     · TI planta baja (0)   -> planta-baja-torre-b.fbx
   Cuando haya modelos para mas pisos solo hay que ampliar
   estas listas.
   ========================================================= */
UniMap.datos.edificios = [
  { id: 1, nombre: 'Torre Antigua', descripcion: 'Aulas, laboratorios y oficinas historicas',
    pisos: [4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17] },
  { id: 2, nombre: 'Torre Innovacion', descripcion: 'Espacios de investigacion y innovacion',
    pisos: [0, 4, 6, 7, 8, 9, 10, 11] }
];
UniMap.datos.diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

/* Numero total de pisos con modelo (13 + 8 = 21) */
UniMap.datos.totalPisos = 21;

/* ── MODELOS 3D POR TORRE Y PISO ─────────────────────
   Cada entrada es una planta tipo: su modelo se carga
   automaticamente en la vista 3D y de el se dibuja el
   plano 2D del piso, segun el piso seleccionado. */
UniMap.datos.MODELOS_PISOS = [
  { archivo: 'TorreAntiguaBanos.glb', edificio: 1, pisos: [4, 6, 8, 10] },
  { archivo: 'TorreAntiguaConexion.glb', edificio: 1, pisos: [5, 9] },
  { archivo: 'TorreAntiguaCursos.glb', edificio: 1, pisos: [7, 11, 13, 14, 15, 16, 17] },
  { archivo: 'TorreInnovacionCasilleros.glb', edificio: 2, pisos: [4, 7, 8, 9, 11] },
  { archivo: 'TorreInnovacionConexion.glb', edificio: 2, pisos: [6, 10] },
  { archivo: 'planta-baja-torre-b.fbx', edificio: 2, pisos: [0] }
];

/* Modelo de la planta tipo de un piso concreto (null si aun no hay) */
UniMap.datos.modeloDePiso = function (edificio, piso) {
  var lista = UniMap.datos.MODELOS_PISOS || [];
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].edificio === edificio && lista[i].pisos.indexOf(piso) !== -1) return lista[i];
  }
  return null;
};
