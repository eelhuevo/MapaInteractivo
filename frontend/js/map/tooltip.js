/* =========================================================
   map/tooltip.js — ficha de detalle del espacio
   (compartida por el mapa 2D y el visor 3D)
   · HU-03: informacion completa (torre, piso, capacidad,
     docente, contacto y horario)
   · HU-09: estado de atencion abierto/cerrado segun el
     horario de atencion y la hora actual
   · HU-10 / HU-11: botones de trazar ruta y codigo QR
   · HU-15: textos traducidos
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  var elemento = util.el('tooltip-mapa');

  var ETIQUETAS_TIPOS = {
    aula: 'Aula',
    laboratorio: 'Laboratorio',
    oficina: 'Oficina',
    biblioteca: 'Biblioteca',
    auditorio: 'Auditorio',
    comedor: 'Comedor',
    deportivo: 'Area Deportiva',
    salon: 'Salon',
    jardin: 'Jardin',
    estacionamiento: 'Estacionamiento',
    sanitarios: 'Sanitarios',
    pasillo: 'Pasillo',
    entrada: 'Entrada'
  };

  /* Etiqueta del tipo traducida (HU-15), con respaldo en ES */
  function etiquetaTipo(tipo) {
    var traducida = UniMap.i18n.t('etiqueta.' + tipo);
    if (traducida !== 'etiqueta.' + tipo) return traducida;
    return ETIQUETAS_TIPOS[tipo] || tipo;
  }

  function obtenerDocente(idDocente) {
    if (!idDocente) return null;
    for (var d = 0; d < datos.docentes.length; d++) {
      if (datos.docentes[d].id === idDocente) return datos.docentes[d];
    }
    return null;
  }

  /* ── HU-09: calculo de atencion abierto / cerrado ──── */
  function atencion(espacio) {
    var r = { abierto: espacio.estado === 'activo', horario: espacio.horarioAtencion || '' };
    if (!r.horario) return r;

    var partes = r.horario.split('-');
    if (partes.length !== 2) return r;

    var inicio = parseHora(partes[0]);
    var fin = parseHora(partes[1]);
    if (inicio === null || fin === null) return r;

    var ahora = new Date();
    var minutos = ahora.getHours() * 60 + ahora.getMinutes();

    /* Horario que cruza la medianoche (ej. 18:00-02:00) */
    var dentro = (inicio <= fin)
      ? (minutos >= inicio && minutos < fin)
      : (minutos >= inicio || minutos < fin);

    r.abierto = dentro && espacio.estado === 'activo';
    r.dentroDeHorario = dentro;
    r.cierre = partes[1].trim();
    r.apertura = partes[0].trim();
    return r;
  }

  function parseHora(texto) {
    var m = String(texto).trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  /* Ultima ficha mostrada, para repintar al cambiar de idioma */
  var ultimo = null;

  /**
   * Muestra la ficha junto a un punto de la pantalla.
   * @param {Object} espacio
   * @param {Number} clientX  coordenada X de viewport
   * @param {Number} clientY  coordenada Y de viewport
   */
  function mostrar(espacio, clientX, clientY) {
    if (!elemento) return;

    ultimo = { espacio: espacio, x: clientX, y: clientY };

    util.el('tooltip-nombre').textContent = espacio.nombre;

    /* Estado de atencion (HU-09) */
    var info = atencion(espacio);
    var elEstado = util.el('tooltip-estado');
    if (espacio.horarioAtencion) {
      elEstado.textContent = info.abierto ? UniMap.i18n.t('tip.abierto') : UniMap.i18n.t('tip.cerrado');
      elEstado.className = 'tooltip-status ' + (info.abierto ? 'abierto' : 'cerrado');
    } else {
      elEstado.textContent = espacio.estado === 'activo' ? UniMap.i18n.t('ley.activo') : UniMap.i18n.t('ley.inactivo');
      elEstado.className = 'tooltip-status ' + espacio.estado;
    }

    util.el('tooltip-tipo').textContent = etiquetaTipo(espacio.tipo);

    /* Informacion general (HU-03) */
    var texto = '';
    if (datos.nombreEdificio) texto += UniMap.i18n.t('tip.torre') + ' ' + datos.nombreEdificio(espacio.edificio);
    if (datos.nombrePiso) texto += '\n' + UniMap.i18n.t('tip.piso') + ' ' + datos.nombrePiso(espacio.piso);
    if (espacio.capacidad) texto += '\n' + UniMap.i18n.t('tip.capacidad') + ' ' + espacio.capacidad + ' ' + UniMap.i18n.t('tip.personas');
    var docente = obtenerDocente(espacio.docente);
    if (docente) texto += '\n' + UniMap.i18n.t('tip.docente') + ' ' + docente.nombre;
    if (espacio.telefono) texto += '\n' + UniMap.i18n.t('tip.contacto') + ' ' + espacio.telefono;
    if (espacio.horarioAtencion) texto += '\n' + UniMap.i18n.t('tip.horario') + ' ' + espacio.horarioAtencion;
    if (espacio.horarioAtencion && info.dentroDeHorario === false) {
      texto += '\n' + (minutosAhora() < parseHora(espacio.horarioAtencion.split('-')[0])
        ? UniMap.i18n.t('tip.abreA') + ' ' + info.apertura
        : UniMap.i18n.t('tip.cierraA') + ' ' + info.cierre);
    }
    util.el('tooltip-info').textContent = texto;

    /* Horario del docente */
    var html = '';
    if (docente) {
      html = '<strong>' + util.escapar(UniMap.i18n.t('hor.docente')) + '</strong><br>';
      for (var dia = 0; dia < datos.diasSemana.length; dia++) {
        var turnos = docente.horario[dia] || [];
        var claveDia = 'dia.' + ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][dia];
        var nombreDia = UniMap.i18n.t(claveDia);
        if (nombreDia === claveDia) nombreDia = datos.diasSemana[dia];
        html += nombreDia + ': ' + (turnos.length ? turnos.join(', ') : '---') + '<br>';
      }
    }
    util.el('tooltip-horario').innerHTML = html;

    /* Boton de favorito (HU-12) */
    var btnFav = util.el('tooltip-favorito');
    if (btnFav) {
      var esFav = UniMap.favoritos && UniMap.favoritos.esFavorito(espacio.id);
      if (estado.usuarioActual && estado.usuarioActual.rol !== 'invitado') {
        btnFav.classList.remove('hidden');
        btnFav.textContent = esFav ? UniMap.i18n.t('fav.btnQuitar') : UniMap.i18n.t('fav.btnAgregar');
        btnFav.className = esFav ? 'btn-fav-activo btn-sm' : 'btn-fav btn-sm';
        btnFav.onclick = function () {
          if (UniMap.favoritos) UniMap.favoritos.alternar(espacio);
        };
      } else {
        btnFav.classList.add('hidden');
        btnFav.onclick = null;
      }
    }

    conectarAcciones(espacio);

    /* Posicion relativa al contenedor del mapa */
    var contenedor = util.el('contenedor-mapa');
    var rect = contenedor ? contenedor.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    var tipW = 250;
    var tipH = elemento.offsetHeight || 200;

    var tx = clientX - rect.left + 15;
    var ty = clientY - rect.top - 10;

    if (tx + tipW > rect.width) tx = clientX - rect.left - tipW - 15;
    if (tx < 4) tx = 4;
    if (ty + tipH > rect.height) ty = rect.height - tipH - 8;
    if (ty < 4) ty = 4;

    elemento.style.left = tx + 'px';
    elemento.style.top = ty + 'px';
    elemento.classList.remove('hidden');
  }

  function minutosAhora() {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  /* Botones HU-10 (ruta) y HU-11 (QR) de la ficha */
  function conectarAcciones(espacio) {
    var btnRuta = util.el('tooltip-ruta');
    if (btnRuta) {
      btnRuta.onclick = function (e) {
        e.stopPropagation();
        if (UniMap.ruta) UniMap.ruta.trazar(espacio);
      };
    }
    var btnQR = util.el('tooltip-qr');
    if (btnQR) {
      btnQR.onclick = function (e) {
        e.stopPropagation();
        if (UniMap.qr) UniMap.qr.mostrarQR(espacio);
      };
    }
  }

  function ocultar() {
    if (elemento) elemento.classList.add('hidden');
    ultimo = null;
  }

  /* Evitar que el tooltip se oculte al hacer clic en el */
  if (elemento) {
    elemento.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  /* HU-15: repintar la ficha visible al cambiar de idioma */
  document.addEventListener('idioma:cambiado', function () {
    if (ultimo && elemento && !elemento.classList.contains('hidden')) {
      mostrar(ultimo.espacio, ultimo.x, ultimo.y);
    }
  });

  UniMap.tooltip = {
    mostrar: mostrar,
    ocultar: ocultar,
    obtenerDocente: obtenerDocente,
    etiquetaTipo: etiquetaTipo,
    atencion: atencion,
    ETIQUETAS_TIPOS: ETIQUETAS_TIPOS
  };
})();
