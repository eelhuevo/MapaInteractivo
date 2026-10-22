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
    resaltado: 'rgba(26,86,219,0.25)',
    seleccionado: 'rgba(26,86,219,0.4)',
    favorito: '#f59e0b'
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
    return ['Planta Baja', 'Piso 1', 'Piso 2', 'Piso 3'][estado.pisoActual];
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
    var px = 555, py = 280;
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

    contexto.fillStyle = 'rgba(26,86,219,0.9)';
    var w = contexto.measureText('Usted aqui').width + 16;
    contexto.fillRect(px - w / 2, py - 28, w, 18);
    contexto.fillStyle = '#fff';
    contexto.font = 'bold 10px sans-serif';
    contexto.textAlign = 'center';
    contexto.textBaseline = 'middle';
    contexto.fillText('Usted aqui', px, py - 19);
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
      else if (s.tipo === 'sanitarios') color = '#e0e7ff';
      else if (s.estado === 'inactivo') color = '#fee2e2';
      else color = '#d1fae5';

      contexto.fillStyle = color;
      contexto.fillRect(s.x, s.y, s.ancho, s.alto);

      contexto.strokeStyle = esResaltado || esSeleccionado ? colores.ubicacion : colores.pared;
      contexto.lineWidth = esResaltado || esSeleccionado ? 2.5 : 1.5;
      contexto.strokeRect(s.x, s.y, s.ancho, s.alto);

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

      /* Etiqueta + indicador de estado */
      if (s.ancho > 50 && s.alto > 30 && s.tipo !== 'pasillo') {
        contexto.fillStyle = '#374151';
        contexto.font = 'bold 11px sans-serif';
        contexto.textAlign = 'center';
        contexto.textBaseline = 'middle';

        var lineas = ajustarTexto(s.nombre, s.ancho - 8);
        var lineH = 13;
        var startY = s.y + s.alto / 2 - (lineas.length - 1) * lineH / 2;
        for (var l = 0; l < lineas.length; l++) {
          contexto.fillText(lineas[l], s.x + s.ancho / 2, startY + l * lineH);
        }

        var esNormal = s.tipo !== 'pasillo' && s.tipo !== 'jardin' && s.tipo !== 'estacionamiento' && s.tipo !== 'sanitarios';
        if (esNormal) {
          contexto.beginPath();
          contexto.arc(s.x + s.ancho - 10, s.y + 10, 4, 0, Math.PI * 2);
          contexto.fillStyle = s.estado === 'activo' ? colores.disponible : colores.noDisponible;
          contexto.fill();
        }
      }
    }

    dibujarMarcadorUbicacion();

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

  /* ── SELECTOR DE PISO ─────────────────────────────── */
  function cambiarPiso(nuevoPiso, sincronizarBotones) {
    estado.pisoActual = nuevoPiso;
    estado.espacios = datos.construirEspacios(nuevoPiso);
    estado.espacioSeleccionado = null;
    estado.espacioResaltado = null;

    if (sincronizarBotones !== false) refrescarBotonesPiso();

    var etiqueta = util.el('etiqueta-piso-actual');
    if (etiqueta) etiqueta.textContent = obtenerEtiquetaPiso();

    UniMap.tooltip.ocultar();
    refrescarVistas();

    /* El piso se recuerda para la proxima visita */
    if (estado.guardarPreferencias) estado.guardarPreferencias();
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
          util.notificar('Ese piso esta oculto por los filtros');
          return;
        }
        cambiarPiso(piso);
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
    conectarSelectorPiso();
    refrescarBotonesPiso();
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
    centrarEn: centrarEn,
    redimensionarLienzo: redimensionarLienzo,
    refrescarBotonesPiso: refrescarBotonesPiso,
    pantallaAMundo: pantallaAMundo
  };
})();
