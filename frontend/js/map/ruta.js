/* =========================================================
   map/ruta.js — ruta peatonal hacia un espacio (HU-10)
   · origen: ubicacion del usuario (geolocalizacion o punto
     de acceso del campus) sobre el pasillo principal
   · destino: centro del espacio seleccionado
   · el trazado pasa por el pasillo vertical (x = 555),
     asi siempre conecta con cualquier sala de la planta
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  /* Escala del plano: 800 unidades de ancho ~ 96 m de planta */
  var METROS_POR_UNIDAD = 0.12;

  /* Coordenada X del pasillo vertical del plano logico */
  var PASILLO_X = 555;

  /* Punto por defecto del usuario (coincide con el marcador
     "Usted aqui" del plano) */
  function origen() {
    return estado.ubicacionUsuario || { x: PASILLO_X, y: 280 };
  }

  function trazar(espacio) {
    if (!espacio) return false;

    /* Si el destino esta en otra torre o piso, navegar primero */
    if (espacio.edificio !== estado.edificioActual || espacio.piso !== estado.pisoActual) {
      var lugar = (datos.nombreEdificio ? datos.nombreEdificio(espacio.edificio) : '') + ' · ' +
        (datos.nombrePiso ? datos.nombrePiso(espacio.piso) : '');
      util.notificar(UniMap.i18n.t('rut.otraPlanta', { lugar: lugar }), 2600);
      if (UniMap.ui) UniMap.ui.irAEspacio(espacio.id);
    }

    var destinoX = espacio.x + espacio.ancho / 2;
    var destinoY = espacio.y + espacio.alto / 2;
    var o = origen();

    var puntos = [
      { x: o.x, y: o.y },
      { x: PASILLO_X, y: o.y },
      { x: PASILLO_X, y: destinoY },
      { x: destinoX, y: destinoY }
    ];

    /* Quitar puntos consecutivos duplicados */
    var limpios = [puntos[0]];
    for (var i = 1; i < puntos.length; i++) {
      var prev = limpios[limpios.length - 1];
      if (Math.abs(prev.x - puntos[i].x) > 1 || Math.abs(prev.y - puntos[i].y) > 1) limpios.push(puntos[i]);
    }

    var metros = 0;
    for (var j = 1; j < limpios.length; j++) {
      var dx = limpios[j].x - limpios[j - 1].x;
      var dy = limpios[j].y - limpios[j - 1].y;
      metros += Math.sqrt(dx * dx + dy * dy);
    }
    metros = Math.round(metros * METROS_POR_UNIDAD);

    estado.rutaActiva = {
      espacioId: espacio.id,
      edificio: espacio.edificio,
      piso: espacio.piso,
      puntos: limpios,
      metros: metros
    };

    if (UniMap.mapa2D) UniMap.mapa2D.dibujar();

    util.notificar(
      UniMap.i18n.t('rut.listo') + ' ' + espacio.nombre + ' · ' +
      UniMap.i18n.t('rut.distancia') + ' ' + metros + ' ' + UniMap.i18n.t('rut.metros'),
      3500
    );
    return true;
  }

  function limpiar() {
    if (!estado.rutaActiva) return;
    estado.rutaActiva = null;
    if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
  }

  function activa() {
    if (!estado.rutaActiva) return null;
    /* La ruta solo es valida en la planta donde se trazo */
    if (estado.rutaActiva.edificio !== estado.edificioActual ||
        estado.rutaActiva.piso !== estado.pisoActual) return null;
    return estado.rutaActiva;
  }

  /* ── GEOLOCALIZACION (HU-10: obtener ubicacion) ───── */
  function solicitarUbicacion() {
    if (!navigator.geolocation) {
      util.notificar(UniMap.i18n.t('ubi.noSoportado'), 3500);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function () {
        /* El plano del campus es local: la posicion GPS se
           representa sobre el punto de acceso (pasillo) */
        estado.ubicacionUsuario = { x: PASILLO_X, y: 280 };
        util.notificar(UniMap.i18n.t('ubi.obtenida'), 2500);
        if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
      },
      function () {
        util.notificar(UniMap.i18n.t('ubi.denegado'), 3500);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  /* ── INTERFAZ ─────────────────────────────────────── */
  function iniciar() {
    estado.ubicacionUsuario = { x: PASILLO_X, y: 280 };

    var botonRuta = util.el('boton-ruta');
    if (botonRuta) botonRuta.addEventListener('click', function () {
      if (estado.rutaActiva) {
        limpiar();
        util.notificar(UniMap.i18n.t('rut.limpiada'));
        return;
      }
      if (!estado.espacioSeleccionado) {
        util.notificar(UniMap.i18n.t('rut.sinDestino'));
        return;
      }
      trazar(estado.espacioSeleccionado);
    });

    var botonUbicacion = util.el('boton-ubicacion');
    if (botonUbicacion) botonUbicacion.addEventListener('click', solicitarUbicacion);

    /* Al cambiar de planta la ruta deja de ser visible */
    document.addEventListener('espacio:cambiado', function () { /* no limpiar: al volver al piso vuelve a verse */ });
  }

  UniMap.ruta = {
    iniciar: iniciar,
    trazar: trazar,
    limpiar: limpiar,
    activa: activa,
    solicitarUbicacion: solicitarUbicacion,
    PASILLO_X: PASILLO_X
  };
})();
