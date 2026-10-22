/* =========================================================
   map/tooltip.js — ficha de detalle del espacio
   (compartida por el mapa 2D y el visor 3D)
   =========================================================
   Tarea #47 · Ficha flotante del espacio, compartida
              entre el mapa 2D y el visor 3D
   Autor: Oslo144
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  var elemento = util.el('tooltip-mapa');

  /* Ancho de referencia cuando el tooltip todavia no se ha
     dibujado y no se puede medir. */
  var ANCHO_POR_DEFECTO = 250;
  var MARGEN_BORDE = 4;

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
    pasillo: 'Pasillo'
  };

  function obtenerDocente(idDocente) {
    if (!idDocente) return null;
    for (var d = 0; d < datos.docentes.length; d++) {
      if (datos.docentes[d].id === idDocente) return datos.docentes[d];
    }
    return null;
  }

  /**
   * Muestra la ficha junto a un punto de la pantalla.
   * @param {Object} espacio
   * @param {Number} clientX  coordenada X de viewport
   * @param {Number} clientY  coordenada Y de viewport
   */
  function mostrar(espacio, clientX, clientY) {
    if (!elemento) return;

    util.el('tooltip-nombre').textContent = espacio.nombre;

    var elEstado = util.el('tooltip-estado');
    elEstado.textContent = espacio.estado === 'activo' ? 'Activo' : 'Inactivo';
    elEstado.className = 'tooltip-status ' + espacio.estado;

    util.el('tooltip-tipo').textContent = ETIQUETAS_TIPOS[espacio.tipo] || espacio.tipo;

    /* Accesibilidad: la ficha se anuncia como tooltip y se
       marca como visible para los lectores de pantalla. */
    elemento.setAttribute('role', 'tooltip');
    elemento.setAttribute('aria-hidden', 'false');
    elemento.setAttribute('aria-label', espacio.nombre);

    /* Informacion general */
    var info = '';
    if (espacio.capacidad) info += 'Capacidad: ' + espacio.capacidad + ' personas';
    var docente = obtenerDocente(espacio.docente);
    if (docente) info += '\nDocente: ' + docente.nombre;
    if (espacio.telefono) info += '\nContacto: ' + espacio.telefono;
    if (espacio.horarioAtencion) info += '\nHorario: ' + espacio.horarioAtencion;
    util.el('tooltip-info').textContent = info;

    /* Horario del docente */
    var html = '';
    if (docente) {
      html = '<strong>Horario del docente:</strong><br>';
      for (var dia = 0; dia < datos.diasSemana.length; dia++) {
        var turnos = docente.horario[dia] || [];
        html += datos.diasSemana[dia] + ': ' + (turnos.length ? turnos.join(', ') : '---') + '<br>';
      }
    }
    util.el('tooltip-horario').innerHTML = html;

    /* Boton de favorito */
    var btnFav = util.el('tooltip-favorito');
    if (btnFav) {
      var esFav = UniMap.favoritos && UniMap.favoritos.esFavorito(espacio.id);
      if (estado.usuarioActual && estado.usuarioActual.rol !== 'invitado') {
        btnFav.classList.remove('hidden');
        btnFav.textContent = esFav ? '\u2605 Quitar de favoritos' : '\u2606 Agregar a favoritos';
        btnFav.className = esFav ? 'btn-fav-activo btn-sm' : 'btn-fav btn-sm';
        btnFav.onclick = function () {
          if (UniMap.favoritos) UniMap.favoritos.alternar(espacio);
        };
      } else {
        btnFav.classList.add('hidden');
        btnFav.onclick = null;
      }
    }

    /* Posicion relativa al contenedor del mapa */
    var contenedor = util.el('contenedor-mapa');
    var rect = contenedor ? contenedor.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    /* Se mide el ancho real de la ficha para que no se salga
       del mapa cuando el texto es mas largo. */
    var tipW = elemento.offsetWidth || ANCHO_POR_DEFECTO;
    var tipH = elemento.offsetHeight || 200;

    var tx = clientX - rect.left + 15;
    var ty = clientY - rect.top - 10;

    if (tx + tipW > rect.width) tx = clientX - rect.left - tipW - 15;
    if (tx < MARGEN_BORDE) tx = MARGEN_BORDE;
    if (ty + tipH > rect.height) ty = rect.height - tipH - 8;
    if (ty < MARGEN_BORDE) ty = MARGEN_BORDE;

    elemento.style.left = tx + 'px';
    elemento.style.top = ty + 'px';
    elemento.classList.remove('hidden');
  }

  function ocultar() {
    if (!elemento) return;
    elemento.classList.add('hidden');
    elemento.setAttribute('aria-hidden', 'true');
  }

  /* Evitar que el tooltip se oculte al hacer clic en el */
  if (elemento) {
    elemento.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  /* Con la tecla Escape se cierra la ficha */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) ocultar();
  });

  UniMap.tooltip = {
    mostrar: mostrar,
    ocultar: ocultar,
    obtenerDocente: obtenerDocente,
    ETIQUETAS_TIPOS: ETIQUETAS_TIPOS
  };
})();
