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

  /* ── COLORES DEL MAPA ─────────────────────────────── */
  var colores = {
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
    sugerido: '#facc15'
  };

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
    var torre = datos.nombreEdificio ? datos.nombreEdificio(estado.edificioActual) : '';
    var piso = datos.nombrePiso ? datos.nombrePiso(estado.pisoActual) : ('Piso ' + estado.pisoActual);
    return torre + ' · ' + piso;
  }

  /* ── TEXTOS AJUSTADOS ─────────────────────────────── */
  function ajustarTexto(texto, maxW) {
    if (contexto.measureText(texto).width <= maxW) return [texto];
    var palabras = texto.split(' ');
    var lineas = [];
    var actual = '';
    for (var p = 0; p < palabras.length; p++) {
      var prueba = actual ? actual + ' ' + palabras[p] : palabras[p];
      if (contexto.measureText(prueba).width > maxW && actual) {
        lineas.push(actual);
        actual = palabras[p];
      } else {
        actual = prueba;
      }
    }
    if (actual) lineas.push(actual);
    return lineas;
  }

  /* ── MARCADOR DE UBICACION ────────────────────────── */
  function dibujarMarcadorUbicacion() {
    var pos = estado.ubicacionUsuario || { x: 555, y: 280 };
    var px = pos.x, py = pos.y;
    var t = Date.now() / 1000;
    var pulso = Math.sin(t * 3) * 4 + 10;

    contexto.beginPath();
    contexto.arc(px, py, pulso, 0, Math.PI * 2);
    contexto.fillStyle = 'rgba(26,86,219,0.15)';
    contexto.fill();

    contexto.beginPath();
    contexto.arc(px, py, 8, 0, Math.PI * 2);
    contexto.fillStyle = colores.ubicacion;
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
    contexto.fillStyle = 'rgba(26,86,219,0.9)';
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
    contexto.strokeStyle = '#fff';
    contexto.lineWidth = 2;
    contexto.stroke();

    var fin = puntos[puntos.length - 1];
    contexto.beginPath();
    contexto.arc(fin.x, fin.y, 7, 0, Math.PI * 2);
    contexto.fillStyle = colores.noDisponible;
    contexto.fill();
    contexto.strokeStyle = '#fff';
    contexto.lineWidth = 2;
    contexto.stroke();

    /* Insignia con la distancia estimada */
    var etiqueta = UniMap.i18n.t('rut.distancia') + ' ' + ruta.metros + ' ' + UniMap.i18n.t('rut.metros');
    contexto.font = 'bold 11px sans-serif';
    var w = contexto.measureText(etiqueta).width + 16;
    var bx = Math.min(fin.x + 12, 700);
    var by = fin.y - 30;
    if (by < 44) by = fin.y + 14;
    contexto.fillStyle = '#fff';
    contexto.fillRect(bx, by, w, 20);
    contexto.strokeStyle = colores.ubicacion;
    contexto.lineWidth = 1.5;
    contexto.strokeRect(bx, by, w, 20);
    contexto.fillStyle = '#1342a8';
    contexto.textAlign = 'left';
    contexto.textBaseline = 'middle';
    contexto.fillText(etiqueta, bx + 8, by + 10.5);

    contexto.restore();
  }

  /* ── DIBUJO PRINCIPAL ─────────────────────────────── */
  function dibujar() {
    contexto.clearRect(0, 0, lienzo.width, lienzo.height);
    contexto.save();
    contexto.translate(estado.desplazamientoX, estado.desplazamientoY);
    contexto.scale(estado.nivelZoom, estado.nivelZoom);

    /* Fondo */
    contexto.fillStyle = colores.piso;
    contexto.fillRect(0, 0, 800, 600);

    /* Cuadricula */
    contexto.strokeStyle = colores.lineaPiso;
    contexto.lineWidth = 0.5;
    for (var x = 0; x <= 800; x += 40) {
      contexto.beginPath(); contexto.moveTo(x, 0); contexto.lineTo(x, 600); contexto.stroke();
    }
    for (var y = 0; y <= 600; y += 40) {
      contexto.beginPath(); contexto.moveTo(0, y); contexto.lineTo(800, y); contexto.stroke();
    }

    /* Contorno edificio */
    contexto.strokeStyle = colores.pared;
    contexto.lineWidth = 3;
    contexto.strokeRect(40, 40, 530, 470);

    /* Nombre de la torre en la esquina superior */
    contexto.fillStyle = 'rgba(26,86,219,0.9)';
    contexto.font = 'bold 12px sans-serif';
    contexto.textAlign = 'left';
    contexto.textBaseline = 'top';
    contexto.fillText(datos.nombreEdificio ? datos.nombreEdificio(estado.edificioActual) : '', 50, 46);

    /* Espacios visibles (respetando los filtros) */
    var visibles = UniMap.filtros.espaciosVisibles();
    for (var i = 0; i < visibles.length; i++) {
      var s = visibles[i];
      var esResaltado = estado.espacioResaltado && estado.espacioResaltado.id === s.id;
      var esSeleccionado = estado.espacioSeleccionado && estado.espacioSeleccionado.id === s.id;
      var esFav = UniMap.favoritos.esFavorito(s.id);

      var color;
      if (s.tipo === 'pasillo') color = colores.pasillo;
      else if (s.tipo === 'jardin') color = colores.cesped;
      else if (s.tipo === 'estacionamiento') color = colores.estacionamiento;
      else if (s.tipo === 'entrada') color = colores.entrada;
      else if (s.tipo === 'sanitarios') color = '#e0e7ff';
      else if (s.estado === 'inactivo') color = '#fee2e2';
      else color = '#d1fae5';

      contexto.fillStyle = color;
      contexto.fillRect(s.x, s.y, s.ancho, s.alto);

      /* HU-08: la entrada principal se marca con borde propio */
      if (s.tipo === 'entrada') {
        contexto.strokeStyle = colores.bordeEntrada;
        contexto.lineWidth = 2;
        contexto.setLineDash([6, 4]);
        contexto.strokeRect(s.x, s.y, s.ancho, s.alto);
        contexto.setLineDash([]);
        contexto.strokeStyle = colores.pared;
        contexto.lineWidth = 1.5;
      } else {
        contexto.strokeStyle = esResaltado || esSeleccionado ? colores.ubicacion : colores.pared;
        contexto.lineWidth = esResaltado || esSeleccionado ? 2.5 : 1.5;
        contexto.strokeRect(s.x, s.y, s.ancho, s.alto);
      }

      if (esSeleccionado) {
        contexto.fillStyle = colores.seleccionado;
        contexto.fillRect(s.x, s.y, s.ancho, s.alto);
      }

      /* Estrella de favorito */
      if (esFav && s.tipo !== 'pasillo') {
        contexto.fillStyle = colores.favorito;
        contexto.font = '12px sans-serif';
        contexto.textAlign = 'left';
        contexto.textBaseline = 'top';
        contexto.fillText('\u2605', s.x + 4, s.y + 4);
      }

      /* HU-20: destello de las sugerencias del perfil */
      if (UniMap.sugerencias && UniMap.sugerencias.esSugerido && UniMap.sugerencias.esSugerido(s)) {
        contexto.fillStyle = colores.sugerido;
        contexto.font = 'bold 12px sans-serif';
        contexto.textAlign = 'right';
        contexto.textBaseline = 'top';
        contexto.fillText('\u2728', s.x + s.ancho - 4, s.y + 4);
        contexto.strokeStyle = colores.sugerido;
        contexto.lineWidth = 2;
        contexto.strokeRect(s.x - 1, s.y - 1, s.ancho + 2, s.alto + 2);
        contexto.lineWidth = esResaltado || esSeleccionado ? 2.5 : 1.5;
      }

      /* HU-08: distintivo "P" de los estacionamientos */
      if (s.tipo === 'estacionamiento') {
        contexto.fillStyle = '#fff';
        contexto.fillRect(s.x + 8, s.y + 8, 20, 20);
        contexto.strokeStyle = '#4b5563';
        contexto.lineWidth = 1.5;
        contexto.strokeRect(s.x + 8, s.y + 8, 20, 20);
        contexto.fillStyle = '#374151';
        contexto.font = 'bold 13px sans-serif';
        contexto.textAlign = 'center';
        contexto.textBaseline = 'middle';
        contexto.fillText('P', s.x + 18, s.y + 18.5);
      }

      /* Etiqueta + indicador de estado */
      if (s.ancho > 50 && (s.alto > 30 || s.tipo === 'entrada') && s.tipo !== 'pasillo') {
        contexto.fillStyle = s.tipo === 'entrada' ? '#92400e' : '#374151';
        contexto.font = (s.tipo === 'entrada' ? 'bold ' : 'bold ') + '11px sans-serif';
        contexto.textAlign = 'center';
        contexto.textBaseline = 'middle';

        var lineas = ajustarTexto(s.nombre, s.ancho - 8);
        var lineH = 13;
        var startY = s.y + s.alto / 2 - (lineas.length - 1) * lineH / 2;
        for (var l = 0; l < lineas.length; l++) {
          contexto.fillText(lineas[l], s.x + s.ancho / 2, startY + l * lineH);
        }

        var esNormal = s.tipo !== 'pasillo' && s.tipo !== 'jardin' &&
          s.tipo !== 'estacionamiento' && s.tipo !== 'sanitarios' && s.tipo !== 'entrada';
        if (esNormal) {
          contexto.beginPath();
          contexto.arc(s.x + s.ancho - 10, s.y + 10, 4, 0, Math.PI * 2);
          contexto.fillStyle = s.estado === 'activo' ? colores.disponible : colores.noDisponible;
          contexto.fill();
        }
      }
    }

    dibujarMarcadorUbicacion();

    /* HU-10: trazado de la ruta peatonal (encima de todo) */
    dibujarRuta();

    /* Etiqueta de piso */
    contexto.fillStyle = 'rgba(255,255,255,0.9)';
    contexto.fillRect(600, 500, 160, 30);
    contexto.strokeStyle = '#d1d5db';
    contexto.lineWidth = 1;
    contexto.strokeRect(600, 500, 160, 30);
    contexto.fillStyle = '#374151';
    contexto.font = 'bold 13px sans-serif';
    contexto.textAlign = 'center';
    contexto.textBaseline = 'middle';
    contexto.fillText(obtenerEtiquetaPiso(), 680, 515);

    contexto.restore();

    var etiquetaZoom = util.el('nivel-zoom');
    if (etiquetaZoom) etiquetaZoom.textContent = Math.round(estado.nivelZoom * 100) + '%';
  }

  /* ── COORDENADAS ──────────────────────────────────── */
  function pantallaAMundo(sx, sy) {
    return {
      x: (sx - estado.desplazamientoX) / estado.nivelZoom,
      y: (sy - estado.desplazamientoY) / estado.nivelZoom
    };
  }

  function buscarEspacioEn(wx, wy) {
    var visibles = UniMap.filtros.espaciosVisibles();
    for (var i = visibles.length - 1; i >= 0; i--) {
      var s = visibles[i];
      if (wx >= s.x && wx <= s.x + s.ancho && wy >= s.y && wy <= s.y + s.alto) return s;
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
  function cambiarPiso(nuevoPiso, sincronizarBotones) {
    estado.pisoActual = nuevoPiso;
    /* Espacios del piso aplicando los cambios del administrador (HU-06) */
    estado.espacios = UniMap.personalizacion
      ? UniMap.personalizacion.espaciosDelPiso(estado.edificioActual, nuevoPiso)
      : datos.construirEspacios(estado.edificioActual, nuevoPiso);
    estado.espacioSeleccionado = null;
    estado.espacioResaltado = null;

    if (sincronizarBotones !== false) refrescarBotonesPiso();

    var etiqueta = util.el('etiqueta-piso-actual');
    if (etiqueta) etiqueta.textContent = obtenerEtiquetaPiso();

    UniMap.tooltip.ocultar();
    refrescarVistas();
  }

  function cambiarEdificio(nuevoEdificio, pisoDestino) {
    var maxPisos = datos.pisosDeEdificio ? datos.pisosDeEdificio(nuevoEdificio) : 8;
    estado.edificioActual = nuevoEdificio;

    /* Ajustar el piso al rango valido de la nueva torre */
    var piso = (pisoDestino !== undefined && pisoDestino !== null) ? pisoDestino : estado.pisoActual;
    if (piso >= maxPisos) piso = maxPisos - 1;
    if (piso < 0) piso = 0;

    /* Sincronizar el conmutador de torre */
    var botonesTorre = document.querySelectorAll('.boton-torre');
    for (var t = 0; t < botonesTorre.length; t++) {
      botonesTorre[t].classList.toggle('active',
        parseInt(botonesTorre[t].getAttribute('data-building'), 10) === nuevoEdificio);
    }

    generarBotonesPiso();
    cambiarPiso(piso);

    util.notificar(datos.nombreEdificio ? datos.nombreEdificio(nuevoEdificio) : '');
  }

  function generarBotonesPiso() {
    var contenedor = util.el('selector-pisos');
    if (!contenedor) return;

    var maxPisos = datos.pisosDeEdificio ? datos.pisosDeEdificio(estado.edificioActual) : 8;
    var html = '';
    /* De mayor a menor, como en el selector original */
    for (var p = maxPisos - 1; p >= 0; p--) {
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
        if (estado.filtros.edificios && estado.filtros.edificios.indexOf(edificio) === -1) {
          util.notificar(UniMap.i18n.t('filtros.torreOculta'));
          return;
        }
        cambiarEdificio(edificio);
      });
    }
  }

  /* Refresca 2D + marcadores 3D */
  function refrescarVistas() {
    dibujar();
    if (UniMap.vista3D && UniMap.vista3D.actualizarMarcadores) {
      UniMap.vista3D.actualizarMarcadores();
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
    conectarZoom();
    conectarSelectorTorre();
    generarBotonesPiso();
    redimensionarLienzo();
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
    pantallaAMundo: pantallaAMundo
  };
})();
