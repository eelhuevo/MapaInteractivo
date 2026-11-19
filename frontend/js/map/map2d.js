/* =========================================================
   map/map2d.js — lienzo 2D del plano del campus
   (dibujo, pan, zoom, hover, seleccion y selector de piso)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  /* ── COLORES DEL MAPA (según tema claro/oscuro) ───── */
  var paletaClara = {
    disponible: '#059669',
    noDisponible: '#dc2626',
    reservado: '#d97706',
    pared: '#374151',
    piso: '#f3f4f6',
    lineaPiso: '#d1d5db',
    pasillo: '#e5e7eb',
    ubicacion: '#1a56db',
    cesped: '#86efac',
    estacionamiento: '#9ca3af',
    entrada: '#fde68a',
    bordeEntrada: '#b45309',
    resaltado: 'rgba(26,86,219,0.25)',
    seleccionado: 'rgba(26,86,219,0.4)',
    favorito: '#f59e0b',
    sugerido: '#facc15',
    anilloPin: '#ffffff',
    fondoEtiqueta: 'rgba(255,255,255,0.9)',
    bordeEtiqueta: '#d1d5db',
    textoEtiqueta: '#374151',
    textoInsignia: '#1342a8',
    nombreTorre: 'rgba(0, 0, 0, 0.9)',
    chipUbicacion: 'rgba(26,86,219,0.9)',
    textoCarga: '#9ca3af'
  };

  var paletaOscura = {
    disponible: '#34d399',
    noDisponible: '#f87171',
    reservado: '#fbbf24',
    pared: '#94a3b8',
    piso: '#000000',
    lineaPiso: '#22304a',
    pasillo: '#18233a',
    ubicacion: '#3b82f6',
    cesped: '#34d399',
    estacionamiento: '#64748b',
    entrada: '#fbbf24',
    bordeEntrada: '#f59e0b',
    resaltado: 'rgba(59,130,246,0.28)',
    seleccionado: 'rgba(59,130,246,0.45)',//cambiare rgba(59,130,246,0.45)
    favorito: '#fbbf24',
    sugerido: '#fde047',
    anilloPin: '#0b1220',
    fondoEtiqueta: 'rgba(14,22,38,0.92)',
    bordeEtiqueta: '#2e3d59',
    textoEtiqueta: '#e6ecf5',
    textoInsignia: '#93c5fd',
    nombreTorre: 'rgba(255, 255, 255, 0.95)',// cambiare esto
    chipUbicacion: 'rgb(26, 83, 206)',
    textoCarga: '#64748b'
  };

  function esOscuro() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  var colores = esOscuro() ? paletaOscura : paletaClara;

  var lienzo = util.el('lienzo-mapa');
  var contexto = lienzo ? lienzo.getContext('2d') : null;

  if (!lienzo || !contexto) return; // pagina sin mapa

  /* ── REDIMENSIONAR ────────────────────────────────── */
  function redimensionarLienzo() {
    var contenedor = util.el('contenedor-mapa');
    if (!contenedor) return;
    lienzo.width = contenedor.clientWidth;
    lienzo.height = contenedor.clientHeight;
    dibujar();
  }

  /* ── ETIQUETA DE PISO ─────────────────────────────── */
  function obtenerEtiquetaPiso() {
    var nombreTorre;
    if (estado.edificioActual === 0) {
      nombreTorre = UniMap.i18n ? UniMap.i18n.t('torre.ambos') : 'Ambas torres';
      var pisoTA = datos.obtenerPisoTA ? datos.obtenerPisoTA() : estado.pisoActual;
      var pisoTI = datos.obtenerPisoTI ? datos.obtenerPisoTI() : estado.pisoActual;
      var etiquetaTA = datos.nombrePiso ? datos.nombrePiso(pisoTA) : ('Piso ' + pisoTA);
      var etiquetaTI = datos.nombrePiso ? datos.nombrePiso(pisoTI) : ('Piso ' + pisoTI);
      return nombreTorre + ' · TA: ' + etiquetaTA + ' | TI: ' + etiquetaTI;
    } else {
      nombreTorre = datos.nombreEdificio ? datos.nombreEdificio(estado.edificioActual) : '';
    }
    var piso = datos.nombrePiso ? datos.nombrePiso(estado.pisoActual) : ('Piso ' + estado.pisoActual);
    return nombreTorre + ' · ' + piso;
  }

  /* ── TEXTOS AJUSTADOS ─────────────────────────────── */

  /* ── MARCADOR DE UBICACION ────────────────────────── */
  function dibujarMarcadorUbicacion() {
    var pos = estado.ubicacionUsuario || { x: 555, y: 280 };
    var px = pos.x, py = pos.y;
    var t = Date.now() / 1000;
    var pulso = Math.sin(t * 3) * 4 + 10;

    var paleta = esOscuro() ? paletaOscura : paletaClara;

    contexto.beginPath();
    contexto.arc(px, py, pulso, 0, Math.PI * 2);
    contexto.fillStyle = paleta.resaltado;
    contexto.fill();

    contexto.beginPath();
    contexto.arc(px, py, 8, 0, Math.PI * 2);
    contexto.fillStyle = paleta.ubicacion;
    contexto.fill();
    contexto.strokeStyle = '#fff';
    contexto.lineWidth = 2;
    contexto.stroke();

    contexto.beginPath();
    contexto.arc(px, py, 3, 0, Math.PI * 2);
    contexto.fillStyle = '#fff';
    contexto.fill();

    /* HU-15: etiqueta traducida */
    var textoUsted = UniMap.i18n ? UniMap.i18n.t('ley.usted') : 'Usted aqui';
    contexto.fillStyle = paleta.chipUbicacion;
    var w = contexto.measureText(textoUsted).width + 16;
    contexto.fillRect(px - w / 2, py - 28, w, 18);
    contexto.fillStyle = '#fff';
    contexto.font = 'bold 10px sans-serif';
    contexto.textAlign = 'center';
    contexto.textBaseline = 'middle';
    contexto.fillText(textoUsted, px, py - 19);
  }

  /* ── HU-10: RUTA PEATONAL HACIA EL DESTINO ────────── */
  function dibujarRuta() {
    var ruta = (UniMap.ruta && UniMap.ruta.activa) ? UniMap.ruta.activa() : null;
    if (!ruta || !ruta.puntos || ruta.puntos.length < 2) return;

    var puntos = ruta.puntos;
    var i;

    contexto.save();
    contexto.lineJoin = 'round';
    contexto.lineCap = 'round';

    /* Sombra del trazado */
    contexto.beginPath();
    contexto.moveTo(puntos[0].x, puntos[0].y);
    for (i = 1; i < puntos.length; i++) contexto.lineTo(puntos[i].x, puntos[i].y);
    contexto.strokeStyle = 'rgba(26,86,219,0.2)';
    contexto.lineWidth = 9;
    contexto.stroke();

    /* Linea guionada animada sobre la sombra */
    contexto.setLineDash([10, 8]);
    contexto.lineDashOffset = -(Date.now() / 60);
    contexto.strokeStyle = colores.ubicacion;
    contexto.lineWidth = 4;
    contexto.stroke();
    contexto.setLineDash([]);

    /* Origen (verde) y destino (rojo) */
    contexto.beginPath();
    contexto.arc(puntos[0].x, puntos[0].y, 5, 0, Math.PI * 2);
    contexto.fillStyle = colores.disponible;
    contexto.fill();
    contexto.strokeStyle = colores.anilloPin;
    contexto.lineWidth = 2;
    contexto.stroke();

    var fin = puntos[puntos.length - 1];
    contexto.beginPath();
    contexto.arc(fin.x, fin.y, 7, 0, Math.PI * 2);
    contexto.fillStyle = colores.noDisponible;
    contexto.fill();
    contexto.strokeStyle = colores.anilloPin;
    contexto.lineWidth = 2;
    contexto.stroke();

    /* Insignia con la distancia estimada */
    var etiqueta = UniMap.i18n.t('rut.distancia') + ' ' + ruta.metros + ' ' + UniMap.i18n.t('rut.metros');
    contexto.font = 'bold 11px sans-serif';
    var w = contexto.measureText(etiqueta).width + 16;
    var bx = Math.min(fin.x + 12, 700);
    var by = fin.y - 30;
    if (by < 44) by = fin.y + 14;
    contexto.fillStyle = colores.fondoEtiqueta;
    contexto.fillRect(bx, by, w, 20);
    contexto.strokeStyle = colores.ubicacion;
    contexto.lineWidth = 1.5;
    contexto.strokeRect(bx, by, w, 20);
    contexto.fillStyle = colores.textoInsignia;
    contexto.textAlign = 'left';
    contexto.textBaseline = 'middle';
    contexto.fillText(etiqueta, bx + 8, by + 10.5);

    contexto.restore();
  }

  /* ── PLANTA DE LA TORRE (PLANO CENITAL DEL MODELO 3D) ─
     Sin caja blanca ni marco: el plano se dibuja sobre el
     fondo del propio mapa (que ya cambia con el tema). */
  function dibujarPlantaTorre(plano, x, y, ancho, alto) {
    contexto.save();
    if (plano && plano.width && plano.height) {
      /* Ajuste "contain": el plano 2D nunca se deforma */
      var escala = Math.min(ancho / plano.width, alto / plano.height);
      var dw = plano.width * escala;
      var dh = plano.height * escala;
      contexto.drawImage(plano, x + (ancho - dw) / 2, y + (alto - dh) / 2, dw, dh);
    } else {
      /* Mientras se dibuja el plano del modelo, solo el aviso */
      contexto.fillStyle = colores.textoCarga;
      contexto.font = '12px sans-serif';
      contexto.textAlign = 'center';
      contexto.textBaseline = 'middle';
      contexto.fillText(
        UniMap.i18n ? UniMap.i18n.t('v3.cargandoModelo') : 'Cargando plano...',
        x + ancho / 2, y + alto / 2
      );
    }
    contexto.restore();
  }

  /* Pide el plano 2D (redibujado desde el modelo 3D) de los pisos
     visibles; cuando llega, el bucle de animacion repinta el mapa */
  function solicitarPlanos() {
    if (!UniMap.modelos || !UniMap.modelos.pedirPlano) return;
    var torres = estado.edificioActual === 0 ? [1, 2] : [estado.edificioActual];
    for (var t = 0; t < torres.length; t++) {
      var torre = torres[t];
      var pisoPlano = estado.pisoActual;
      /* En modo ambas torres, la torre 2 usa su piso equivalente */
      if (estado.edificioActual === 0 && torre === 2) {
        var pisoEq = UniMap.datos.pisoEquivalenteTAaTI
          ? UniMap.datos.pisoEquivalenteTAaTI(estado.pisoActual)
          : null;
        if (pisoEq !== null) pisoPlano = pisoEq;
      }
      UniMap.modelos.pedirPlano(torre, pisoPlano, function () { /* repaint automatico */ });
    }
  }

  /* ── DIBUJO PRINCIPAL ─────────────────────────────── */
  function dibujar() {
    contexto.clearRect(0, 0, lienzo.width, lienzo.height);
    contexto.save();
    contexto.translate(estado.desplazamientoX, estado.desplazamientoY);
    contexto.scale(estado.nivelZoom, estado.nivelZoom);

    /* En modo combinado el plano se ensancha para que quepa la torre 2 */
    var offsetTorre2 = datos.OFFSET_TORRE_2 || 0;
    var anchoPlano = estado.edificioActual === 0 ? 800 + offsetTorre2 : 800;

    /* Fondo */
    contexto.fillStyle = colores.piso;
    contexto.fillRect(0, 0, anchoPlano, 600);

    /* Cuadricula */
    contexto.strokeStyle = colores.lineaPiso;
    contexto.lineWidth = 0.5;
    for (var x = 0; x <= anchoPlano; x += 40) {
      contexto.beginPath(); contexto.moveTo(x, 0); contexto.lineTo(x, 600); contexto.stroke();
    }
    for (var y = 0; y <= 600; y += 40) {
      contexto.beginPath(); contexto.moveTo(0, y); contexto.lineTo(anchoPlano, y); contexto.stroke();
    }

    /* Planta de cada torre: si el plano 2D del piso (redibujado
       desde su modelo 3D) ya esta listo se dibuja como fondo;
       si no, se deja el hueco con el aviso de carga */
    var torresPlanta = estado.edificioActual === 0 ? [1, 2] : [estado.edificioActual];
    for (var tp = 0; tp < torresPlanta.length; tp++) {
      var torre = torresPlanta[tp];
      /* Cada torre solo dibuja si tiene ese piso */
      var pisoParaTorre = estado.pisoActual;
      if (estado.edificioActual === 0 && torre === 2) {
        var pisoEq = UniMap.datos.pisoEquivalenteTAaTI
          ? UniMap.datos.pisoEquivalenteTAaTI(estado.pisoActual)
          : null;
        if (pisoEq !== null) pisoParaTorre = pisoEq;
      }
      if (torre !== 0 && datos.tienePiso && !datos.tienePiso(torre, pisoParaTorre)) continue;
      var plano = (UniMap.modelos && UniMap.modelos.planoListo)
        ? UniMap.modelos.planoListo(torre, pisoParaTorre)
        : null;
      /* El desplazamiento de la torre 2 solo existe en modo combinado */
      /* El plano se dibuja centrado en (400, 300) para que coincida
         con el sistema de coordenadas de posicionEnPlano() en api.js.
         Antes se dibujaba en el offset (40, 40), lo que desubicaba
         los pines de los espacios respecto a la planta. */
      var planW = 530;
      var planH = 470;
      var px = 400 - planW / 2;   /* 135 */
      var py = 300 - planH / 2;   /* 65  */
      if (torre === 2 && estado.edificioActual === 0) px += offsetTorre2;
      dibujarPlantaTorre(plano, px, py, planW, planH);
    }

    /* Modo edicion: contorno de la zona donde se pueden colocar pines */
    if (modoEdicionPines) {
      contexto.save();
      contexto.setLineDash([6, 5]);
      contexto.strokeStyle = colores.ubicacion;
      contexto.lineWidth = 1.5;
      for (var te = 0; te < torresPlanta.length; te++) {
        var offE = (torresPlanta[te] === 2 && estado.edificioActual === 0) ? offsetTorre2 : 0;
        contexto.strokeRect(AREA_PLANO.x1 + offE, AREA_PLANO.y1,
          AREA_PLANO.x2 - AREA_PLANO.x1, AREA_PLANO.y2 - AREA_PLANO.y1);
      }
      contexto.restore();
    }

    /* Nombre de la torre en la esquina superior */
    contexto.fillStyle = colores.nombreTorre;
    contexto.font = 'bold 12px sans-serif';
    contexto.textAlign = 'left';
    contexto.textBaseline = 'top';
    var nombreTorre = estado.edificioActual === 0
      ? (UniMap.i18n ? UniMap.i18n.t('torre.ambos') : 'Ambas torres')
      : (datos.nombreEdificio ? datos.nombreEdificio(estado.edificioActual) : '');
    contexto.fillText(nombreTorre, 50, 46);
    if (estado.edificioActual === 0) {
      contexto.fillText(
        datos.nombreEdificio ? datos.nombreEdificio(2) : 'Torre Innovacion',
        50 + offsetTorre2, 46
      );
    }

    /* ── ESPACIOS (pines) ──────────────────────────────
       El plano 2D ya es el diseño redibujado del modelo 3D,
       asi que las "habitaciones" de color sintéticas NO se
       pintan encima: duplicaban el diseño y no se parecian
       al modelo.

       Para no dejar areas "fantasma" invisibles, cada espacio
       se marca ahora con un pin visible (punto + nombre), al
       estilo de los marcadores del modo 3D: el hover y el
       clic solo reaccionan sobre el pin dibujado. */
    /* Pines de los espacios con ficha (los mismos que el hit-test) */
    var visibles = UniMap.filtros.espaciosInteractuales();
    for (var i = 0; i < visibles.length; i++) dibujarPin(visibles[i]);

    dibujarMarcadorUbicacion();

    /* HU-10: trazado de la ruta peatonal (encima de todo) */
    dibujarRuta();

    /* Etiqueta de piso (en la franja libre bajo la planta,
       con margen para que no la corte el borde del lienzo) */
    contexto.fillStyle = colores.fondoEtiqueta;
    contexto.fillRect(520, 520, 160, 30);
    contexto.strokeStyle = colores.bordeEtiqueta;
    contexto.lineWidth = 1;
    contexto.strokeRect(520, 520, 160, 30);
    contexto.fillStyle = colores.textoEtiqueta;
    contexto.font = 'bold 13px sans-serif';
    contexto.textAlign = 'center';
    contexto.textBaseline = 'middle';
    contexto.fillText(obtenerEtiquetaPiso(), 600, 535);

    contexto.restore();

    var etiquetaZoom = util.el('nivel-zoom');
    if (etiquetaZoom) etiquetaZoom.textContent = Math.round(estado.nivelZoom * 100) + '%';
  }

  /* ── PINES DE ESPACIOS ──────────────────────────────
     El plano 2D procede del modelo 3D y no tiene "habitaciones"
     con nombre identificables, asi que cada espacio interactuable
     se localiza mediante un pin visible (punto + etiqueta), igual
     que los marcadores del modo 3D. Hover y clic solo actuan
     sobre lo que esta dibujado: no quedan areas fantasma. */
  var RADIO_PIN = 7;      /* radio del punto, en unidades de mundo */
  var TOLERANCIA_PIN = 7; /* margen extra del punto al detectar */

  function centroDelEspacio(s) {
    return { x: s.x + s.ancho / 2, y: s.y + s.alto / 2 };
  }

  /* Color del punto segun la disponibilidad del espacio */
  function colorDelPin(s) {
    if (s.estado === 'inactivo') return colores.noDisponible;
    return colores.disponible;
  }

  /* Caja de la etiqueta del nombre (a la derecha del punto).
     Se comparte entre el dibujo y el hit-test para que el
     cursor detecte exactamente lo que se ve en pantalla. */
  function cajaEtiquetaPin(s, marcado) {
    var centro = centroDelEspacio(s);
    contexto.font = marcado ? 'bold 11px sans-serif' : '11px sans-serif';
    var ancho = contexto.measureText(s.nombre).width + 10;
    var alto = 16;
    return {
      x: centro.x + RADIO_PIN + 4,
      y: centro.y - alto / 2,
      ancho: ancho,
      alto: alto
    };
  }

  function dibujarPin(s) {
    var centro = centroDelEspacio(s);
    var esResaltado = estado.espacioResaltado && estado.espacioResaltado.id === s.id;
    var esSeleccionado = estado.espacioSeleccionado && estado.espacioSeleccionado.id === s.id;
    var marcado = esResaltado || esSeleccionado;

    /* Etiqueta con el nombre del espacio */
    var caja = cajaEtiquetaPin(s, marcado);
    contexto.fillStyle = colores.fondoEtiqueta;
    contexto.fillRect(caja.x, caja.y, caja.ancho, caja.alto);
    contexto.strokeStyle = marcado ? colores.ubicacion : colores.bordeEtiqueta;
    contexto.lineWidth = 1;
    contexto.strokeRect(caja.x, caja.y, caja.ancho, caja.alto);

    contexto.fillStyle = marcado ? colores.ubicacion : colores.textoEtiqueta;
    contexto.font = marcado ? 'bold 11px sans-serif' : '11px sans-serif';
    contexto.textAlign = 'left';
    contexto.textBaseline = 'middle';
    contexto.fillText(s.nombre, caja.x + 5, caja.y + caja.alto / 2);

    /* Halo del pin cuando esta resaltado o seleccionado */
    if (marcado) {
      contexto.beginPath();
      contexto.arc(centro.x, centro.y, RADIO_PIN + 5, 0, Math.PI * 2);
      contexto.fillStyle = esSeleccionado ? colores.seleccionado : colores.resaltado;
      contexto.fill();
    }

    /* Punto del pin */
    contexto.beginPath();
    contexto.arc(centro.x, centro.y, RADIO_PIN, 0, Math.PI * 2);
    contexto.fillStyle = marcado ? colores.ubicacion : colorDelPin(s);
    contexto.fill();
    contexto.strokeStyle = colores.anilloPin;
    contexto.lineWidth = 2;
    contexto.stroke();

    contexto.beginPath();
    contexto.arc(centro.x, centro.y, 2.5, 0, Math.PI * 2);
    contexto.fillStyle = colores.anilloPin;
    contexto.fill();

    /* Modo edicion: aro rojo discontinuo si el pin esta fuera de zona
       (rutas no podrian llegar) y punto azul si ya fue movido */
    if (modoEdicionPines) {
      if (pinInvalido(s)) {
        contexto.save();
        contexto.setLineDash([3, 3]);
        contexto.beginPath();
        contexto.arc(centro.x, centro.y, RADIO_PIN + 6, 0, Math.PI * 2);
        contexto.strokeStyle = colores.noDisponible;
        contexto.lineWidth = 2.5;
        contexto.stroke();
        contexto.restore();
      } else if (pinesModificados[s.id]) {
        contexto.beginPath();
        contexto.arc(centro.x + RADIO_PIN, centro.y - RADIO_PIN, 3.5, 0, Math.PI * 2);
        contexto.fillStyle = colores.ubicacion;
        contexto.fill();
      }
    }

    /* Aro dorado si es favorito */
    if (UniMap.favoritos && UniMap.favoritos.esFavorito &&
      UniMap.favoritos.esFavorito(s.id)) {
      contexto.beginPath();
      contexto.arc(centro.x, centro.y, RADIO_PIN + 2.5, 0, Math.PI * 2);
      contexto.strokeStyle = colores.favorito;
      contexto.lineWidth = 2;
      contexto.stroke();
    }
  }

  /* ── COORDENADAS ──────────────────────────────────── */
  function pantallaAMundo(sx, sy) {
    return {
      x: (sx - estado.desplazamientoX) / estado.nivelZoom,
      y: (sy - estado.desplazamientoY) / estado.nivelZoom
    };
  }

  /* Deteccion del cursor SOBRE LOS PINES DIBUJADOS (punto o
     etiqueta). Antes se comprobaba contra los rectangulos del
     antiguo diseño sintetico y el hover aparecia sobre areas
     vacias del plano redibujado. */
  function buscarEspacioEn(wx, wy) {
    var visibles = UniMap.filtros.espaciosInteractuales();
    for (var i = visibles.length - 1; i >= 0; i--) {
      var s = visibles[i];

      /* Punto del pin */
      var centro = centroDelEspacio(s);
      var dx = wx - centro.x, dy = wy - centro.y;
      var r = RADIO_PIN + TOLERANCIA_PIN;
      if (dx * dx + dy * dy <= r * r) return s;

      /* Etiqueta del nombre */
      var caja = cajaEtiquetaPin(s, false);
      if (wx >= caja.x && wx <= caja.x + caja.ancho &&
        wy >= caja.y && wy <= caja.y + caja.alto) return s;
    }
    return null;
  }

  /* ── INTERACCION (raton, tactil y pinza) ──────────── */
  var punteros = {};          // punteros activos: id -> {x, y}
  var arrastre = null;        // { inicioX, inicioY, movido }
  var pinza = null;           // distancia entre los dos dedos
  var arrastreReciente = false; // el ultimo gesto fue un arrastre
  var pinArrastrando = null;      // espacio cuyo pin se esta arrastrando (para reposicionar visualmente)
  var pinPosPrevia = null;        // {x, y} del pin antes de empezar el arrastre (por si no hay sitio valido)
  var ubicacionArrastrando = false;
  var modoEdicionPines = false;   // modo edicion: solo admin puede activarlo
  var pinesModificados = {};      // idEspacio -> {x, y} (coordenadas LOCALES de su torre) pendientes de guardar
  /* Estado independiente por modo: {1: TA, 2: TI, 0: Ambas torres} */
  var pisosOcultosPorModo = { 1: false, 2: false, 0: false };

  function modoActual() {
    return estado.edificioActual !== undefined ? estado.edificioActual : 1;
  }

  function pisosOcultos() {
    return pisosOcultosPorModo[modoActual()] || false;
  }

  function setPisosOcultos(valor) {
    pisosOcultosPorModo[modoActual()] = !!valor;
    try { localStorage.setItem('unimap_pisos_ocultos', JSON.stringify(pisosOcultosPorModo)); } catch (e) { /* sin storage */ }
  }

  function puntoEnLienzo(e) {
    var rect = lienzo.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function numeroDePunteros() {
    return Object.keys(punteros).length;
  }

  function distancia(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function esInteractable(espacio) {
    return UniMap.filtros && UniMap.filtros.esInteractable
      ? UniMap.filtros.esInteractable(espacio)
      : true;
  }


  /* ── VALIDACION DE POSICIONES (modo edicion) ──────────
     Las rutas (ruta.js) y los conectores dependen de la posicion
     de cada pin, asi que un pin solo se puede dejar en una celda
     TRANSITABLE de su planta: dentro del plano, dentro del contorno
     del edificio y fuera de los muros (mascara del modelo 3D).
     Si se suelta en un sitio invalido se ajusta a la celda valida
     mas cercana; si no hay ninguna, vuelve a donde estaba.
     Todo se calcula en coordenadas LOCALES de la torre (sin el
     desplazamiento de la torre 2 del modo "ambas torres"). */
  var AREA_PLANO = { x1: 135, y1: 65, x2: 665, y2: 535 }; // planta de 530x470 centrada en (400,300)
  var RADIO_BUSQUEDA = 160;

  function offsetDe(espacio) {
    return (estado.edificioActual === 0 && espacio.edificio === 2) ? (datos.OFFSET_TORRE_2 || 0) : 0;
  }

  function mascaraDe(edificio, piso) {
    return (UniMap.modelos && UniMap.modelos.mascaraListaSync)
      ? UniMap.modelos.mascaraListaSync(edificio, piso) : null;
  }

  function dentroDelArea(x, y) {
    return x >= AREA_PLANO.x1 && x <= AREA_PLANO.x2 && y >= AREA_PLANO.y1 && y <= AREA_PLANO.y2;
  }

  function limitarAlArea(x, y) {
    return {
      x: Math.min(AREA_PLANO.x2, Math.max(AREA_PLANO.x1, x)),
      y: Math.min(AREA_PLANO.y2, Math.max(AREA_PLANO.y1, y))
    };
  }

  function celdaBloqueada(m, x, y) {
    var c = Math.floor(x / m.celda), f = Math.floor(y / m.celda);
    if (c < 0 || f < 0 || c >= m.cols || f >= m.filas) return true;
    return m.data[f * m.cols + c] === 1;
  }

  /* margen = true exige ademas que ninguna celda vecina sea pared
     (asi la ruta, que "infla" los muros una celda, siempre llega) */
  function puntoTransitable(m, x, y, margen) {
    if (!dentroDelArea(x, y)) return false;
    if (!m) return true;
    if (celdaBloqueada(m, x, y)) return false;
    if (!margen) return true;
    for (var dy = -1; dy <= 1; dy++)
      for (var dx = -1; dx <= 1; dx++)
        if (celdaBloqueada(m, x + dx * m.celda, y + dy * m.celda)) return false;
    return true;
  }

  /* Devuelve el centro valido mas cercano a (cx, cy) o null */
  function ajustarCentro(edificio, piso, cx, cy) {
    var p = limitarAlArea(cx, cy);
    var m = mascaraDe(edificio, piso);
    if (puntoTransitable(m, p.x, p.y, true)) return p;
    if (!m) return p;
    var mejor = null, mejorD = Infinity, respaldo = null, respaldoD = Infinity;
    var paso = m.celda;
    for (var dy = -RADIO_BUSQUEDA; dy <= RADIO_BUSQUEDA; dy += paso) {
      for (var dx = -RADIO_BUSQUEDA; dx <= RADIO_BUSQUEDA; dx += paso) {
        var d = dx * dx + dy * dy;
        if (d > RADIO_BUSQUEDA * RADIO_BUSQUEDA) continue;
        var x = p.x + dx, y = p.y + dy;
        if (!puntoTransitable(m, x, y, false)) continue;
        if (d < respaldoD) { respaldoD = d; respaldo = { x: x, y: y }; }
        if (d < mejorD && puntoTransitable(m, x, y, true)) { mejorD = d; mejor = { x: x, y: y }; }
      }
    }
    return mejor || respaldo;
  }

  /* ¿El pin esta ahora mismo en una posicion que no sirve para rutas? */
  function pinInvalido(s) {
    var off = offsetDe(s);
    var cx = s.x + s.ancho / 2 - off, cy = s.y + s.alto / 2;
    return !puntoTransitable(mascaraDe(s.edificio, s.piso), cx, cy, false);
  }

  /* Pide las mascaras de los pisos visibles (no bloquea; repinta al llegar) */
  function cargarMascarasVisibles(cb) {
    if (!UniMap.modelos || !UniMap.modelos.mascaraNavegacion) { if (cb) cb(); return; }
    var vistos = {}, lista = [], visibles = UniMap.filtros.espaciosInteractuales
      ? UniMap.filtros.espaciosInteractuales() : [];
    for (var i = 0; i < visibles.length; i++) {
      var k = visibles[i].edificio + '-' + visibles[i].piso;
      if (!vistos[k]) { vistos[k] = true; lista.push([visibles[i].edificio, visibles[i].piso]); }
    }
    var faltan = lista.length;
    if (!faltan) { if (cb) cb(); return; }
    lista.forEach(function (pl) {
      UniMap.modelos.mascaraNavegacion(pl[0], pl[1], function () {
        if (--faltan === 0) { dibujar(); if (cb) cb(); }
      });
    });
  }

  /* Reaplica los cambios pendientes a los objetos recien construidos
     (al cambiar de piso o torre sin haber guardado todavia) */
  function aplicarPendientes() {
    if (!modoEdicionPines) return;
    var lista = estado.espacios || [];
    for (var i = 0; i < lista.length; i++) {
      var pen = pinesModificados[lista[i].id];
      if (!pen) continue;
      lista[i].x = pen.x + offsetDe(lista[i]);
      lista[i].y = pen.y;
    }
  }

  function buscarEnTodos(id) {
    var lista = estado.todosLosEspacios || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  }

  function lienzoPunto(e) {
    var rect = lienzo.getBoundingClientRect();
    return pantallaAMundo(e.clientX - rect.left, e.clientY - rect.top);
  }

  lienzo.addEventListener('pointerdown', function (e) {
    if (lienzo.setPointerCapture) {
      try { lienzo.setPointerCapture(e.pointerId); } catch (err) { /* sin soporte */ }
    }
    punteros[e.pointerId] = puntoEnLienzo(e);
    arrastreReciente = false;

    /* Detectar si se hace clic sobre un pin para arrastrarlo y reposicionarlo */
    var rect = lienzo.getBoundingClientRect();
    var mundo = pantallaAMundo(e.clientX - rect.left, e.clientY - rect.top);
    var pin = buscarEspacioEn(mundo.x, mundo.y);

    /* Solo en modo edicion y solo administrador / personal administrativo puede reposicionar pines */
    var puedeMoverPines = (modoEdicionPines && estado.usuarioActual && estado.usuarioActual.rol === 'admin');

    if (numeroDePunteros() === 1 && pin && esInteractable(pin) && puedeMoverPines) {
      /* Arrastrar el pin (reposicionar marcador) en vez de mover el mapa */
      pinArrastrando = pin;
      pinPosPrevia = { x: pin.x, y: pin.y };
      arrastre = null;
      estado.estaArrastrando = true;
      lienzo.style.cursor = 'grabbing';
      UniMap.tooltip.ocultar();
      return;
    }

    /* Detectar clic sobre el marcador "Usted aqui" para moverlo en modo edicion */
    var puedeMoverUbicacion = (modoEdicionPines && estado.usuarioActual && estado.usuarioActual.rol === 'admin');
    if (numeroDePunteros() === 1 && puedeMoverUbicacion) {
      var posUbi = estado.ubicacionUsuario || { x: 400, y: 280 };
      var dx = mundo.x - posUbi.x;
      var dy = mundo.y - posUbi.y;
      if (dx * dx + dy * dy <= 100) {
        ubicacionArrastrando = true;
        arrastre = null;
        estado.estaArrastrando = true;
        lienzo.style.cursor = 'grabbing';
        UniMap.tooltip.ocultar();
        return;
      }
    }

    if (numeroDePunteros() === 1 && !puedeMoverPines && pin) {
      /* No esta en modo edicion o no es admin: clic normal (abre ficha) pero no arrastra el pin */
      arrastre = null;
      estado.estaArrastrando = false;
      lienzo.style.cursor = 'pointer';
      return;
    }

    if (numeroDePunteros() === 1) {
      arrastre = {
        inicioX: e.clientX - estado.desplazamientoX,
        inicioY: e.clientY - estado.desplazamientoY,
        movido: false
      };
      estado.estaArrastrando = true;
      estado.inicioArrastre = { x: arrastre.inicioX, y: arrastre.inicioY };
      lienzo.style.cursor = 'grabbing';
    } else if (numeroDePunteros() === 2) {
      /* Segundo dedo: se pasa de arrastre a pinza */
      arrastre = null;
      var ids = Object.keys(punteros);
      pinza = distancia(punteros[ids[0]], punteros[ids[1]]);
      estado.estaArrastrando = true;
      UniMap.tooltip.ocultar();
    }
  });

  lienzo.addEventListener('pointermove', function (e) {
    if (punteros[e.pointerId]) punteros[e.pointerId] = puntoEnLienzo(e);

    /* ── Arrastrar el marcador "Usted aqui" ── */
    if (ubicacionArrastrando) {
      var mundoU = lienzoPunto(e);
      estado.ubicacionUsuario = { x: mundoU.x, y: mundoU.y };
      dibujar();
      arrastreReciente = true;
      return;
    }

    /* ── Arrastrar un pin: sigue al cursor (dentro del plano); al
       soltar se ajusta a una celda transitable ── */
    if (pinArrastrando) {
      var mundo = lienzoPunto(e);
      var offP = offsetDe(pinArrastrando);
      var lim = limitarAlArea(mundo.x - offP, mundo.y);
      pinArrastrando.x = lim.x - pinArrastrando.ancho / 2 + offP;
      pinArrastrando.y = lim.y - pinArrastrando.alto / 2;
      dibujar();
      arrastreReciente = true;
      return;
    }

    /* ── Pinza: dos dedos para hacer zoom ── */
    if (pinza && numeroDePunteros() >= 2) {
      var ids = Object.keys(punteros);
      var a = punteros[ids[0]];
      var b = punteros[ids[1]];
      var d = distancia(a, b);
      var centro = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

      if (pinza > 4 && d > 4) aplicarZoom(d / pinza, centro.x, centro.y);
      pinza = d;
      arrastreReciente = true;
      estado.estaArrastrando = true;
      UniMap.tooltip.ocultar();
      return;
    }

    /* ── Arrastre (raton o un dedo) ── */
    if (arrastre && estado.estaArrastrando) {
      var nuevoX = e.clientX - arrastre.inicioX;
      var nuevoY = e.clientY - arrastre.inicioY;

      if (Math.abs(nuevoX - estado.desplazamientoX) > 2 ||
        Math.abs(nuevoY - estado.desplazamientoY) > 2) {
        arrastre.movido = true;
      }

      if (arrastre.movido) {
        estado.desplazamientoX = nuevoX;
        estado.desplazamientoY = nuevoY;
        arrastreReciente = true;
        dibujar();
        UniMap.tooltip.ocultar();
      }
      return;
    }

    /* Dedo sobre el lienzo sin arrastre activo (fue una pinza):
       no se comporta como hover */
    if (estado.estaArrastrando) return;

    /* ── Hover sobre un espacio ── */
    var p = puntoEnLienzo(e);
    var mundo = pantallaAMundo(p.x, p.y);
    var encontrado = buscarEspacioEn(mundo.x, mundo.y);

    if (encontrado !== estado.espacioResaltado) {
      estado.espacioResaltado = encontrado;
      var interactuable = encontrado && esInteractable(encontrado);
      lienzo.style.cursor = interactuable ? 'pointer' : 'grab';
      dibujar();
      if (interactuable) UniMap.tooltip.mostrar(encontrado, e.clientX, e.clientY);
      else UniMap.tooltip.ocultar();
    }
  });

  function soltarPuntero(e) {
    delete punteros[e.pointerId];
    if (numeroDePunteros() < 2) pinza = null;

    if (lienzo.releasePointerCapture) {
      try { lienzo.releasePointerCapture(e.pointerId); } catch (err) { /* ya liberado */ }
    }

    if (numeroDePunteros() === 0) {
      /* Pin soltado en modo edicion: ajustar a una celda transitable */
      if (pinArrastrando && modoEdicionPines) {
        var pin = pinArrastrando;
        var off = offsetDe(pin);
        var ajust = ajustarCentro(pin.edificio, pin.piso,
          pin.x + pin.ancho / 2 - off, pin.y + pin.alto / 2);
        if (ajust) {
          pin.x = Math.round(ajust.x - pin.ancho / 2) + off;
          pin.y = Math.round(ajust.y - pin.alto / 2);
          pinesModificados[pin.id] = { x: pin.x - off, y: pin.y };
        } else {
          /* no hay ningun sitio valido cerca: vuelve a su posicion */
          pin.x = pinPosPrevia.x;
          pin.y = pinPosPrevia.y;
          util.notificar('Ahi no hay camino transitable: el marcador vuelve a su posicion', 3500);
        }
        pinArrastrando = null;
        pinPosPrevia = null;
        arrastreReciente = true;
      }
      if (ubicacionArrastrando) {
        var ed = estado.ubicacionEdificio || (estado.edificioActual === 0 ? 1 : estado.edificioActual);
        var pisoU = estado.ubicacionPiso != null ? estado.ubicacionPiso : estado.pisoActual;
        var pu = estado.ubicacionUsuario || { x: 400, y: 280 };
        var aj = ajustarCentro(ed, pisoU, pu.x, pu.y);
        if (aj) estado.ubicacionUsuario = { x: Math.round(aj.x), y: Math.round(aj.y) };
        ubicacionArrastrando = false;
        arrastreReciente = true;
      }
      if (arrastre && arrastre.movido) arrastreReciente = true;
      arrastre = null;
      estado.estaArrastrando = false;
      lienzo.style.cursor = estado.espacioResaltado ? 'pointer' : 'grab';
    }
  }

  lienzo.addEventListener('pointerup', soltarPuntero);
  lienzo.addEventListener('pointercancel', soltarPuntero);

  lienzo.addEventListener('pointerleave', function () {
    /* No interrumpir un arrastre o una pinza en curso */
    if (arrastre || pinza || estado.estaArrastrando) return;

    estado.espacioResaltado = null;
    dibujar();

    /* La ficha seleccionada se mantiene; solo se cierra la de hover */
    if (estado.espacioSeleccionado) return;
    var elementoTooltip = util.el('tooltip-mapa');
    clearTimeout(elementoTooltip._tooltipTimeout);
    elementoTooltip._tooltipTimeout = setTimeout(UniMap.tooltip.ocultar, 1500);
  });

  lienzo.addEventListener('click', function (e) {
    /* Un arrastre no debe abrir la ficha del punto de llegada */
    if (arrastreReciente) { arrastreReciente = false; return; }
    if (estado.estaArrastrando) return;

    var rect = lienzo.getBoundingClientRect();
    var mundo = pantallaAMundo(e.clientX - rect.left, e.clientY - rect.top);
    var encontrado = buscarEspacioEn(mundo.x, mundo.y);

    var interactuable = encontrado && esInteractable(encontrado);

    if (interactuable) {
      estado.espacioSeleccionado = encontrado;
      /* HU-14: contar la consulta directa sobre el plano */
      if (UniMap.estadisticas) UniMap.estadisticas.registrar(encontrado.id);
      dibujar();
      UniMap.tooltip.mostrar(encontrado, e.clientX, e.clientY);
    } else {
      estado.espacioSeleccionado = null;
      UniMap.tooltip.ocultar();
      dibujar();
    }
  });

  /* Zoom con rueda */
  lienzo.addEventListener('wheel', function (e) {
    e.preventDefault();
    var rect = lienzo.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var factor = e.deltaY > 0 ? 0.9 : 1.1;
    aplicarZoom(factor, mx, my);
  }, { passive: false });

  function aplicarZoom(factor, mx, my) {
    var nuevo = estado.nivelZoom * factor;
    if (nuevo > 3) nuevo = 3;
    if (nuevo < 0.5) nuevo = 0.5;
    estado.desplazamientoX = mx - (mx - estado.desplazamientoX) * (nuevo / estado.nivelZoom);
    estado.desplazamientoY = my - (my - estado.desplazamientoY) * (nuevo / estado.nivelZoom);
    estado.nivelZoom = nuevo;
    dibujar();
  }

  /* Botones de zoom */
  function conectarZoom() {
    var acercar = util.el('zoom-acercar');
    var alejar = util.el('zoom-alejar');
    var reiniciar = util.el('zoom-reiniciar');

    if (acercar) acercar.addEventListener('click', function () {
      aplicarZoom(1.25, lienzo.width / 2, lienzo.height / 2);
    });

    if (alejar) alejar.addEventListener('click', function () {
      aplicarZoom(0.8, lienzo.width / 2, lienzo.height / 2);
    });

    if (reiniciar) reiniciar.addEventListener('click', function () {
      estado.nivelZoom = 1;
      estado.desplazamientoX = 0;
      estado.desplazamientoY = 0;
      dibujar();
    });
  }

  /* ── SELECTOR DE PISO Y TORRE ─────────────────────── */
  /* Encuadrado de la vista: al mostrar las dos torres juntas el plano
     se ensancha, asi que hay que alejar la camara para verlas todas. */
  function encuadrarAmbasTorres() {
    if (!lienzo || !lienzo.width) return;
    var anchoPlano = 800 + (datos.OFFSET_TORRE_2 || 0);
    var escala = Math.min(1, (lienzo.width - 40) / anchoPlano);
    estado.nivelZoom = Math.max(0.3, escala);
    estado.desplazamientoX = (lienzo.width - anchoPlano * estado.nivelZoom) / 2;
    estado.desplazamientoY = (lienzo.height - 600 * estado.nivelZoom) / 2;
  }

  function encuadrarPlantaNormal() {
    estado.nivelZoom = 1;
    estado.desplazamientoX = 0;
    estado.desplazamientoY = 0;
  }

  /* Devuelve el piso de la lista mas cercano al pedido (para cuando
     el piso no existe en la torre seleccionada: p. ej. la TA no
     tiene planta baja y la TI no tiene el piso 5) */
  function pisoCercano(piso, pisos) {
    if (!pisos || !pisos.length) return piso;
    if (pisos.indexOf(piso) !== -1) return piso;
    var mejor = pisos[0];
    for (var i = 0; i < pisos.length; i++) {
      if (Math.abs(pisos[i] - piso) < Math.abs(mejor - piso)) mejor = pisos[i];
    }
    return mejor;
  }

  function cambiarPiso(nuevoPiso, sincronizarBotones, torre) {
    /* Solo pisos que existen en la seleccion actual */
    var pisosValidos = datos.pisosDeVista ? datos.pisosDeVista(estado.edificioActual) : [0];
    nuevoPiso = pisoCercano(nuevoPiso, pisosValidos);

    if (estado.edificioActual === 0) {
      /* Modo ambas torres: cada torre tiene su piso independiente */
      if (torre === 2) {
        datos.establecerPisoTI(nuevoPiso);
      } else {
        datos.establecerPisoTA(nuevoPiso);
        estado.pisoActual = nuevoPiso; /* para compatibilidad con etiqueta */
      }
    } else {
      estado.pisoActual = nuevoPiso;
    }

    /* Una sola fuente: torre 1, torre 2 o ambas (edificio 0) */
    estado.espacios = datos.espaciosDeVista
      ? datos.espaciosDeVista(estado.edificioActual, nuevoPiso)
      : datos.construirEspacios(estado.edificioActual || 1, nuevoPiso);

    estado.espacioSeleccionado = null;
    estado.espacioResaltado = null;
    /* Modo edicion: los cambios aun sin guardar siguen a la vista */
    aplicarPendientes();
    if (modoEdicionPines) cargarMascarasVisibles();

    if (sincronizarBotones !== false) refrescarBotonesPiso();

    var etiqueta = util.el('etiqueta-piso-actual');
    if (etiqueta) etiqueta.textContent = obtenerEtiquetaPiso();

    UniMap.tooltip.ocultar();
    refrescarVistas();
    /* Plano 2D del piso: redibujado desde el modelo 3D que le toca */
    solicitarPlanos();
  }

  function cambiarEdificio(nuevoEdificio, pisoDestino) {
    var anterior = estado.edificioActual;
    estado.edificioActual = nuevoEdificio;

    /* Reencuadrar al entrar o salir del modo "ambas torres" */
    if (nuevoEdificio === 0 && anterior !== 0) encuadrarAmbasTorres();
    else if (nuevoEdificio !== 0 && anterior === 0) encuadrarPlantaNormal();

    if (nuevoEdificio === 0) {
      /* Modo ambas torres: inicializar pisos independientes */
      datos.inicializarPisosDuales();
      var pisoTA = datos.obtenerPisoTA();
      var pisoTI = datos.obtenerPisoTI();
      estado.pisoActual = pisoTA;
      pisoDestino = pisoTA;
    } else {
      /* Ajustar el piso al rango valido de la nueva torre: si el
         piso actual no existe ahi, ir al valido mas cercano */
      var pisosValidos = datos.pisosDeVista ? datos.pisosDeVista(nuevoEdificio) : [0];
      var piso = (pisoDestino !== undefined && pisoDestino !== null) ? pisoDestino : estado.pisoActual;
      piso = pisoCercano(piso, pisosValidos);
      estado.pisoActual = piso;
      pisoDestino = piso;
    }

    /* Sincronizar el conmutador de torre */
    var botonesTorre = document.querySelectorAll('.boton-torre');
    for (var t = 0; t < botonesTorre.length; t++) {
      botonesTorre[t].classList.toggle('active',
        parseInt(botonesTorre[t].getAttribute('data-building'), 10) === nuevoEdificio);
    }

    generarBotonesPiso();
    cambiarPiso(pisoDestino);

    util.notificar(nuevoEdificio === 0
      ? (UniMap.i18n ? UniMap.i18n.t('torre.ambos') : 'Ambas torres')
      : (datos.nombreEdificio ? datos.nombreEdificio(nuevoEdificio) : ''));
  }

  function generarBotonesPiso() {
    var contenedor = util.el('selector-pisos');
    if (!contenedor) return;

    var ojo =
      '<button id="boton-ocultar-pisos" class="boton-ojo-pisos" title="Ocultar / Mostrar pisos" ' +
      'aria-label="Ocultar / Mostrar botones de pisos" data-i18n-title="top.ocultarPisos" aria-pressed="false">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
      '<circle cx="12" cy="12" r="3"/></svg></button>';

    var html = '';

    /* ── Modo AMBAS TORRES (TA + TI): dos columnas ── */
    if (estado.edificioActual === 0) {
      contenedor.setAttribute('data-edificio', '0');

      var pisosTA = (datos.pisosDe && datos.pisosDe(1)) || (datos.edificios && datos.edificios[0] && datos.edificios[0].pisos) || [];
      var pisosTI = (datos.pisosDe && datos.pisosDe(2)) || (datos.edificios && datos.edificios[1] && datos.edificios[1].pisos) || [];

      /* Orden de mayor a menor (como el selector original) */
      pisosTA = pisosTA.slice().sort(function (a, b) { return b - a; });
      pisosTI = pisosTI.slice().sort(function (a, b) { return b - a; });

      html += ojo;
      html += '<div class="floor-cols">';

      /* Columna TA */
      html += '<div class="floor-col" data-torre-col="1">';
      html += '<span class="floor-col-label">TA</span>';
      for (var i = 0; i < pisosTA.length; i++) {
        var pTA = pisosTA[i];
        var etTA = pTA === 0 ? 'PB' : 'P' + pTA;
        var actTA = '';
        var pisoTAAct = datos.obtenerPisoTA ? datos.obtenerPisoTA() : estado.pisoActual;
        if (pTA === pisoTAAct) actTA = ' active';
        html += '<button class="boton-piso' + actTA + '" data-floor="' + pTA + '" data-torre="1">' + etTA + '</button>';
      }
      html += '</div>';

      /* Columna TI */
      html += '<div class="floor-col" data-torre-col="2">';
      html += '<span class="floor-col-label">TI</span>';
      for (var j = 0; j < pisosTI.length; j++) {
        var pTI = pisosTI[j];
        var etTI = pTI === 0 ? 'PB' : 'P' + pTI;
        var actTI = '';
        var pisoTIAct = datos.obtenerPisoTI ? datos.obtenerPisoTI() : estado.pisoActual;
        if (pTI === pisoTIAct) actTI = ' active';
        html += '<button class="boton-piso' + actTI + '" data-floor="' + pTI + '" data-torre="2">' + etTI + '</button>';
      }
      html += '</div>';

      html += '</div>'; /* .floor-cols */

      contenedor.innerHTML = html;
      conectarSelectorPisoDual();
      conectarBotonOcultarPisos();
      aplicarVisibilidadPisos();
      return;
    }

    /* ── Una sola torre ── */
    contenedor.setAttribute('data-edificio', String(estado.edificioActual));

    var pisos = (datos.pisosDe && datos.pisosDe(estado.edificioActual)) || [];
    pisos = pisos.slice().sort(function (a, b) { return b - a; });

    html += ojo;
    for (var k = 0; k < pisos.length; k++) {
      var p = pisos[k];
      var etiqueta = p === 0 ? 'PB' : 'P' + p;
      var activo = p === estado.pisoActual ? ' active' : '';
      html += '<button class="boton-piso' + activo + '" data-floor="' + p +
        '" data-torre="' + estado.edificioActual + '">' + etiqueta + '</button>';
    }

    contenedor.innerHTML = html;
    conectarSelectorPiso();
    conectarBotonOcultarPisos();
    aplicarVisibilidadPisos();
  }

  /* Botones activos / desactivados segun los filtros de piso */
  function refrescarBotonesPiso() {
    var botones = document.querySelectorAll('.boton-piso');
    for (var b = 0; b < botones.length; b++) {
      var piso = parseInt(botones[b].getAttribute('data-floor'), 10);
      var torreBtn = parseInt(botones[b].getAttribute('data-torre'), 10);
      var permitido = !estado.filtros ||
        !estado.filtros.pisos ||
        estado.filtros.pisos.indexOf(piso) !== -1;

      botones[b].disabled = !permitido;
      botones[b].classList.toggle('deshabilitado', !permitido);

      var pisoActivo;
      if (estado.edificioActual === 0) {
        pisoActivo = (torreBtn === 2)
          ? (datos.obtenerPisoTI ? datos.obtenerPisoTI() : estado.pisoActual)
          : (datos.obtenerPisoTA ? datos.obtenerPisoTA() : estado.pisoActual);
      } else {
        pisoActivo = estado.pisoActual;
      }
      botones[b].classList.toggle('active', permitido && piso === pisoActivo);
    }
  }

  function conectarSelectorPiso() {
    var botones = document.querySelectorAll('.boton-piso');
    for (var b = 0; b < botones.length; b++) {
      botones[b].addEventListener('click', function () {
        if (this.disabled) return;
        var piso = parseInt(this.getAttribute('data-floor'), 10);
        if (estado.filtros.pisos.indexOf(piso) === -1) {
          util.notificar(UniMap.i18n.t('filtros.pisoOculto'));
          return;
        }
        cambiarPiso(piso);
      });
    }
  }

  function conectarSelectorPisoDual() {
    var botones = document.querySelectorAll('.boton-piso[data-torre]');
    for (var b = 0; b < botones.length; b++) {
      botones[b].addEventListener('click', function () {
        if (this.disabled) return;
        var piso = parseInt(this.getAttribute('data-floor'), 10);
        var torre = parseInt(this.getAttribute('data-torre'), 10);
        if (estado.filtros && estado.filtros.pisos && estado.filtros.pisos.indexOf(piso) === -1) {
          util.notificar(UniMap.i18n.t('filtros.pisoOculto'));
          return;
        }
        /* Sincronizar con la otra torre automáticamente */
        if (torre === 1) {
          /* Clic en TA: establecer TA y su equivalente en TI */
          datos.establecerPisoTA(piso);
          var pisoTI = datos.pisoEquivalenteTAaTI ? datos.pisoEquivalenteTAaTI(piso) : null;
          if (pisoTI !== null) datos.establecerPisoTI(pisoTI);
          estado.pisoActual = piso;
        } else if (torre === 2) {
          /* Clic en TI: establecer TI y su equivalente en TA */
          datos.establecerPisoTI(piso);
          var pisoTA = datos.pisoEquivalenteTIAaTA ? datos.pisoEquivalenteTIAaTA(piso) : null;
          if (pisoTA !== null) datos.establecerPisoTA(pisoTA);
          estado.pisoActual = piso;
        }
        /* Pintar el mapa con los pisos de ambas torres */
        estado.espacios = datos.espaciosDeVista
          ? datos.espaciosDeVista(estado.edificioActual, estado.pisoActual)
          : datos.construirEspacios(estado.edificioActual || 1, estado.pisoActual);
        estado.espacioSeleccionado = null;
        estado.espacioResaltado = null;
        aplicarPendientes();
        if (modoEdicionPines) cargarMascarasVisibles();
        /* Repintar la lista de pisos para que se vea la sincronización visual */
        generarBotonesPiso();
        var etiqueta = util.el('etiqueta-piso-actual');
        if (etiqueta) etiqueta.textContent = obtenerEtiquetaPiso();
        UniMap.tooltip.ocultar();
        refrescarVistas();
        solicitarPlanos();
      });
    }
  }

  function conectarSelectorTorre() {
    var botones = document.querySelectorAll('.boton-torre');
    for (var b = 0; b < botones.length; b++) {
      botones[b].addEventListener('click', function () {
        var edificio = parseInt(this.getAttribute('data-building'), 10);
        if (edificio === estado.edificioActual) return;

        var ocultas = (estado.filtros && estado.filtros.edificios) || null;
        if (edificio === 0) {
          /* "Ambas torres": al menos una de las dos debe estar visible */
          var algunaVisible = !ocultas || ocultas.indexOf(1) !== -1 || ocultas.indexOf(2) !== -1;
          if (!algunaVisible) {
            util.notificar(UniMap.i18n.t('filtros.torreOculta'));
            return;
          }
        } else if (ocultas && ocultas.indexOf(edificio) === -1) {
          util.notificar(UniMap.i18n.t('filtros.torreOculta'));
          return;
        }

        cambiarEdificio(edificio);
      });
    }
  }

  /* ── OCULTAR / MOSTRAR BOTONES DE PISO (independiente por modo) ── */
  function aplicarVisibilidadPisos() {
    var contenedor = util.el('selector-pisos');
    var btn = util.el('boton-ocultar-pisos');
    if (!contenedor) return;

    var ocultar = pisosOcultos();

    /* Cuando esta oculto: ocultar TODO excepto el boton ojo
       (grupos de pisos, header, fondo). Solo queda el ojo. */
    contenedor.classList.toggle('pisos-ocultos', ocultar);

    if (btn) {
      btn.classList.toggle('activo', ocultar);
      btn.setAttribute('aria-pressed', String(ocultar));
      /* SVG del ojo: abierto = visible, tachado = oculto */
      var svg = btn.querySelector('svg');
      if (svg) {
        if (ocultar) {
          /* Ojo tachado */
          svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" fill="none" stroke-width="2.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" fill="none" stroke-width="2.5"/><path d="M4.93 4.93l14.14 14.14" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round"/>';
        } else {
          /* Ojo abierto */
          svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" fill="none" stroke-width="2.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" fill="none" stroke-width="2.5"/>';
        }
      }
    }
  }

  function togglearPisos() {
    setPisosOcultos(!pisosOcultos());
    aplicarVisibilidadPisos();
  }

  function conectarBotonOcultarPisos() {
    var btn = util.el('boton-ocultar-pisos');
    if (btn) {
      btn.addEventListener('click', togglearPisos);
    }
  }

  /* Cargar estado guardado por modo desde localStorage */
  function cargarEstadoPisosOcultos() {
    try {
      var guardado = localStorage.getItem('unimap_pisos_ocultos');
      if (guardado) {
        var obj = JSON.parse(guardado);
        for (var k in obj) {
          if (obj.hasOwnProperty(k)) {
            pisosOcultosPorModo[parseInt(k, 10)] = !!obj[k];
          }
        }
      }
    } catch (e) { /* sin storage: valores por defecto (false) */ }
  }

  /* Refresca 2D + vista 3D (marcadores y planta) */
  function refrescarVistas() {
    dibujar();
    if (UniMap.vista3D) {
      if (UniMap.vista3D.sincronizarEstado) UniMap.vista3D.sincronizarEstado();
      else if (UniMap.vista3D.actualizarMarcadores) UniMap.vista3D.actualizarMarcadores();
    }
  }

  /* ── CENTRAR EN UN ESPACIO ────────────────────────── */
  function centrarEn(espacio) {
    var cx = espacio.x + espacio.ancho / 2;
    var cy = espacio.y + espacio.alto / 2;
    estado.desplazamientoX = lienzo.width / 2 - cx * estado.nivelZoom;
    estado.desplazamientoY = lienzo.height / 2 - cy * estado.nivelZoom;
    estado.espacioSeleccionado = espacio;
    dibujar();
  }

  /* ── INICIO ───────────────────────────────────────── */
  /* ── INICIO ───────────────────────────────────────── */
  function iniciar() {
    window.addEventListener('resize', function () {
      redimensionarLienzo();
      centrarVistaEnContenido({ margin: 0.82 });
      UniMap.tooltip.ocultar();
    });

    document.addEventListener('tema:cambiado', function () {
      colores = esOscuro() ? paletaOscura : paletaClara;
      if (UniMap.modelos && UniMap.modelos.invalidarPlanos) {
        UniMap.modelos.invalidarPlanos();
      }
      solicitarPlanos();
    });

    conectarZoom();
    conectarSelectorTorre();
    conectarBotonOcultarPisos();
    cargarEstadoPisosOcultos();
    generarBotonesPiso();
    aplicarVisibilidadPisos();
    redimensionarLienzo();
    solicitarPlanos();

    /* Centrar cuando el canvas ya tiene tamaño real */
    centrarCuandoListe();

    animar();
  }
  function animar() {
    dibujar();
    requestAnimationFrame(animar);
  }

  /* ── MODO EDICION DE POSICIONES (solo admin) ───────── */
  function esAdmin() {
    return !!(estado.usuarioActual && estado.usuarioActual.rol === 'admin');
  }

  function pintarBotonesEdicion(activo) {
    var btnEditar = util.el('boton-editar-posiciones');
    var btnGuardar = util.el('boton-guardar-posiciones');
    if (btnEditar) {
      btnEditar.classList.toggle('activo', activo);
      var clave = activo ? 'top.cancelarEdicion' : 'top.editarPosiciones';
      btnEditar.setAttribute('data-i18n-title', clave);
      btnEditar.title = UniMap.i18n ? UniMap.i18n.t(clave) : (activo ? 'Cancelar edicion' : 'Editar posiciones');
    }
    if (btnGuardar) btnGuardar.classList.toggle('hidden', !activo);
    lienzo.style.cursor = activo ? 'crosshair' : (estado.espacioResaltado ? 'pointer' : 'grab');
  }

  function activarEdicionPosiciones() {
    if (!esAdmin()) {
      util.notificar(UniMap.i18n ? UniMap.i18n.t('adm.sinPermisos') : 'Solo administrador');
      return;
    }
    modoEdicionPines = true;
    pinesModificados = {};
    pintarBotonesEdicion(true);
    util.notificar('Modo edicion: arrastra los puntos verdes dentro del plano y pulsa Guardar. ' +
      'Los que estan en rojo estan fuera de zona.', 5500);
    dibujar();

    /* Con las mascaras cargadas se sabe cuantos pines estan mal */
    cargarMascarasVisibles(function () {
      var visibles = UniMap.filtros.espaciosInteractuales ? UniMap.filtros.espaciosInteractuales() : [];
      var fuera = 0;
      for (var i = 0; i < visibles.length; i++) if (pinInvalido(visibles[i])) fuera++;
      if (modoEdicionPines && fuera > 0) {
        util.notificar(fuera + ' marcador(es) fuera de zona en este piso (aro rojo): arrastralos al plano', 5000);
      }
    });

    /* Activar tambien modo edicion en 3D */
    if (UniMap.vista3D && UniMap.vista3D.activarEdicionPosiciones) UniMap.vista3D.activarEdicionPosiciones();
  }

  /* Cancelar: descarta lo no guardado reconstruyendo los espacios
     desde su fuente (backend + cambios ya guardados) */
  function desactivarEdicionPosiciones() {
    modoEdicionPines = false;
    pinesModificados = {};
    pinArrastrando = null;
    pinPosPrevia = null;
    pintarBotonesEdicion(false);
    if (UniMap.vista3D && UniMap.vista3D.desactivarEdicionPosiciones) UniMap.vista3D.desactivarEdicionPosiciones();
    if (UniMap.personalizacion) UniMap.personalizacion.reconstruir();
    refrescarVistas();
    if (UniMap.i18n) UniMap.i18n.aplicar();
  }

  /* Tras mover pines, la ruta activa se recalcula con las posiciones nuevas
     (si no, seguiria dibujando el trazado viejo) */
  function recalcularRutaActiva() {
    var ra = estado.rutaActiva;
    if (!ra || !UniMap.ruta || !UniMap.ruta.trazar) return;
    var destino = buscarEnTodos(ra.espacioId);
    if (destino) UniMap.ruta.trazar(destino, ra.modo);
    else if (UniMap.ruta.limpiar) UniMap.ruta.limpiar();
  }

  /* Envia las posiciones al backend (PUT /api/admin/espacios/{id}).
     Hasta que el backend confirma, el cambio vive en localStorage; si
     esta apagado se encola y se reintenta solo (api.js) */
  function sincronizarPines(ids) {
    if (!ids.length || !UniMap.api || !UniMap.api.activa || !UniMap.api.activa()) return;
    if (!UniMap.api.token()) {
      util.notificar('Posiciones guardadas solo en este navegador: inicia sesion con el backend para guardarlas en la base de datos', 6000);
      return;
    }
    var okIds = [], pendientes = 0, fallos = 0, detalle = '';
    var cadena = Promise.resolve();
    ids.forEach(function (id) {
      cadena = cadena.then(function () {
        return UniMap.api.sincronizarEspacio(id).then(function (r) {
          if (r.ok) okIds.push(id);
          else if (r.motivo === 'pendiente') pendientes++;
          else { fallos++; if (r.mensaje) detalle = r.mensaje; }
        });
      });
    });
    cadena.then(function () {
      if (okIds.length) {
        UniMap.api.cargarEspaciosRemotos().then(function (cargados) {
          if (cargados) liberarOverridesSincronizados(okIds);
          UniMap.personalizacion.reconstruir();
          refrescarVistas();
        });
      }
      var msg = okIds.length + ' posicion(es) guardada(s) en la base de datos';
      if (pendientes) msg += ' · ' + pendientes + ' pendiente(s) (backend sin respuesta, se reintenta solo)';
      if (fallos) msg += ' · ' + fallos + ' con error' + (detalle ? ': ' + detalle : '');
      util.notificar(msg, 6000);
    });
  }

  /* Una vez que el backend devuelve la misma posicion, se quita el
     override local de x/y: asi la base de datos es la unica verdad y un
     valor viejo de este navegador no pisa lo que guarde otro admin */
  function liberarOverridesSincronizados(ids) {
    var remotos = (UniMap.api.espaciosRemotos && UniMap.api.espaciosRemotos()) || [];
    var cambios = UniMap.personalizacion.obtenerCambios();
    ids.forEach(function (id) {
      if (!/^b\d+$/.test(id) || !cambios[id]) return;
      for (var i = 0; i < remotos.length; i++) {
        if (remotos[i].id !== id) continue;
        if (Math.abs(remotos[i].x - cambios[id].x) <= 1 && Math.abs(remotos[i].y - cambios[id].y) <= 1) {
          UniMap.personalizacion.quitarCampos(id, ['x', 'y']);
        }
        return;
      }
    });
  }

  function guardarPosiciones() {
    var ids = [], rechazados = 0;

    Object.keys(pinesModificados).forEach(function (id) {
      var pen = pinesModificados[id];
      var esp = buscarEnTodos(id);
      if (!esp) { rechazados++; return; }
      /* Ultima comprobacion: solo se guarda una posicion transitable */
      var aj = ajustarCentro(esp.edificio, esp.piso, pen.x + esp.ancho / 2, pen.y + esp.alto / 2);
      if (!aj) { rechazados++; return; }
      UniMap.personalizacion.guardarEdicion(id, {
        x: Math.round(aj.x - esp.ancho / 2),
        y: Math.round(aj.y - esp.alto / 2)
      });
      ids.push(id);
    });

    /* Cambios hechos en la vista 3D (devuelve los ids guardados) */
    var ids3d = (UniMap.vista3D && UniMap.vista3D.guardarPosiciones3D)
      ? (UniMap.vista3D.guardarPosiciones3D() || []) : [];
    ids3d.forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });

    if (ids.length === 0) {
      util.notificar(rechazados
        ? 'No se pudo guardar: ' + rechazados + ' marcador(es) sin posicion valida'
        : 'No hay cambios que guardar');
      return;
    }

    /* Salir del modo edicion SIN restaurar: ya esta guardado */
    modoEdicionPines = false;
    pinesModificados = {};
    pintarBotonesEdicion(false);
    if (UniMap.vista3D && UniMap.vista3D.desactivarEdicionPosiciones) UniMap.vista3D.desactivarEdicionPosiciones();
    /* Reconstruir desde lo guardado: garantiza que lo que se ve es lo que quedo */
    if (UniMap.personalizacion) UniMap.personalizacion.reconstruir();
    refrescarVistas();
    if (UniMap.i18n) UniMap.i18n.aplicar();

    util.notificar(ids.length + ' posicion(es) guardada(s)' +
      (rechazados ? ' · ' + rechazados + ' descartada(s) por no tener sitio valido' : ''), 3500);

    recalcularRutaActiva();
    sincronizarPines(ids);
  }
  /* =========================================================
     Centrar el plano 2D en el canvas visible
     ========================================================= */
  function obtenerBoundsPlano() {
    /* 1) Si ya calculas bounds al dibujar, úsalos */
    if (estado && estado.boundsPlano &&
      isFinite(estado.boundsPlano.minX) &&
      isFinite(estado.boundsPlano.maxX)) {
      return estado.boundsPlano;
    }

    /* 2) Si tienes ancho/alto fijos del plano */
    if (estado && estado.anchoPlano && estado.altoPlano) {
      return {
        minX: 0,
        minY: 0,
        maxX: estado.anchoPlano,
        maxY: estado.altoPlano
      };
    }

    /* 3) Fallback del tamaño típico de tus plantas */
    return { minX: 0, minY: 0, maxX: 900, maxY: 700 };
  }

  function leerEscala() {
    if (!estado) return 1;
    if (typeof estado.escala === 'number') return estado.escala;
    if (typeof estado.zoom === 'number') return estado.zoom;
    if (typeof estado.scale === 'number') return estado.scale;
    return 1;
  }

  function escribirEscala(v) {
    if (!estado) return;
    if ('escala' in estado) estado.escala = v;
    else if ('zoom' in estado) estado.zoom = v;
    else if ('scale' in estado) estado.scale = v;
    else estado.escala = v;
  }

  function escribirPan(x, y) {
    if (!estado) return;
    if ('offsetX' in estado) {
      estado.offsetX = x;
      estado.offsetY = y;
    } else if ('panX' in estado) {
      estado.panX = x;
      estado.panY = y;
    } else if ('traslacionX' in estado) {
      estado.traslacionX = x;
      estado.traslacionY = y;
    } else if ('camara' in estado && estado.camara) {
      estado.camara.x = x;
      estado.camara.y = y;
    } else {
      estado.offsetX = x;
      estado.offsetY = y;
    }
  }

  /**
   * Centra el contenido del piso actual en el canvas.
   * @param {object} [opts]
   * @param {number} [opts.margin=0.82]  fracción del canvas a usar (0.82 = 18% margen)
   * @param {boolean} [opts.soloPan=false]  si true, no cambia el zoom
   */
  function centrarVistaEnContenido(opts) {
    opts = opts || {};
    var margin = typeof opts.margin === 'number' ? opts.margin : 0.82;
    var soloPan = !!opts.soloPan;

    var canvas = document.getElementById('lienzo-mapa');
    if (!canvas) return;

    var w = canvas.clientWidth || canvas.width;
    var h = canvas.clientHeight || canvas.height;
    if (!w || !h) return;

    var bounds = obtenerBoundsPlano();
    var bw = Math.max(40, (bounds.maxX - bounds.minX));
    var bh = Math.max(40, (bounds.maxY - bounds.minY));
    var cx = bounds.minX + bw / 2;
    var cy = bounds.minY + bh / 2;

    var esc = leerEscala();

    if (!soloPan) {
      var escalaX = (w * margin) / bw;
      var escalaY = (h * margin) / bh;
      esc = Math.min(escalaX, escalaY);
      if (esc < 0.2) esc = 0.2;
      if (esc > 3) esc = 3;
      escribirEscala(esc);
    }

    /* Centro del plano → centro del canvas */
    escribirPan(w / 2 - cx * esc, h / 2 - cy * esc);

    if (typeof dibujar === 'function') {
      dibujar();
    } else if (UniMap.mapa2D && typeof UniMap.mapa2D.dibujar === 'function') {
      UniMap.mapa2D.dibujar();
    }

    /* Actualiza etiqueta de zoom si existe */
    var zoomEl = document.getElementById('nivel-zoom');
    if (zoomEl) {
      zoomEl.textContent = Math.round(esc * 100) + '%';
    }
  }

  /** Llama tras layout (el canvas ya tiene tamaño real) */
  function centrarCuandoListe() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        centrarVistaEnContenido({ margin: 0.82 });
      });
    });
  }
  /* =========================================================
   Centrar plano 2D (variables reales del proyecto)
   estado.desplazamientoX / desplazamientoY / nivelZoom
   Mundo del plano: 800 x 600 (+ OFFSET_TORRE_2 si TA+TI)
   ========================================================= */
  function obtenerBoundsPlano() {
    var offsetTorre2 = (datos && datos.OFFSET_TORRE_2) ? datos.OFFSET_TORRE_2 : 0;
    var ancho = (estado.edificioActual === 0) ? (800 + offsetTorre2) : 800;
    return {
      minX: 0,
      minY: 0,
      maxX: ancho,
      maxY: 600
    };
  }

  /**
   * Centra el piso actual en el canvas visible.
   * @param {object} [opts]
   * @param {number} [opts.margin=0.82]
   * @param {boolean} [opts.soloPan=false]
   */
  function centrarVistaEnContenido(opts) {
    opts = opts || {};
    var margin = typeof opts.margin === 'number' ? opts.margin : 0.82;
    var soloPan = !!opts.soloPan;

    if (!lienzo) return;

    var w = lienzo.width || lienzo.clientWidth;
    var h = lienzo.height || lienzo.clientHeight;
    if (!w || !h) return;

    var bounds = obtenerBoundsPlano();
    var bw = Math.max(40, bounds.maxX - bounds.minX);
    var bh = Math.max(40, bounds.maxY - bounds.minY);
    var cx = bounds.minX + bw / 2;
    var cy = bounds.minY + bh / 2;

    var esc = estado.nivelZoom || 1;

    if (!soloPan) {
      var escalaX = (w * margin) / bw;
      var escalaY = (h * margin) / bh;
      esc = Math.min(escalaX, escalaY);
      if (esc < 0.25) esc = 0.25;
      if (esc > 2.8) esc = 2.8;
      estado.nivelZoom = esc;
    }

    /* Centro del plano → centro del canvas */
    estado.desplazamientoX = w / 2 - cx * esc;
    estado.desplazamientoY = h / 2 - cy * esc;

    dibujar();

    var etiquetaZoom = util.el('nivel-zoom');
    if (etiquetaZoom) {
      etiquetaZoom.textContent = Math.round(esc * 100) + '%';
    }
  }

  function centrarCuandoListe() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        redimensionarLienzo();
        centrarVistaEnContenido({ margin: 0.82 });
      });
    });
  }
  UniMap.mapa2D = {
    iniciar: iniciar,
    dibujar: dibujar,
    centrarVista: centrarVistaEnContenido,
    centrarCuandoListe: centrarCuandoListe,
    refrescar: refrescarVistas,
    cambiarPiso: cambiarPiso,
    cambiarEdificio: cambiarEdificio,
    generarBotonesPiso: generarBotonesPiso,
    centrarEn: centrarEn,
    redimensionarLienzo: redimensionarLienzo,
    refrescarBotonesPiso: refrescarBotonesPiso,
    pantallaAMundo: pantallaAMundo,
    solicitarPlanos: solicitarPlanos,
    activarEdicionPosiciones: activarEdicionPosiciones,
    desactivarEdicionPosiciones: desactivarEdicionPosiciones,
    guardarPosiciones: guardarPosiciones,
    estaEnModoEdicion: function () { return modoEdicionPines; },
    ajustarCentro: ajustarCentro
  };
})();
