/* =========================================================
   map/ruta.js — ruta peatonal hacia un espacio (HU-10)
   · origen: ubicacion del usuario (geolocalizacion o punto
     de acceso del campus)
   · destino: centro del espacio seleccionado
   · el trazado sigue SOLO pasillos (espacio libre),
     nunca atraviesa paredes (espacios/habitaciones)
   · usa A* sobre una grid marcada con los espacios reales
     como obstáculos
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  /* Escala del plano: 800 unidades de ancho ~ 96 m de planta */
  var METROS_POR_UNIDAD = 0.12;

  /* Resolución de la grid (unidades de mundo por celda).
     Cuanto menor, más preciso pero más lento. 20 es un buen
     equilibrio para un plano 800x600. */
  var CELDA = 20;

  /* Dimensiones del plano logico */
  var ANCHO_PLANO = 800;
  var ALTO_PLANO = 600;

  /* Columnas y filas de la grid */
  var COLS = Math.ceil(ANCHO_PLANO / CELDA);
  var FILAS = Math.ceil(ALTO_PLANO / CELDA);

  /* Grid: 0 = libre (pasillo), 1 = bloqueado (pared/espacio) */
  var grid = [];
  for (var f = 0; f < FILAS; f++) {
    grid[f] = [];
    for (var c = 0; c < COLS; c++) grid[f][c] = 0;
  }

  /* ── Puertas: aberturas en las paredes por donde se puede pasar.
     Cada puerta es {x, y, ancho, alto} en unidades del plano.
     Se marcan como libres (0) aunque esten dentro de un espacio. */
  var PUERTAS = []; /* se llena desde afuera con UniMap.ruta.definirPuertas(puertas) */

  function definirPuertas(puertas) {
    PUERTAS = puertas || [];
  }

  /* ── reconstruirGrid: marca como bloqueadas las celdas
     que intersectan cualquier espacio visible, excepto puertas ====== */
  function reconstruirGrid(espacios) {
    /* Limpiar grid */
    for (var f = 0; f < FILAS; f++)
      for (var c = 0; c < COLS; c++) grid[f][c] = 0;

    if (!espacios || !espacios.length) return;

    /* Para cada espacio, marcar celdas bloqueadas */
    for (var i = 0; i < espacios.length; i++) {
      var e = espacios[i];
      if (!e || e.estado === 'inactivo') continue;

      var x1 = Math.max(0, Math.floor(e.x / CELDA));
      var y1 = Math.max(0, Math.floor(e.y / CELDA));
      var x2 = Math.min(COLS - 1, Math.floor((e.x + e.ancho) / CELDA));
      var y2 = Math.min(FILAS - 1, Math.floor((e.y + e.alto) / CELDA));

      for (var fy = y1; fy <= y2; fy++) {
        for (var fx = x1; fx <= x2; fx++) {
          grid[fy][fx] = 1;
        }
      }
    }

    /* Abrir las puertas (celdas libres dentro de paredes) */
    for (var p = 0; p < PUERTAS.length; p++) {
      var pu = PUERTAS[p];
      var px1 = Math.max(0, Math.floor(pu.x / CELDA));
      var py1 = Math.max(0, Math.floor(pu.y / CELDA));
      var px2 = Math.min(COLS - 1, Math.floor((pu.x + pu.ancho) / CELDA));
      var py2 = Math.min(FILAS - 1, Math.floor((pu.y + pu.alto) / CELDA));

      for (var fy = py1; fy <= py2; fy++) {
        for (var fx = px1; fx <= px2; fx++) {
          grid[fy][fx] = 0;
        }
      }
    }
  }

  /* ── coordenadas mundo <-> celda ======================== */
  function mundoACelda(x, y) {
    return {
      c: Math.min(COLS - 1, Math.max(0, Math.floor(x / CELDA))),
      f: Math.min(FILAS - 1, Math.max(0, Math.floor(y / CELDA)))
    };
  }

  function celdaAMundo(c, f) {
    return {
      x: (c + 0.5) * CELDA,
      y: (f + 0.5) * CELDA
    };
  }

  /* ── distancia heuristica (Manhattan para grid) ========= */
  function heuristica(c1, f1, c2, f2) {
    return Math.abs(c1 - c2) + Math.abs(f1 - f2);
  }

  /* ── A* sobre la grid ===================================
     Devuelve lista de {c, f} desde inicio hasta fin, o null.
  ========================================================= */
  function astarGrid(ci, fi, cf, ff) {
    if (ci === cf && fi === ff) return [{ c: ci, f: fi }];

    var abierto = {};   /* "c,f" -> {g, h, f, padre} */
    var cerrado = {};   /* "c,f" -> true */
    var heap = [];      /* array de claves "c,f" */

    function clave(c, f) { return c + ',' + f; }

    var startKey = clave(ci, fi);
    abierto[startKey] = { g: 0, h: heuristica(ci, fi, cf, ff), f: 0, padre: null };
    abierto[startKey].f = abierto[startKey].g + abierto[startKey].h;
    heap.push(startKey);

    while (heap.length > 0) {
      /* Tomar el nodo con menor f */
      heap.sort(function (a, b) { return abierto[a].f - abierto[b].f; });
      var actualKey = heap.shift();
      var partes = actualKey.split(',');
      var ac = parseInt(partes[0], 10);
      var af = parseInt(partes[1], 10);

      if (ac === cf && af === ff) {
        /* Reconstruir camino */
        var camino = [];
        var cur = actualKey;
        while (cur !== null) {
          var p = cur.split(',');
          camino.push({ c: parseInt(p[0], 10), f: parseInt(p[1], 10) });
          cur = abierto[cur].padre;
        }
        return camino.reverse();
      }

      cerrado[actualKey] = true;

      /* Vecinos: 4 direcciones (arriba, abajo, izquierda, derecha) */
      var vecinos = [
        { c: ac - 1, f: af },
        { c: ac + 1, f: af },
        { c: ac, f: af - 1 },
        { c: ac, f: af + 1 }
      ];

      for (var v = 0; v < vecinos.length; v++) {
        var vc = vecinos[v].c;
        var vf = vecinos[v].f;
        if (vc < 0 || vc >= COLS || vf < 0 || vf >= FILAS) continue;
        if (grid[vf][vc] === 1) continue; /* bloqueado */

        var vecKey = clave(vc, vf);
        if (cerrado[vecKey]) continue;

        var gTent = abierto[actualKey].g + 1;
        if (!abierto[vecKey] || gTent < abierto[vecKey].g) {
          abierto[vecKey] = {
            g: gTent,
            h: heuristica(vc, vf, cf, ff),
            padre: actualKey
          };
          abierto[vecKey].f = abierto[vecKey].g + abierto[vecKey].h;
          if (heap.indexOf(vecKey) === -1) heap.push(vecKey);
        }
      }
    }

    return null; /* no hay camino */
  }

  /* ── PUNTO DE ORIGEN DEL USUARIO ────────────────────── */
  function origen() {
    return estado.ubicacionUsuario || { x: 400, y: 280 };
  }

  /* ── TRASAR RUTA ────────────────────────────────────── */
  function trazar(espacio) {
    if (!espacio) return false;

    /* Si el destino esta en otra torre o piso, navegar primero */
    var mismaPlanta = espacio.piso === estado.pisoActual &&
      (estado.edificioActual === 0 || espacio.edificio === estado.edificioActual);

    if (!mismaPlanta) {
      var lugar = (datos.nombreEdificio ? datos.nombreEdificio(espacio.edificio) : '') + ' · ' +
        (datos.nombrePiso ? datos.nombrePiso(espacio.piso) : '');
      util.notificar(UniMap.i18n.t('rut.otraPlanta', { lugar: lugar }), 2600);
      if (UniMap.ui) UniMap.ui.irAEspacio(espacio.id);

      var vivos = estado.espacios || [];
      for (var v = 0; v < vivos.length; v++) {
        if (vivos[v].id === espacio.id) { espacio = vivos[v]; break; }
      }
    }

    /* Reconstruir grid con los espacios actuales como obstáculos */
    var espaciosVisibles = UniMap.filtros && UniMap.filtros.espaciosInteractuales
      ? UniMap.filtros.espaciosInteractuales()
      : (estado.espacios || []);
    reconstruirGrid(espaciosVisibles);

    var destinoX = espacio.x + espacio.ancho / 2;
    var destinoY = espacio.y + espacio.alto / 2;
    var o = origen();

    /* Celdas de inicio y fin */
    var ini = mundoACelda(o.x, o.y);
    var fin = mundoACelda(destinoX, destinoY);

    /* Si el inicio o fin cae dentro de un espacio bloqueado,
       buscar la celda libre mas cercana */
    if (grid[ini.f][ini.c] === 1) {
      var libre = buscarCeldaLibreMasCercana(ini.c, ini.f);
      if (libre) { ini.c = libre.c; ini.f = libre.f; }
    }
    if (grid[fin.f][fin.c] === 1) {
      var libre2 = buscarCeldaLibreMasCercana(fin.c, fin.f);
      if (libre2) { fin.c = libre2.c; fin.f = libre2.f; }
    }

    /* A* por pasillos */
    var camino = astarGrid(ini.c, ini.f, fin.c, fin.f);

    /* Construir puntos del mundo: origen -> celdas del camino -> destino */
    var puntos = [];
    puntos.push({ x: o.x, y: o.y });

    if (camino) {
      for (var i = 0; i < camino.length; i++) {
        var m = celdaAMundo(camino[i].c, camino[i].f);
        puntos.push({ x: m.x, y: m.y });
      }
    }

    puntos.push({ x: destinoX, y: destinoY });

    /* Quitar puntos consecutivos duplicados */
    var limpios = [puntos[0]];
    for (var i = 1; i < puntos.length; i++) {
      var prev = limpios[limpios.length - 1];
      if (Math.abs(prev.x - puntos[i].x) > 1 || Math.abs(prev.y - puntos[i].y) > 1) limpios.push(puntos[i]);
    }

    /* Calcular metros */
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

  /* ── buscarCeldaLibreMasCercana: BFS desde una celda ====== */
  function buscarCeldaLibreMasCercana(c, f) {
    if (c < 0 || c >= COLS || f < 0 || f >= FILAS) return null;
    if (grid[f][c] === 0) return { c: c, f: f };

    var visitado = {};
    var cola = [{ c: c, f: f, d: 0 }];
    visitado[c + ',' + f] = true;

    while (cola.length > 0) {
      var actual = cola.shift();
      if (grid[actual.f][actual.c] === 0 && (actual.c !== c || actual.f !== f))
        return actual;

      var vecs = [
        { c: actual.c - 1, f: actual.f },
        { c: actual.c + 1, f: actual.f },
        { c: actual.c, f: actual.f - 1 },
        { c: actual.c, f: actual.f + 1 }
      ];
      for (var v = 0; v < vecs.length; v++) {
        var vc = vecs[v].c, vf = vecs[v].f;
        if (vc < 0 || vc >= COLS || vf < 0 || vf >= FILAS) continue;
        var k = vc + ',' + vf;
        if (visitado[k]) continue;
        visitado[k] = true;
        cola.push({ c: vc, f: vf, d: actual.d + 1 });
        if (cola.length > 200) break; /* limitar busqueda */
      }
    }
    return null;
  }

  function limpiar() {
    if (!estado.rutaActiva) return;
    estado.rutaActiva = null;
    if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
  }

  function activa() {
    if (!estado.rutaActiva) return null;
    if (estado.rutaActiva.piso !== estado.pisoActual) return null;
    if (estado.edificioActual !== 0 &&
        estado.rutaActiva.edificio !== estado.edificioActual) return null;
    return estado.rutaActiva;
  }

  /* ── GEOLOCALIZACION (HU-10) ────────────────────────── */
  function solicitarUbicacion() {
    if (!navigator.geolocation) {
      util.notificar(UniMap.i18n.t('ubi.noSoportado'), 3500);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function () {
        /* Punto de acceso del campus, sobre el pasillo */
        estado.ubicacionUsuario = { x: 400, y: 280 };
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
    estado.ubicacionUsuario = { x: 400, y: 280 };

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

    document.addEventListener('espacio:cambiado', function () { /* no limpiar */ });
  }

  UniMap.ruta = {
    iniciar: iniciar,
    trazar: trazar,
    limpiar: limpiar,
    activa: activa,
    solicitarUbicacion: solicitarUbicacion,
    PASILLO_X: 400,
    definirPuertas: definirPuertas,
    /* Expuestos para depuracion */
    _grid: grid,
    _COLS: COLS,
    _FILAS: FILAS,
    _CELDA: CELDA,
    reconstruirGrid: reconstruirGrid
  };
})();
