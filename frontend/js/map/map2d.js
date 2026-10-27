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
      UniMap.modelos.pedirPlano(torres[t], estado.pisoActual, function () { /* repaint automatico */ });
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
      if (torre !== 0 && datos.tienePiso && !datos.tienePiso(torre, estado.pisoActual)) continue;
      var plano = (UniMap.modelos && UniMap.modelos.planoListo)
        ? UniMap.modelos.planoListo(torre, estado.pisoActual)
        : null;
      /* El desplazamiento de la torre 2 solo existe en modo combinado */
      var px = (torre === 2 && estado.edificioActual === 0) ? 40 + offsetTorre2 : 40;
      dibujarPlantaTorre(plano, px, 40, 530, 470);
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

  function cambiarPiso(nuevoPiso, sincronizarBotones) {
    /* Solo pisos que existen en la seleccion actual */
    if (datos.pisosDeVista) nuevoPiso = pisoCercano(nuevoPiso, datos.pisosDeVista(estado.edificioActual));
    estado.pisoActual = nuevoPiso;

    /* Una sola fuente: torre 1, torre 2 o ambas (edificio 0) con la
       torre 2 ya desplazada en X. Ver UniMap.datos.espaciosDeVista */
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

    /* Ajustar el piso al rango valido de la nueva torre: si el
       piso actual no existe ahi, ir al valido mas cercano */
    var pisosValidos = datos.pisosDeVista ? datos.pisosDeVista(nuevoEdificio) : [0];
    var piso = (pisoDestino !== undefined && pisoDestino !== null) ? pisoDestino : estado.pisoActual;
    piso = pisoCercano(piso, pisosValidos);
    estado.pisoActual = piso;

    /* Sincronizar el conmutador de torre */
    var botonesTorre = document.querySelectorAll('.boton-torre');
    for (var t = 0; t < botonesTorre.length; t++) {
      botonesTorre[t].classList.toggle('active',
        parseInt(botonesTorre[t].getAttribute('data-building'), 10) === nuevoEdificio);
    }

    generarBotonesPiso();
    cambiarPiso(piso);

    util.notificar(nuevoEdificio === 0
      ? (UniMap.i18n ? UniMap.i18n.t('torre.ambos') : 'Ambas torres')
      : (datos.nombreEdificio ? datos.nombreEdificio(nuevoEdificio) : ''));
  }

  function generarBotonesPiso() {
    var contenedor = util.el('selector-pisos');
    if (!contenedor) return;

    /* Pisos reales de la seleccion actual (p. ej. TA 4-17) */
    var pisos = datos.pisosDeVista ? datos.pisosDeVista(estado.edificioActual) : [0];
    pisos = pisos.slice().sort(function (a, b) { return b - a; });

    var html = '';
    /* De mayor a menor, como en el selector original */
    for (var i = 0; i < pisos.length; i++) {
      var p = pisos[i];
      var etiqueta = p === 0 ? 'PB' : 'P' + p;
      var activo = p === estado.pisoActual ? ' active' : '';
      html += '<button class="boton-piso' + activo + '" data-floor="' + p + '">' + etiqueta + '</button>';
    }
    contenedor.innerHTML = html;
    conectarSelectorPiso();
    refrescarBotonesPiso();
  }

  /* Botones activos / desactivados segun los filtros de piso */
  function refrescarBotonesPiso() {
    var botones = document.querySelectorAll('.boton-piso');
    for (var b = 0; b < botones.length; b++) {
      var piso = parseInt(botones[b].getAttribute('data-floor'), 10);
      var permitido = !estado.filtros ||
        !estado.filtros.pisos ||
        estado.filtros.pisos.indexOf(piso) !== -1;

      botones[b].disabled = !permitido;
      botones[b].classList.toggle('deshabilitado', !permitido);
      botones[b].classList.toggle('active', permitido && piso === estado.pisoActual);
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
    generarBotonesPiso();
    redimensionarLienzo();
    solicitarPlanos();
    animar();
  }

  function animar() {
    dibujar();
    requestAnimationFrame(animar);
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
    solicitarPlanos: solicitarPlanos
  };
})();
