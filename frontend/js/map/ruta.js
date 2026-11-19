/* =========================================================
   map/ruta.js — mejor ruta peatonal hacia un espacio (HU-10)

   Novedades (v2):
   · A* de 8 direcciones con monticulo binario, heuristica octil
     y penalizacion por rozar paredes (la ruta tiende al centro
     del pasillo). Despues se "estira" el camino (line-of-sight)
     para quitar los escalones de la cuadricula.
   · Rutas MULTI-PISO y MULTI-TORRE: busca escaleras / ascensores
     del piso y, para ir de una torre a otra, usa los pisos de
     conexion (TA 5 y 9  <->  TI 6 y 10).
   · Dos modos que se comparan automaticamente:
       - "rapida"    : escaleras o ascensor, lo que cueste menos
       - "accesible" : solo ascensor, sin escaleras
   · Panel con distancia, tiempo estimado e indicaciones paso a
     paso; cada tramo se puede abrir en su piso.

   API publica (compatible con la anterior):
     UniMap.ruta.trazar(espacio, modo?)   UniMap.ruta.limpiar()
     UniMap.ruta.activa()  -> vista del tramo del piso actual
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  /* ── CONSTANTES ─────────────────────────────────────── */
  var METROS_POR_UNIDAD = 0.12;        /* 800 unidades ~ 96 m */
  var METROS_POR_MINUTO = 83.33;       /* 5 km/h */
  var CELDA = 4;                       /* unidades de mundo por celda (igual que la mascara de muros) */
  var ANCHO_PLANO = 800;
  var ALTO_PLANO = 600;
  var COLS = Math.ceil(ANCHO_PLANO / CELDA);
  var FILAS = Math.ceil(ALTO_PLANO / CELDA);
  var PUNTO_DEFECTO = { x: 400, y: 280 };

  /* Costo equivalente (en metros) de cambiar de piso */
  var COSTO_ESCALERA_POR_PISO = 18;
  var COSTO_ASCENSOR_POR_PISO = 6;
  var COSTO_ASCENSOR_ESPERA = 25;
  /* Cruce de una torre a otra por el puente (metros) */
  var METROS_PUENTE = 30;
  /* Pisos de conexion entre torres: [piso TA, piso TI] */
  var PUENTES = [[5, 6], [9, 10]];

  var RE_ESCALERA = /escalera|escalones|stair/i;
  var RE_ASCENSOR = /ascensor|elevador|lift|elevator/i;

  /* Grid: 0 = libre, 1 = bloqueado */
  var grid = [];
  var cercaPared = [];
  function crearGrid() {
    for (var f = 0; f < FILAS; f++) {
      grid[f] = []; cercaPared[f] = [];
      for (var c = 0; c < COLS; c++) { grid[f][c] = 0; cercaPared[f][c] = 0; }
    }
  }
  crearGrid();

  var PUERTAS = [];
  function definirPuertas(puertas) { PUERTAS = puertas || []; }

  /* ── TEXTOS (ES / EN) ───────────────────────────────── */
  if (UniMap.i18n && UniMap.i18n.extender) {
    UniMap.i18n.extender({
      'rut.titulo': 'Mejor ruta',
      'rut.rapida': 'Más rápida',
      'rut.accesible': 'Accesible',
      'rut.min': 'min',
      'rut.calculando': 'Calculando la mejor ruta…',
      'rut.pasos': 'Indicaciones',
      'rut.tramo': 'Tramo',
      'rut.verTramo': 'Ver en el mapa',
      'rut.siguiente': 'Siguiente tramo',
      'rut.cerrar': 'Cerrar ruta',
      'rut.recto': 'Avanza {m} m',
      'rut.derecha': 'Gira a la derecha y avanza {m} m',
      'rut.izquierda': 'Gira a la izquierda y avanza {m} m',
      'rut.llegada': 'Llegas a {nombre}',
      'rut.subirEsc': 'Usa las escaleras hasta {lugar}',
      'rut.subirAsc': 'Toma el ascensor hasta {lugar}',
      'rut.puente': 'Cruza el puente hacia {torre}',
      'rut.aproximada': 'Ruta aproximada (sin camino libre en el plano)',
      'rut.sinAscensor': 'No hay ascensor registrado: ruta estimada',
      'rut.pisos': '{n} piso(s)'
    }, {
      'rut.titulo': 'Best route',
      'rut.rapida': 'Fastest',
      'rut.accesible': 'Accessible',
      'rut.min': 'min',
      'rut.calculando': 'Calculating the best route…',
      'rut.pasos': 'Directions',
      'rut.tramo': 'Leg',
      'rut.verTramo': 'Show on map',
      'rut.siguiente': 'Next leg',
      'rut.cerrar': 'Close route',
      'rut.recto': 'Go straight {m} m',
      'rut.derecha': 'Turn right and walk {m} m',
      'rut.izquierda': 'Turn left and walk {m} m',
      'rut.llegada': 'You arrive at {nombre}',
      'rut.subirEsc': 'Take the stairs to {lugar}',
      'rut.subirAsc': 'Take the elevator to {lugar}',
      'rut.puente': 'Cross the bridge to {torre}',
      'rut.aproximada': 'Approximate route (no free path on the plan)',
      'rut.sinAscensor': 'No elevator registered: estimated route',
      'rut.pisos': '{n} floor(s)'
    });
  }
  function T(k, p) { return UniMap.i18n.t(k, p); }

  /* =========================================================
     GRID
     ========================================================= */
  function espaciosDePlanta(edificio, piso) {
    var todos = estado.todosLosEspacios && estado.todosLosEspacios.length
      ? estado.todosLosEspacios : (estado.espacios || []);
    var res = [];
    for (var i = 0; i < todos.length; i++) {
      var e = todos[i];
      if (e && e.edificio === edificio && e.piso === piso && e.estado !== 'inactivo') res.push(e);
    }
    return res;
  }

  function esConector(e) {
    return RE_ESCALERA.test(e.tipo || '') || RE_ESCALERA.test(e.nombre || '') ||
      RE_ASCENSOR.test(e.tipo || '') || RE_ASCENSOR.test(e.nombre || '');
  }

  function celdasDe(e) {
    return {
      x1: Math.max(0, Math.floor(e.x / CELDA)),
      y1: Math.max(0, Math.floor(e.y / CELDA)),
      x2: Math.min(COLS - 1, Math.floor((e.x + e.ancho - 1) / CELDA)),
      y2: Math.min(FILAS - 1, Math.floor((e.y + e.alto - 1) / CELDA))
    };
  }

  /* Marca como bloqueadas las celdas de los espacios (salvo los
     "libres": origen y destino, que son transitables) y las
     puertas definidas. */
  var mpuActual = METROS_POR_UNIDAD;
  function reconstruirGrid(espacios, libres, mascara, inflar) {
    crearGrid();
    libres = libres || {};
    var i, fy, fx;
    mpuActual = METROS_POR_UNIDAD;
        if (mascara) {
      mpuActual = mascara.metrosPorUnidad || METROS_POR_UNIDAD;
      for (fy = 0; fy < FILAS; fy++)
        for (fx = 0; fx < COLS; fx++) grid[fy][fx] = mascara.data[fy * mascara.cols + fx];
      if (inflar) {
        var copia = grid.map(function (r) { return r.slice(); });
        for (fy = 0; fy < FILAS; fy++)
          for (fx = 0; fx < COLS; fx++) {
            if (copia[fy][fx] !== 1) continue;
            for (var iy = -1; iy <= 1; iy++) for (var ix = -1; ix <= 1; ix++) {
              var yy = fy + iy, xx = fx + ix;
              if (yy >= 0 && xx >= 0 && yy < FILAS && xx < COLS) grid[yy][xx] = 1;
            }
          }
      }
      /* Si la máscara ya viene de aulas, no volver a pintar rectángulos */
      if (mascara.desdeEspacios) espacios = [];
      else espacios = [];
    }
    for (i = 0; i < (espacios || []).length; i++) {
      var e = espacios[i];
      if (!e || e.estado === 'inactivo' || libres[e.id] || esConector(e)) continue;
      var r = celdasDe(e);
      var margen = mascara ? 0 : 1;
      var y1 = r.y1 + margen, y2 = r.y2 - margen;
      var x1 = r.x1 + margen, x2 = r.x2 - margen;
      if (y2 < y1 || x2 < x1) {
        y1 = r.y1; y2 = r.y2; x1 = r.x1; x2 = r.x2;
      }
      for (fy = y1; fy <= y2; fy++)
        for (fx = x1; fx <= x2; fx++) grid[fy][fx] = 1;
    }
    for (var p = 0; p < PUERTAS.length && !mascara; p++) {
      var pu = PUERTAS[p];
      var a = Math.max(0, Math.floor(pu.x / CELDA)), b = Math.max(0, Math.floor(pu.y / CELDA));
      var c2 = Math.min(COLS - 1, Math.floor((pu.x + pu.ancho) / CELDA));
      var d2 = Math.min(FILAS - 1, Math.floor((pu.y + pu.alto) / CELDA));
      for (fy = b; fy <= d2; fy++) for (fx = a; fx <= c2; fx++) grid[fy][fx] = 0;
    }
    /* Celdas pegadas a una pared cuestan mas: centra la ruta */
    for (fy = 0; fy < FILAS; fy++) {
      for (fx = 0; fx < COLS; fx++) {
        if (grid[fy][fx] === 1) continue;
        var cerca = 0;
        for (var dy = -1; dy <= 1 && !cerca; dy++)
          for (var dx = -1; dx <= 1; dx++) {
            var ny = fy + dy, nx = fx + dx;
            if (ny < 0 || nx < 0 || ny >= FILAS || nx >= COLS || grid[ny][nx] === 1) { cerca = 1; break; }
          }
        cercaPared[fy][fx] = cerca;
      }
    }
  }

  function mundoACelda(x, y) {
    return {
      c: Math.min(COLS - 1, Math.max(0, Math.floor(x / CELDA))),
      f: Math.min(FILAS - 1, Math.max(0, Math.floor(y / CELDA)))
    };
  }
  function celdaAMundo(c, f) { return { x: (c + 0.5) * CELDA, y: (f + 0.5) * CELDA }; }

  function celdaLibreCercana(c, f) {
    if (grid[f][c] === 0) return { c: c, f: f };
    var vis = {}, cola = [{ c: c, f: f }], k = 0;
    vis[c + ',' + f] = true;
    while (k < cola.length && k < 4000) {
      var a = cola[k++];
      if (grid[a.f][a.c] === 0) return a;
      var v = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) {
        var nc = a.c + v[i][0], nf = a.f + v[i][1];
        if (nc < 0 || nf < 0 || nc >= COLS || nf >= FILAS || vis[nc + ',' + nf]) continue;
        vis[nc + ',' + nf] = true;
        cola.push({ c: nc, f: nf });
      }
    }
    return null;
  }

  /* =========================================================
     A* (8 direcciones + monticulo binario)
     ========================================================= */
  function Monticulo() { this.a = []; }
  Monticulo.prototype.push = function (n) {
    var a = this.a, i = a.length; a.push(n);
    while (i > 0) {
      var p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      var t = a[p]; a[p] = a[i]; a[i] = t; i = p;
    }
  };
  Monticulo.prototype.pop = function () {
    var a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      var i = 0, n = a.length;
      for (; ;) {
        var l = 2 * i + 1, r = l + 1, m = i;
        if (l < n && a[l].f < a[m].f) m = l;
        if (r < n && a[r].f < a[m].f) m = r;
        if (m === i) break;
        var t = a[m]; a[m] = a[i]; a[i] = t; i = m;
      }
    }
    return top;
  };

  var DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];

  function octil(c1, f1, c2, f2) {
    var dx = Math.abs(c1 - c2), dy = Math.abs(f1 - f2);
    return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy);
  }

  function astar(ci, fi, cf, ff) {
    if (ci === cf && fi === ff) return [{ c: ci, f: fi }];
    var g = new Float32Array(COLS * FILAS).fill(Infinity);
    var padre = new Int32Array(COLS * FILAS).fill(-1);
    var cerrado = new Uint8Array(COLS * FILAS);
    var h = new Monticulo();
    var ini = fi * COLS + ci, fin = ff * COLS + cf;
    g[ini] = 0;
    h.push({ k: ini, f: octil(ci, fi, cf, ff) });

    while (h.a.length) {
      var cur = h.pop();
      if (cerrado[cur.k]) continue;
      cerrado[cur.k] = 1;
      if (cur.k === fin) {
        var camino = [], k = fin;
        while (k !== -1) { camino.push({ c: k % COLS, f: (k / COLS) | 0 }); k = padre[k]; }
        return camino.reverse();
      }
      var cc = cur.k % COLS, cf0 = (cur.k / COLS) | 0;
      for (var d = 0; d < 8; d++) {
        var nc = cc + DIRS[d][0], nf = cf0 + DIRS[d][1];
        if (nc < 0 || nf < 0 || nc >= COLS || nf >= FILAS || grid[nf][nc] === 1) continue;
        /* diagonal: no cortar esquinas */
        if (DIRS[d][0] !== 0 && DIRS[d][1] !== 0 &&
          (grid[cf0][nc] === 1 || grid[nf][cc] === 1)) continue;
        var nk = nf * COLS + nc;
        if (cerrado[nk]) continue;
        var costo = DIRS[d][2] * (1 + (cercaPared[nf][nc] ? 0.6 : 0));
        var ng = g[cur.k] + costo;
        if (ng < g[nk]) {
          g[nk] = ng; padre[nk] = cur.k;
          h.push({ k: nk, f: ng + octil(nc, nf, cf, ff) });
        }
      }
    }
    return null;
  }

  /* Linea de vision entre dos celdas (Bresenham estricto) */
  function lineaLibre(c0, f0, c1, f1) {
    var dc = Math.abs(c1 - c0), df = Math.abs(f1 - f0);
    var sc = c0 < c1 ? 1 : -1, sf = f0 < f1 ? 1 : -1;
    var err = dc - df, c = c0, f = f0;
    for (; ;) {
      if (grid[f][c] === 1) return false;
      if (c === c1 && f === f1) return true;
      var e2 = 2 * err, pc = c, pf = f;
      if (e2 > -df) { err -= df; c += sc; }
      if (e2 < dc) { err += dc; f += sf; }
      if (c !== pc && f !== pf && (grid[pf][c] === 1 || grid[f][pc] === 1)) return false;
    }
  }

  function estirar(camino) {
    if (camino.length < 3) return camino;
    var res = [camino[0]], ancla = 0;
    for (var i = 2; i < camino.length; i++) {
      if (!lineaLibre(camino[ancla].c, camino[ancla].f, camino[i].c, camino[i].f)) {
        res.push(camino[i - 1]); ancla = i - 1;
      }
    }
    res.push(camino[camino.length - 1]);
    return res;
  }

  function longitud(pts) {
    var u = 0;
    for (var i = 1; i < pts.length; i++) u += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return u * mpuActual;
  }

  /* Camino dentro de UNA planta entre dos puntos del plano.
     Devuelve { puntos, metros, aproximada } */
  function caminoEnPlanta(edificio, piso, a, b, libres) {
    var mascara = (UniMap.modelos && UniMap.modelos.mascaraListaSync)
      ? UniMap.modelos.mascaraListaSync(edificio, piso) : null;
    var camino = null, li = null, lf = null, inflar;
    for (inflar = 0; inflar <= (mascara ? 1 : 0) && !camino; inflar++) {
      reconstruirGrid(espaciosDePlanta(edificio, piso), libres, mascara, inflar);
      var ci = mundoACelda(a.x, a.y), cf = mundoACelda(b.x, b.y);
      li = celdaLibreCercana(ci.c, ci.f);
      lf = celdaLibreCercana(cf.c, cf.f);
      camino = (li && lf) ? astar(li.c, li.f, lf.c, lf.f) : null;
    }
    var puntos = [], aproximada = false;
    var ini = li ? celdaAMundo(li.c, li.f) : a, fin = lf ? celdaAMundo(lf.c, lf.f) : b;
    /* El punto exacto solo se usa si esta en zona libre: nunca se
       salta una pared para llegar a un pin que cae dentro de ella */
    var aLibre = li && grid[mundoACelda(a.x, a.y).f][mundoACelda(a.x, a.y).c] === 0;
    var bLibre = lf && grid[mundoACelda(b.x, b.y).f][mundoACelda(b.x, b.y).c] === 0;
    puntos.push(aLibre || !mascara ? { x: a.x, y: a.y } : ini);
    if (camino) {
      var suave = estirar(camino);
      for (var i = 0; i < suave.length; i++) puntos.push(celdaAMundo(suave[i].c, suave[i].f));
    } else {
      aproximada = true;
    }
    puntos.push(bLibre || !mascara ? { x: b.x, y: b.y } : fin);
    /* limpiar duplicados */
    var lim = [puntos[0]];
    for (var j = 1; j < puntos.length; j++) {
      var p = lim[lim.length - 1];
      if (Math.abs(p.x - puntos[j].x) > 1 || Math.abs(p.y - puntos[j].y) > 1) lim.push(puntos[j]);
    }
    if (lim.length < 2) lim.push({ x: lim[0].x + 1, y: lim[0].y + 1 });
    return { puntos: lim, metros: longitud(lim), aproximada: aproximada, mpu: mpuActual };
  }

  /* =========================================================
     CONECTORES (escaleras / ascensores) Y PUENTES
     ========================================================= */
  function conectoresDe(edificio, piso, tipo) {
    var lista = [], esp = espaciosDePlanta(edificio, piso);
    for (var i = 0; i < esp.length; i++) {
      var e = esp[i];
      var asc = RE_ASCENSOR.test(e.tipo || '') || RE_ASCENSOR.test(e.nombre || '');
      var esc = RE_ESCALERA.test(e.tipo || '') || RE_ESCALERA.test(e.nombre || '');
      if ((tipo === 'ascensor' && asc) || (tipo === 'escalera' && esc)) {
        lista.push({ x: e.x + e.ancho / 2, y: e.y + e.alto / 2, id: e.id, estimado: false });
      }
    }
    return lista;
  }

  /* Punto de conexion en el plano: si hay uno real en el piso
     se usa el mas cercano a "cerca"; si no, uno estimado. */
  function conectorCercano(edificio, piso, tipo, cerca) {
    var lista = conectoresDe(edificio, piso, tipo), mejor = null, md = Infinity;
    for (var i = 0; i < lista.length; i++) {
      var d = Math.hypot(lista[i].x - cerca.x, lista[i].y - cerca.y);
      if (d < md) { md = d; mejor = lista[i]; }
    }
    if (mejor) return mejor;
    /* Estimado: buscar la misma posicion en el otro piso o el pasillo */
    return { x: PUNTO_DEFECTO.x, y: PUNTO_DEFECTO.y, estimado: true };
  }

  function indicePiso(edificio, piso) {
    var l = (datos.edificios || []).filter(function (e) { return e.id === edificio; })[0];
    return l ? l.pisos.indexOf(piso) : -1;
  }
  function pisosEntre(edificio, p1, p2) {
    var a = indicePiso(edificio, p1), b = indicePiso(edificio, p2);
    if (a < 0 || b < 0) return Math.abs(p2 - p1);
    return Math.abs(a - b);
  }
  function nombrePlanta(ed, piso) {
    return (datos.nombreEdificio ? datos.nombreEdificio(ed) : 'Torre ' + ed) + ' · ' +
      (datos.nombrePiso ? datos.nombrePiso(piso) : 'Piso ' + piso);
  }

  /* =========================================================
     PLANIFICADOR: arma los tramos de una ruta segun el modo
     ========================================================= */
  function planificar(origen, destino, modo) {
    var tipo = modo === 'accesible' ? 'ascensor' : null;
    var tramos = [], pasos = [], aviso = null;

    /* tramo caminando dentro de una planta */
    function caminar(ed, piso, a, b, libres, etiqueta) {
      var r = caminoEnPlanta(ed, piso, a, b, libres);
      tramos.push({
        edificio: ed, piso: piso, puntos: r.puntos, metros: r.metros,
        tipo: 'caminata', etiqueta: etiqueta || nombrePlanta(ed, piso), aproximada: r.aproximada, mpu: r.mpu
      });
      return r;
    }

    /* cambio de piso en una torre: devuelve { costo, tipo, a, b } */
    function cambiarPiso(ed, pisoA, pisoB, desde) {
      var n = pisosEntre(ed, pisoA, pisoB);
      var usarAsc = (tipo === 'ascensor');
      var opcionAsc = conectorCercano(ed, pisoA, 'ascensor', desde);
      var opcionEsc = conectorCercano(ed, pisoA, 'escalera', desde);
      var costoAsc = n * COSTO_ASCENSOR_POR_PISO + COSTO_ASCENSOR_ESPERA;
      var costoEsc = n * COSTO_ESCALERA_POR_PISO;
      var elige = usarAsc ? 'ascensor' : (costoAsc < costoEsc ? 'ascensor' : 'escalera');
      var con = elige === 'ascensor' ? opcionAsc : opcionEsc;
      if (usarAsc && opcionAsc.estimado) aviso = 'rut.sinAscensor';
      /* en el piso destino se sale por el mismo conector (si existe ahi) */
      var salida = conectorCercano(ed, pisoB, elige, con);
      return {
        tipo: elige, entrada: con, salida: salida, n: n,
        costo: elige === 'ascensor' ? costoAsc : costoEsc
      };
    }

    var mismaTorre = origen.edificio === destino.edificio;

    if (mismaTorre && origen.piso === destino.piso) {
      caminar(origen.edificio, origen.piso, origen, destino, { [destino.id]: true });
    } else if (mismaTorre) {
      var cp = cambiarPiso(origen.edificio, origen.piso, destino.piso, origen);
      caminar(origen.edificio, origen.piso, origen, cp.entrada, {});
      tramos.push({
        edificio: origen.edificio, piso: origen.piso, puntos: [], metros: 0, tipo: 'conector',
        conector: cp.tipo, hacia: { edificio: destino.edificio, piso: destino.piso }, n: cp.n,
        etiqueta: nombrePlanta(origen.edificio, origen.piso), metrosEq: cp.costo
      });
      caminar(destino.edificio, destino.piso, cp.salida, destino, { [destino.id]: true });
    } else {
      /* Entre torres: elegir el puente con menos pisos que subir/bajar */
      var mejor = null, mc = Infinity;
      for (var i = 0; i < PUENTES.length; i++) {
        var pa = PUENTES[i][0], pb = PUENTES[i][1];
        var costo = (origen.piso === pa ? 0 : pisosEntre(origen.edificio, origen.piso, pa)) +
          (destino.piso === pb ? 0 : pisosEntre(destino.edificio, pb, destino.piso));
        if (origen.edificio === 2) {
          pa = PUENTES[i][1]; pb = PUENTES[i][0];
          costo = (origen.piso === pa ? 0 : pisosEntre(2, origen.piso, pa)) +
            (destino.piso === pb ? 0 : pisosEntre(1, pb, destino.piso));
        }
        if (costo < mc) { mc = costo; mejor = { pa: pa, pb: pb }; }
      }
      var cur = origen, hacia = mejor.pa;
      if (origen.piso !== hacia) {
        var c1 = cambiarPiso(origen.edificio, origen.piso, hacia, origen);
        caminar(origen.edificio, origen.piso, origen, c1.entrada, {});
        tramos.push({
          edificio: origen.edificio, piso: origen.piso, puntos: [], metros: 0, tipo: 'conector',
          conector: c1.tipo, hacia: { edificio: origen.edificio, piso: hacia }, n: c1.n,
          etiqueta: nombrePlanta(origen.edificio, origen.piso), metrosEq: c1.costo
        });
        cur = { x: c1.salida.x, y: c1.salida.y };
      }
      /* cruce: punto medio del pasillo -> pasillo de la otra torre */
      var finA = { x: PUNTO_DEFECTO.x, y: PUNTO_DEFECTO.y };
      caminar(origen.edificio, hacia, cur, finA, origen.piso === hacia ? {} : {});
      tramos.push({
        edificio: destino.edificio, piso: mejor.pb, puntos: [], metros: 0, tipo: 'puente',
        etiqueta: nombrePlanta(origen.edificio, hacia), metrosEq: METROS_PUENTE,
        hacia: { edificio: destino.edificio, piso: mejor.pb }
      });
      var inicioB = { x: PUNTO_DEFECTO.x, y: PUNTO_DEFECTO.y };
      if (destino.piso !== mejor.pb) {
        var c2 = cambiarPiso(destino.edificio, mejor.pb, destino.piso, inicioB);
        caminar(destino.edificio, mejor.pb, inicioB, c2.entrada, {});
        tramos.push({
          edificio: destino.edificio, piso: mejor.pb, puntos: [], metros: 0, tipo: 'conector',
          conector: c2.tipo, hacia: { edificio: destino.edificio, piso: destino.piso }, n: c2.n,
          etiqueta: nombrePlanta(destino.edificio, mejor.pb), metrosEq: c2.costo
        });
        caminar(destino.edificio, destino.piso, c2.salida, destino, { [destino.id]: true });
      } else {
        caminar(destino.edificio, destino.piso, inicioB, destino, { [destino.id]: true });
      }
    }

    /* Totales: caminando + equivalentes de cambio de piso / puente */
    var metros = 0, equiv = 0, aprox = false;
    for (var t = 0; t < tramos.length; t++) {
      metros += tramos[t].metros;
      equiv += tramos[t].metros + (tramos[t].metrosEq || 0);
      if (tramos[t].aproximada) aprox = true;
    }
    return {
      modo: modo, tramos: tramos, metros: Math.round(metros),
      minutos: Math.max(1, Math.round(equiv / METROS_POR_MINUTO * 10) / 10),
      equivalente: equiv, aviso: aviso, aproximada: aprox
    };
  }

  /* =========================================================
     INDICACIONES PASO A PASO
     ========================================================= */
  function indicaciones(ruta, destino) {
    var pasos = [];
    for (var t = 0; t < ruta.tramos.length; t++) {
      var tr = ruta.tramos[t];
      if (tr.tipo === 'conector') {
        pasos.push({
          tramo: t, icono: tr.conector === 'ascensor' ? '🛗' : '🪜',
          texto: T(tr.conector === 'ascensor' ? 'rut.subirAsc' : 'rut.subirEsc',
            { lugar: nombrePlanta(tr.hacia.edificio, tr.hacia.piso) })
        });
        continue;
      }
      if (tr.tipo === 'puente') {
        pasos.push({
          tramo: t, icono: '🌉', texto: T('rut.puente',
            { torre: datos.nombreEdificio ? datos.nombreEdificio(tr.hacia.edificio) : 'Torre ' + tr.hacia.edificio })
        });
        continue;
      }
      var p = tr.puntos, rumboPrev = null;
      for (var i = 1; i < p.length; i++) {
        var dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y;
        var m = Math.max(1, Math.round(Math.hypot(dx, dy) * (tr.mpu || METROS_POR_UNIDAD)));
        if (m < 3 && i < p.length - 1) { rumboPrev = rumboPrev; continue; }  /* tramos minusculos: se omiten */
        var rumbo = Math.atan2(dy, dx), clave = 'rut.recto', icono = '⬆️';
        if (rumboPrev !== null) {
          var giro = rumbo - rumboPrev;
          while (giro > Math.PI) giro -= 2 * Math.PI;
          while (giro < -Math.PI) giro += 2 * Math.PI;
          if (giro > 0.5) { clave = 'rut.derecha'; icono = '↪️'; }
          else if (giro < -0.5) { clave = 'rut.izquierda'; icono = '↩️'; }
        }
        pasos.push({ tramo: t, icono: icono, texto: T(clave, { m: m }) });
        rumboPrev = rumbo;
      }
    }
    pasos.push({ tramo: ruta.tramos.length - 1, icono: '📍', texto: T('rut.llegada', { nombre: destino.nombre }) });
    return pasos;
  }

  /* =========================================================
     ORIGEN
     ========================================================= */
  function origenUsuario() {
    var o = estado.ubicacionUsuario || PUNTO_DEFECTO;
    var ed = estado.edificioActual === 0 ? 1 : estado.edificioActual;
    var piso = estado.pisoActual;
    if (estado.edificioActual === 0 && datos.obtenerPisoTA) piso = datos.obtenerPisoTA();
    return { x: o.x, y: o.y, edificio: estado.ubicacionEdificio || ed, piso: estado.ubicacionPiso != null ? estado.ubicacionPiso : piso };
  }

  function espacioCrudo(esp) {
    var todos = estado.todosLosEspacios || [];
    for (var i = 0; i < todos.length; i++) if (todos[i].id === esp.id) return todos[i];
    return esp;
  }

  /* =========================================================
     TRAZAR
     ========================================================= */
  function trazar(espacio, modoPreferido) {
    if (!espacio) return false;
    var crudo = espacioCrudo(espacio);
    var dest = {
      id: crudo.id, nombre: crudo.nombre, edificio: crudo.edificio, piso: crudo.piso,
      x: crudo.x + crudo.ancho / 2, y: crudo.y + crudo.alto / 2
    };
    var origen = origenUsuario();

    /* Primero se cargan los muros reales de las plantas involucradas */
    var plantas = [[origen.edificio, origen.piso], [dest.edificio, dest.piso]];
    if (origen.edificio !== dest.edificio) PUENTES.forEach(function (pu) { plantas.push([1, pu[0]], [2, pu[1]]); });
    var pendientes = plantas.length, hecho = false;
    function seguir() {
      if (hecho) return; hecho = true;
      terminarTrazado(crudo, dest, origen, modoPreferido);
    }
    if (!UniMap.modelos || !UniMap.modelos.mascaraNavegacion) { seguir(); return true; }
    plantas.forEach(function (pl) {
      UniMap.modelos.mascaraNavegacion(pl[0], pl[1], function () { if (--pendientes === 0) seguir(); });
    });
    util.notificar(T('rut.calculando'), 1800);
    return true;
  }

  function terminarTrazado(crudo, dest, origen, modoPreferido) {
    var rapida = planificar(origen, dest, 'rapida');
    var accesible = planificar(origen, dest, 'accesible');
    var modo = modoPreferido || 'rapida';
    var rutas = { rapida: rapida, accesible: accesible };

    estado.rutaActiva = {
      espacioId: crudo.id, edificio: dest.edificio, piso: dest.piso,
      destino: dest, origen: origen, rutas: rutas, modo: modo,
      tramoActual: 0
    };
    aplicarModo(modo);

    /* Mostrar la planta donde empieza la ruta */
    irATramo(0);
    pintarPanel();

    var r = estado.rutaActiva;
    util.notificar(T('rut.listo') + ' ' + dest.nombre + ' · ' + T('rut.distancia') + ' ' + r.metros + ' ' + T('rut.metros'), 3500);
  }

  function aplicarModo(modo) {
    var ra = estado.rutaActiva;
    if (!ra) return;
    var sel = ra.rutas[modo] || ra.rutas.rapida;
    ra.modo = modo;
    ra.tramos = sel.tramos;
    ra.metros = sel.metros;
    ra.minutos = sel.minutos;
    ra.aviso = sel.aviso;
    ra.aproximada = sel.aproximada;
    ra.pasos = indicaciones(sel, ra.destino);
    /* puntos del tramo del piso actual (compatibilidad) */
    ra.puntos = ra.tramos.length ? ra.tramos[0].puntos : [];
  }

  function irATramo(i) {
    var ra = estado.rutaActiva;
    if (!ra || !ra.tramos[i]) return;
    ra.tramoActual = i;
    var tr = ra.tramos[i];
    var ed = tr.tipo === 'puente' ? tr.edificio : tr.edificio, piso = tr.piso;
    if (tr.tipo === 'conector' || tr.tipo === 'puente') {
      /* mostrar el piso al que se llega */
      ed = tr.hacia.edificio; piso = tr.hacia.piso;
    }
    var m = UniMap.mapa2D;
    if (m) {
      if (estado.edificioActual !== 0 && ed !== estado.edificioActual) m.cambiarEdificio(ed, piso);
      else if (piso !== estado.pisoActual) m.cambiarPiso(piso);
    }
    if (m) m.dibujar();
    pintarPanel();
  }

  function limpiar() {
    if (!estado.rutaActiva) return;
    estado.rutaActiva = null;
    quitarPanel();
    if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
  }

  /* Vista que consume map2d.js: el tramo de caminata del piso
     que se esta mostrando (con el desplazamiento de la torre 2 en
     la vista combinada). */
  function activa() {
    var ra = estado.rutaActiva;
    if (!ra || !ra.tramos) return null;
    for (var i = 0; i < ra.tramos.length; i++) {
      var tr = ra.tramos[i];
      if (tr.tipo !== 'caminata') continue;
      var visible = (tr.piso === estado.pisoActual || (estado.edificioActual === 0 &&
        datos.obtenerPisoTA && (tr.edificio === 1 ? datos.obtenerPisoTA() : datos.obtenerPisoTI()) === tr.piso)) &&
        (estado.edificioActual === 0 || tr.edificio === estado.edificioActual);
      if (!visible) continue;
      var dx = (estado.edificioActual === 0 && tr.edificio === 2) ? (datos.OFFSET_TORRE_2 || 0) : 0;
      var pts = dx ? tr.puntos.map(function (p) { return { x: p.x + dx, y: p.y }; }) : tr.puntos;
      return {
        espacioId: ra.espacioId, edificio: tr.edificio, piso: tr.piso, puntos: pts,
        metros: ra.metros, minutos: ra.minutos, tramo: i
      };
    }
    return null;
  }

  /* =========================================================
     PANEL
     ========================================================= */
  var panel = null;
  function quitarPanel() { if (panel && panel.parentNode) panel.parentNode.removeChild(panel); panel = null; }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function pintarPanel() {
    var ra = estado.rutaActiva;
    if (!ra) return quitarPanel();
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = 'panel-ruta';
      panel.className = 'panel-ruta';
      panel.setAttribute('role', 'region');
      document.body.appendChild(panel);
      panel.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-accion]');
        if (!b) return;
        var a = b.getAttribute('data-accion');
        if (a === 'cerrar') { limpiar(); util.notificar(T('rut.limpiada')); }
        else if (a === 'modo') { aplicarModo(b.getAttribute('data-modo')); irATramo(0); }
        else if (a === 'tramo') irATramo(parseInt(b.getAttribute('data-i'), 10));
        else if (a === 'siguiente') irATramo(Math.min(ra_().tramos.length - 1, ra_().tramoActual + 1));
      });
    }
    var rr = ra.rutas, html = '';
    html += '<header><strong>' + esc(T('rut.titulo')) + '</strong> · ' + esc(ra.destino.nombre) +
      '<button class="pr-x" data-accion="cerrar" aria-label="' + esc(T('rut.cerrar')) + '">×</button></header>';
    html += '<div class="pr-modos">';
    ['rapida', 'accesible'].forEach(function (m) {
      html += '<button data-accion="modo" data-modo="' + m + '" class="' + (ra.modo === m ? 'activo' : '') + '">' +
        '<span>' + esc(T('rut.' + m)) + '</span><b>' + Math.round(rr[m].metros) + ' ' + esc(T('rut.metros')) +
        ' · ' + rr[m].minutos + ' ' + esc(T('rut.min')) + '</b></button>';
    });
    html += '</div>';
    if (ra.aviso) html += '<p class="pr-aviso">' + esc(T(ra.aviso)) + '</p>';
    if (ra.aproximada) html += '<p class="pr-aviso">' + esc(T('rut.aproximada')) + '</p>';
    if (ra.tramos.length > 1) {
      html += '<div class="pr-tramos">';
      ra.tramos.forEach(function (tr, i) {
        var nom = tr.tipo === 'caminata' ? tr.etiqueta : (tr.tipo === 'puente' ? '🌉' : (tr.conector === 'ascensor' ? '🛗' : '🪜'));
        html += '<button data-accion="tramo" data-i="' + i + '" class="' + (ra.tramoActual === i ? 'activo' : '') + '">' +
          (i + 1) + '. ' + esc(nom) + '</button>';
      });
      html += '</div>';
    }
    html += '<ol class="pr-pasos" aria-label="' + esc(T('rut.pasos')) + '">';
    ra.pasos.forEach(function (p) {
      html += '<li data-accion="tramo" data-i="' + p.tramo + '"><span>' + p.icono + '</span>' + esc(p.texto) + '</li>';
    });
    html += '</ol>';
    if (ra.tramos.length > 1 && ra.tramoActual < ra.tramos.length - 1) {
      html += '<button class="pr-sig" data-accion="siguiente">' + esc(T('rut.siguiente')) + ' →</button>';
    }
    panel.innerHTML = html;
  }
  function ra_() { return estado.rutaActiva; }

  /* ── GEOLOCALIZACION (HU-10) ────────────────────────── */
  function solicitarUbicacion() {
    if (!navigator.geolocation) { util.notificar(T('ubi.noSoportado'), 3500); return; }
    navigator.geolocation.getCurrentPosition(
      function () {
        estado.ubicacionUsuario = { x: PUNTO_DEFECTO.x, y: PUNTO_DEFECTO.y };
        util.notificar(T('ubi.obtenida'), 2500);
        if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
      },
      function () { util.notificar(T('ubi.denegado'), 3500); },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  /* ── INTERFAZ ─────────────────────────────────────── */
  function iniciar() {
    estado.ubicacionUsuario = { x: PUNTO_DEFECTO.x, y: PUNTO_DEFECTO.y };

    var botonRuta = util.el('boton-ruta');
    if (botonRuta) botonRuta.addEventListener('click', function () {
      if (estado.rutaActiva) { limpiar(); util.notificar(T('rut.limpiada')); return; }
      if (!estado.espacioSeleccionado) { util.notificar(T('rut.sinDestino')); return; }
      trazar(estado.espacioSeleccionado);
    });

    var botonUbicacion = util.el('boton-ubicacion');
    if (botonUbicacion) botonUbicacion.addEventListener('click', solicitarUbicacion);

    document.addEventListener('idioma:cambiado', function () { if (estado.rutaActiva) { aplicarModo(estado.rutaActiva.modo); pintarPanel(); } });
  }

  UniMap.ruta = {
    iniciar: iniciar,
    trazar: trazar,
    limpiar: limpiar,
    activa: activa,
    irATramo: irATramo,
    solicitarUbicacion: solicitarUbicacion,
    PASILLO_X: 400,
    definirPuertas: definirPuertas,
    /* depuracion / pruebas */
    _planificar: planificar,
    _caminoEnPlanta: caminoEnPlanta,
    _grid: grid, _COLS: COLS, _FILAS: FILAS, _CELDA: CELDA,
    reconstruirGrid: reconstruirGrid
  };
})();
