/* =========================================================
   map/horarios.js — panel de horarios de docentes
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  function renderizar() {
    var contenedor = util.el('lista-horarios');
    var campo = util.el('campo-busqueda-horario');
    if (!contenedor) return;

    var consulta = ((campo && campo.value) || '').trim().toLowerCase();
    var filtrados = [];

    for (var d = 0; d < datos.docentes.length; d++) {
      var doc = datos.docentes[d];
      if (!consulta ||
          doc.nombre.toLowerCase().indexOf(consulta) !== -1 ||
          doc.departamento.toLowerCase().indexOf(consulta) !== -1) {
        filtrados.push(doc);
      }
    }

    var html = '';
    for (var f = 0; f < filtrados.length; f++) {
      var docente = filtrados[f];
      var slots = '';

      for (var dia = 0; dia < datos.diasSemana.length; dia++) {
        var turnos = docente.horario[dia] || [];
        var claveDia = 'dia.' + ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][dia];
        var nombreDia = UniMap.i18n.t(claveDia);
        if (nombreDia === claveDia) nombreDia = datos.diasSemana[dia];
        slots += '<div class="sc-slot' + (turnos.length ? '' : ' empty') + '">' +
          nombreDia.substring(0, 2) + ': ' +
          (turnos.length ? turnos.join(', ') : '---') + '</div>';
      }

      var espacio = null;
      for (var a = 0; a < estado.todosLosEspacios.length; a++) {
        if (estado.todosLosEspacios[a].docente === docente.id) {
          espacio = estado.todosLosEspacios[a];
          break;
        }
      }

      var torre = espacio && datos.nombreEdificio ? datos.nombreEdificio(espacio.edificio) : '';
      var infoEspacio = espacio ? ' - ' + espacio.nombre + ' (' + torre + ' P' + espacio.piso + ')' : '';

      html += '<div class="schedule-card" data-id="' + util.escapar(docente.id) + '">' +
        '<div class="sc-name">' + util.escapar(docente.nombre) + '</div>' +
        '<div class="sc-dept">' + util.escapar(docente.departamento + infoEspacio) + '</div>' +
        '<div class="sc-slots">' + slots + '</div></div>';
    }

    contenedor.innerHTML = html;
  }

  function iniciar() {
    var abrir = util.el('boton-horarios');
    var cerrar = util.el('cerrar-horarios');
    var campo = util.el('campo-busqueda-horario');
    var lista = util.el('lista-horarios');

    if (abrir) abrir.addEventListener('click', function () {
      util.el('panel-horarios').classList.toggle('hidden');
      util.el('panel-filtros').classList.add('hidden');
      ['panel-favoritos', 'panel-servicios', 'panel-avisos', 'panel-sugerencias'].forEach(function (id) {
        var p = util.el(id);
        if (p) p.classList.add('hidden');
      });
      renderizar();
    });

    if (cerrar) cerrar.addEventListener('click', function () {
      util.el('panel-horarios').classList.add('hidden');
    });

    if (campo) campo.addEventListener('input', renderizar);

    /* HU-15: repintar al cambiar de idioma */
    document.addEventListener('idioma:cambiado', function () {
      var panel = util.el('panel-horarios');
      if (panel && !panel.classList.contains('hidden')) renderizar();
    });

    if (lista) {
      lista.addEventListener('click', function (e) {
        var tarjeta = e.target.closest ? e.target.closest('.schedule-card') : null;
        if (!tarjeta) return;

        var idDocente = tarjeta.getAttribute('data-id');
        for (var a = 0; a < estado.todosLosEspacios.length; a++) {
          if (estado.todosLosEspacios[a].docente === idDocente) {
            if (UniMap.ui) UniMap.ui.irAEspacio(estado.todosLosEspacios[a].id);
            util.el('panel-horarios').classList.add('hidden');
            break;
          }
        }
      });
    }
  }

  UniMap.horarios = {
    iniciar: iniciar,
    renderizar: renderizar
  };
})();
