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
    nombreTorre: 'rgba(26,86,219,0.9)',
    chipUbicacion: 'rgba(26,86,219,0.9)',
    textoCarga: '#9ca3af'
  };

  var paletaOscura = {
    disponible: '#34d399',
    noDisponible: '#f87171',
    reservado: '#fbbf24',
    pared: '#94a3b8',
    piso: '#0e1626',
    lineaPiso: '#22304a',
    pasillo: '#18233a',
    ubicacion: '#3b82f6',
    cesped: '#34d399',
    estacionamiento: '#64748b',
    entrada: '#fbbf24',
    bordeEntrada: '#f59e0b',
    resaltado: 'rgba(59,130,246,0.28)',
    seleccionado: 'rgba(59,130,246,0.45)',
    favorito: '#fbbf24',
    sugerido: '#fde047',
    anilloPin: '#0b1220',
    fondoEtiqueta: 'rgba(14,22,38,0.92)',
    bordeEtiqueta: '#2e3d59',
    textoEtiqueta: '#e6ecf5',
    textoInsignia: '#93c5fd',
    nombreTorre: 'rgba(96,165,250,0.95)',
    chipUbicacion: 'rgba(37,99,235,0.95)',
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
  var pinArrastrando = null;
var ubicacionArrastrando = false;  // espacio cuyo pin se esta arrastrando (para reposicionar visualmente)
  var modoEdicionPines = false; // modo edicion: solo admin puede activarlo
  var pinesModificados = {};  // idEspacio -> {x, y} cambios pendientes de guardar
  var posicionesOriginales = {}; // idEspacio -> {x, y} posiciones antes de editar (para restaurar al cancelar)
  /* Estado independiente por modo: {1: TA, 2: TI, 0: Ambas torres} */
  var pisosOcultosPorModo = {1: false, 2: false, 0: false};

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
      var rect = lienzo.getBoundingClientRect();
      var mundo = pantallaAMundo(e.clientX - rect.left, e.clientY - rect.top);
      estado.ubicacionUsuario = { x: mundo.x, y: mundo.y };
      dibujar();
      arrastreReciente = true;
      return;
    }

    /* ── Arrastrar un pin para reposicionarlo visualmente ── */
    if (pinArrastrando) {
      var rect = lienzo.getBoundingClientRect();
      var mundo = pantallaAMundo(e.clientX - rect.left, e.clientY - rect.top);
      pinArrastrando.x = mundo.x - pinArrastrando.ancho / 2;
      pinArrastrando.y = mundo.y - pinArrastrando.alto / 2;
      /* Mantener dentro del plano */
      if (pinArrastrando.x < 0) pinArrastrando.x = 0;
      if (pinArrastrando.y < 0) pinArrastrando.y = 0;
      if (pinArrastrando.x + pinArrastrando.ancho > 800) pinArrastrando.x = 800 - pinArrastrando.ancho;
      if (pinArrastrando.y + pinArrastrando.alto > 600) pinArrastrando.y = 600 - pinArrastrando.alto;
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
      /* Si soltas un pin que estabas arrastrando en modo edicion, marca como modificado */
      if (pinArrastrando && modoEdicionPines) {
        pinesModificados[pinArrastrando.id] = {
          x: pinArrastrando.x,
          y: pinArrastrando.y
        };
        pinArrastrando = null;
        arrastreReciente = true;
      }
      if (ubicacionArrastrando) {
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

    /* Marcar el edificio actual en el contenedor para estilos CSS */
    contenedor.setAttribute('data-edificio', String(estado.edificioActual));

    /* Modo ambas torres: dos grupos de botones independientes (TA y TI) */
    if (estado.edificioActual === 0) {
      var pisosTA = datos.pisosDe ? datos.pisosDe(1) : [0];
      var pisosTI = datos.pisosDe ? datos.pisosDe(2) : [0];
      pisosTA = pisosTA.slice().sort(function (a, b) { return b - a; });
      pisosTI = pisosTI.slice().sort(function (a, b) { return b - a; });
      var pisoTAActual = datos.obtenerPisoTA ? datos.obtenerPisoTA() : estado.pisoActual;
      var pisoTIActual = datos.obtenerPisoTI ? datos.obtenerPisoTI() : estado.pisoActual;

      /* Boton ojo: mostrar/ocultar pisos (al principio, mas intuitivo) */
      var html = '';
      html += '<button id="boton-ocultar-pisos" class="boton-ojo-pisos" title="Ocultar / Mostrar pisos" aria-label="Ocultar / Mostrar botones de pisos" data-i18n-title="top.ocultarPisos" aria-pressed="false">';
      html += '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      html += '</button>';

      /* Modo ambas torres: dos grupos de pisos lado a lado con abreviaturas TA y TI */
      html += '<div class="floor-pares">';
      html += '<div class="floor-grupo"><strong>TA</strong>';
      for (var i = 0; i < pisosTA.length; i++) {
        var p = pisosTA[i];
        var etiqueta = p === 0 ? 'PB' : 'P' + p;
        var activo = p === pisoTAActual ? ' active' : '';
        html += '<button class="boton-piso' + activo + '" data-floor="' + p + '" data-torre="1">' + etiqueta + '</button>';
      }
      html += '</div>';

      html += '<div class="floor-grupo"><strong>TI</strong>';
      for (var j = 0; j < pisosTI.length; j++) {
        var p2 = pisosTI[j];
        var etiqueta2 = p2 === 0 ? 'PB' : 'P' + p2;
        var activo2 = p2 === pisoTIActual ? ' active' : '';
        html += '<button class="boton-piso' + activo2 + '" data-floor="' + p2 + '" data-torre="2">' + etiqueta2 + '</button>';
      }
      html += '</div>';
      html += '</div>';

      contenedor.innerHTML = html;
      conectarSelectorPisoDual();
      conectarBotonOcultarPisos();
      aplicarVisibilidadPisos();
      return;
    }

    /* Pisos reales de la seleccion actual (p. ej. TA 4-17) */
    var pisos = datos.pisosDeVista ? datos.pisosDeVista(estado.edificioActual) : [0];
    pisos = pisos.slice().sort(function (a, b) { return b - a; });

    /* Boton ojo: mostrar/ocultar pisos (al principio, mas intuitivo) */
    var html = '';
    html += '<button id="boton-ocultar-pisos" class="boton-ojo-pisos" title="Ocultar / Mostrar pisos" aria-label="Ocultar / Mostrar botones de pisos" data-i18n-title="top.ocultarPisos" aria-pressed="false">';
    html += '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    html += '</button>';

    /* De mayor a menor, como en el selector original */
    for (var i = 0; i < pisos.length; i++) {
      var p = pisos[i];
      var etiqueta = p === 0 ? 'PB' : 'P' + p;
      var activo = p === estado.pisoActual ? ' active' : '';
      html += '<button class="boton-piso' + activo + '" data-floor="' + p + '" data-torre="' + estado.edificioActual + '">' + etiqueta + '</button>';
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
  function iniciar() {
    window.addEventListener('resize', function () {
      redimensionarLienzo();
      UniMap.tooltip.ocultar();
    });
    /* Al cambiar el tema se cambia la paleta del lienzo y se
       vuelven a pedir los planos (estan cacheados con la
       paleta anterior). El bucle animar() repinta solo. */
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
    animar();
  }

  function animar() {
    dibujar();
    requestAnimationFrame(animar);
  }

  /* ── MODO EDICION DE POSICIONES (solo admin) ───────── */
  function activarEdicionPosiciones() {
    if (!estado.usuarioActual || estado.usuarioActual.rol !== 'admin') {
      util.notificar(UniMap.i18n ? UniMap.i18n.t('adm.sinPermisos') : 'Solo administrador');
      return;
    }
    /* Guardar snapshot de posiciones actuales antes de editar */
    var visibles = UniMap.filtros.espaciosInteractuales ? UniMap.filtros.espaciosInteractuales() : [];
    posicionesOriginales = {};
    for (var i = 0; i < visibles.length; i++) {
      var s = visibles[i];
      posicionesOriginales[s.id] = { x: s.x, y: s.y };
    }
    modoEdicionPines = true;
    pinesModificados = {};
    var btnEditar = util.el('boton-editar-posiciones');
    var btnGuardar = util.el('boton-guardar-posiciones');
    if (btnEditar) {
      btnEditar.classList.add('activo');
      btnEditar.setAttribute('data-i18n-title', 'top.cancelarEdicion');
      btnEditar.title = UniMap.i18n ? UniMap.i18n.t('top.cancelarEdicion') : 'Cancelar edicion';
    }
    if (btnGuardar) btnGuardar.classList.remove('hidden');
    lienzo.style.cursor = 'crosshair';
    util.notificar('Modo edicion activado: arrastra los marcadores donde quieras, luego pulsa Guardar o Cancelar', 5000);
    dibujar();
    /* Activar tambien modo edicion en 3D */
    if (UniMap.vista3D && UniMap.vista3D.activarEdicionPosiciones) UniMap.vista3D.activarEdicionPosiciones();
  }

  function desactivarEdicionPosiciones() {
    modoEdicionPines = false;
    /* Restaurar posiciones originales al cancelar */
    if (Object.keys(posicionesOriginales).length > 0) {
      var visibles = UniMap.filtros.espaciosInteractuales ? UniMap.filtros.espaciosInteractuales() : [];
      for (var i = 0; i < visibles.length; i++) {
        var s = visibles[i];
        var orig = posicionesOriginales[s.id];
        if (orig) {
          s.x = orig.x;
          s.y = orig.y;
        }
      }
    }
    pinesModificados = {};
    posicionesOriginales = {};
    var btnEditar = util.el('boton-editar-posiciones');
    var btnGuardar = util.el('boton-guardar-posiciones');
    if (btnEditar) {
      btnEditar.classList.remove('activo');
      btnEditar.setAttribute('data-i18n-title', 'top.editarPosiciones');
      btnEditar.title = UniMap.i18n ? UniMap.i18n.t('top.editarPosiciones') : 'Editar posiciones';
    }
    if (btnGuardar) btnGuardar.classList.add('hidden');
    lienzo.style.cursor = estado.espacioResaltado ? 'pointer' : 'grab';
    dibujar();
    /* Desactivar tambien modo edicion en 3D */
    if (UniMap.vista3D && UniMap.vista3D.desactivarEdicionPosiciones) UniMap.vista3D.desactivarEdicionPosiciones();
    /* Aplicar nuevo idioma si es necesario */
    UniMap.i18n.aplicar();
  }

  function guardarPosiciones() {
    var n2d = 0;
    for (var id in pinesModificados) {
      if (!pinesModificados.hasOwnProperty(id)) continue;
      UniMap.personalizacion.guardarEdicion(id, pinesModificados[id]);
      n2d++;
    }
    pinesModificados = {};
    posicionesOriginales = {};

    /* Guardar tambien cambios en 3D */
    var n3d = 0;
    if (UniMap.vista3D && UniMap.vista3D.guardarPosiciones3D) {
      n3d = Object.keys(pinesModificados3D).length;
      UniMap.vista3D.guardarPosiciones3D();
    }

    var total = n2d + n3d;
    if (total === 0) {
      util.notificar('No hay cambios que guardar');
      return;
    }
    util.notificar(total + ' posicion(es) guardada(s)');

    /* Desactivar modo edicion en ambos modos (SIN restaurar: ya se guardaron) */
    modoEdicionPines = false;
    var btnEditar = util.el('boton-editar-posiciones');
    var btnGuardar = util.el('boton-guardar-posiciones');
    if (btnEditar) {
      btnEditar.classList.remove('activo');
      btnEditar.setAttribute('data-i18n-title', 'top.editarPosiciones');
      btnEditar.title = UniMap.i18n ? UniMap.i18n.t('top.editarPosiciones') : 'Editar posiciones';
    }
    if (btnGuardar) btnGuardar.classList.add('hidden');
    lienzo.style.cursor = estado.espacioResaltado ? 'pointer' : 'grab';
    dibujar();
    if (UniMap.vista3D && UniMap.vista3D.desactivarEdicionPosiciones) UniMap.vista3D.desactivarEdicionPosiciones();
    UniMap.i18n.aplicar();
  }

  UniMap.mapa2D = {
    iniciar: iniciar,
    dibujar: dibujar,
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
    estaEnModoEdicion: function () { return modoEdicionPines; }
  };
})();
