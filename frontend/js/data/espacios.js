/* =========================================================
   data/espacios.js — pisos y vista de cada torre
   (Torre Antigua 4-17, Innovacion 0,4-11; el total de pisos
   vive en data/edificios.js)

   IMPORTANTE: los espacios NO se generan en el navegador.
   La unica fuente de datos es el backend (Laravel + Supabase),
   que se pide en core/api.js (cargarEspaciosRemotos) y se
   aplica en core/personalizacion.js. Si el backend esta apagado
   el plano queda vacio y se muestra un aviso (mapa.sinBackend).
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  UniMap.datos = UniMap.datos || {};

  var estado = UniMap.estado;

  /* Sin datos locales: el plano solo se llena con los espacios
     del backend. Se mantiene la funcion como punto de entrada
     vacio por si algun modulo la usa como respaldo. */
  function construirEspacios() {
    return [];
  }

  /* ── PISOS DE CADA TORRE ──────────────────────────────
     Cada torre declara sus pisos con numeracion real (p. ej.
     la TA va del 4 al 17). En la vista combinada (edificio 0)
     se une la lista de las dos torres. */
  function pisosDe(edificioId) {
    var edificios = UniMap.datos.edificios || [];
    for (var i = 0; i < edificios.length; i++) {
      if (edificios[i].id === edificioId) {
        var pisos = edificios[i].pisos;
        /* Compatibilidad: si una torre declara un numero en vez
           de lista, se interpretan los pisos desde el 0 */
        if (typeof pisos === 'number') {
          var generados = [];
          for (var p = 0; p < pisos; p++) generados.push(p);
          return generados;
        }
        return pisos;
      }
    }
    return [];
  }

  function tienePiso(edificioId, numeroPiso) {
    return pisosDe(edificioId).indexOf(numeroPiso) !== -1;
  }

  function pisosDeEdificio(edificioId) {
    return pisosDe(edificioId).length;
  }

  /* ── VISTA COMBINADA (edificio 0 = ambas torres) ─────
     Desplazamiento X de la torre 2 dentro del plano logico
     800x600, para que las dos plantas quepan sin solaparse.
     Es el unico sitio donde se define: 2D, 3D y etiquetas
     deben usar siempre este valor. */
  var OFFSET_TORRE_2 = 950;

  /* ── ESTADO DE PISOS INDEPENDIENTES POR TORRE ─────────
     En modo "ambas torres" (edificio 0), cada torre tiene su propio
     piso seleccionado. Se inicializan con el primer piso valido de
     cada torre. */
  var PISO_ACTUAL_TA = null;  /* piso seleccionado de la Torre Antigua */
  var PISO_ACTUAL_TI = null;  /* piso seleccionado de la Torre Innovacion */

  function inicializarPisosDuales() {
    var pisosTA = pisosDe(1);
    var pisosTI = pisosDe(2);
    PISO_ACTUAL_TA = pisosTA.length ? pisosTA[0] : 0;
    PISO_ACTUAL_TI = pisosTI.length ? pisosTI[0] : 0;
  }

  function obtenerPisoTA() { return PISO_ACTUAL_TA; }
  function obtenerPisoTI() { return PISO_ACTUAL_TI; }

  function establecerPisoTA(piso) {
    PISO_ACTUAL_TA = piso;
  }

  function establecerPisoTI(piso) {
    PISO_ACTUAL_TI = piso;
  }

  /* ── MAPEO DE PISOS EQUIVALENTES ENTRE TORRES ─────────
     (se conserva para referencia y para el valor inicial de TI) */
  var PISO_EQUIV_TA_A_TI = {
    4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11
  };
  var PISO_EQUIV_TI_A_TA = {};
  for (var _ta in PISO_EQUIV_TA_A_TI) {
    if (PISO_EQUIV_TA_A_TI.hasOwnProperty(_ta)) {
      PISO_EQUIV_TI_A_TA[PISO_EQUIV_TA_A_TI[_ta]] = parseInt(_ta, 10);
    }
  }

  function pisoEquivalenteTAaTI(pisoTA) {
    return PISO_EQUIV_TA_A_TI[pisoTA] !== undefined
      ? PISO_EQUIV_TA_A_TI[pisoTA]
      : null;
  }

  function pisoEquivalenteTIAaTA(pisoTI) {
    return PISO_EQUIV_TI_A_TA[pisoTI] !== undefined
      ? PISO_EQUIV_TI_A_TA[pisoTI]
      : null;
  }

  /* Pisos visibles para una seleccion de torre:
     · edificio 1 / 2 -> los pisos de esa torre
     · edificio 0     -> union de los pisos de ambas torres */
  function pisosDeVista(edificio) {
    if (edificio !== 0) return pisosDe(edificio);
    var todos = pisosDe(1).concat(pisosDe(2));
    todos.sort(function (a, b) { return a - b; });
    var unicos = [];
    for (var i = 0; i < todos.length; i++) {
      if (unicos.indexOf(todos[i]) === -1) unicos.push(todos[i]);
    }
    return unicos;
  }

  /* Espacios que debe pintar la vista actual:
     · edificio 1 / 2 -> la planta de esa torre
     · edificio 0     -> ambas torres, cada una con su piso independiente
                          (TA usa PISO_ACTUAL_TA, TI usa PISO_ACTUAL_TI) */
  function espaciosDeVista(edificio, numeroPiso) {
    if (edificio !== 0) {
      return UniMap.personalizacion
        ? UniMap.personalizacion.espaciosDelPiso(edificio, numeroPiso)
        : construirEspacios(edificio, numeroPiso);
    }

    var resultado = [];
    for (var ed = 1; ed <= 2; ed++) {
      if (UniMap.filtros && !UniMap.filtros.edificioPermitido(ed)) continue;

      /* En modo ambas torres, cada torre usa su piso independiente */
      var pisoABuscar = (ed === 1) ? PISO_ACTUAL_TA : PISO_ACTUAL_TI;

      /* Cada torre tiene sus propios pisos: la que no tiene ese
         piso no aporta espacios */
      if (!tienePiso(ed, pisoABuscar)) continue;

      var lista = UniMap.personalizacion
        ? UniMap.personalizacion.espaciosDelPiso(ed, pisoABuscar)
        : construirEspacios(ed, pisoABuscar);

      for (var i = 0; i < lista.length; i++) {
        var espacio = lista[i];
        if (ed === 2) {
          /* Copia: nunca se muta el original de la torre 2 */
          espacio = JSON.parse(JSON.stringify(espacio));
          espacio.x += OFFSET_TORRE_2;
        }
        resultado.push(espacio);
      }
    }
    return resultado;
  }

  function nombreEdificio(edificioId) {
    var edificios = UniMap.datos.edificios || [];
    for (var i = 0; i < edificios.length; i++) {
      if (edificios[i].id === edificioId) {
        var nombre = edificios[i].nombre;
        /* HU-15: las torres se muestran en el idioma activo */
        if (UniMap.i18n) {
          if (nombre === 'Torre Antigua') return UniMap.i18n.t('torre.antigua');
          if (nombre === 'Torre Innovacion') return UniMap.i18n.t('torre.innovacion');
        }
        return nombre;
      }
    }
    return '';
  }

  function nombrePiso(numeroPiso) {
    /* HU-15: la etiqueta del piso se traduce si i18n esta activo */
    if (UniMap.i18n) {
      return numeroPiso === 0
        ? UniMap.i18n.t('piso.pb')
        : UniMap.i18n.t('piso.piso') + ' ' + numeroPiso;
    }
    return numeroPiso === 0 ? 'Planta Baja' : 'Piso ' + numeroPiso;
  }

  UniMap.datos.construirEspacios = construirEspacios;
  UniMap.datos.pisosDe = pisosDe;
  UniMap.datos.tienePiso = tienePiso;
  UniMap.datos.pisosDeEdificio = pisosDeEdificio;
  UniMap.datos.pisosDeVista = pisosDeVista;
  UniMap.datos.pisoEquivalenteTAaTI = pisoEquivalenteTAaTI;
  UniMap.datos.pisoEquivalenteTIAaTA = pisoEquivalenteTIAaTA;
  UniMap.datos.obtenerPisoTA = obtenerPisoTA;
  UniMap.datos.obtenerPisoTI = obtenerPisoTI;
  UniMap.datos.establecerPisoTA = establecerPisoTA;
  UniMap.datos.establecerPisoTI = establecerPisoTI;
  UniMap.datos.inicializarPisosDuales = inicializarPisosDuales;
  UniMap.datos.nombreEdificio = nombreEdificio;
  UniMap.datos.nombrePiso = nombrePiso;
  UniMap.datos.espaciosDeVista = espaciosDeVista;
  UniMap.datos.OFFSET_TORRE_2 = OFFSET_TORRE_2;

  /* Inicializar pisos duales al cargar el modulo */
  inicializarPisosDuales();

  /* Estado inicial del mapa: vacio hasta que el backend responda */
  estado.espacios = [];
  estado.todosLosEspacios = [];
})();
