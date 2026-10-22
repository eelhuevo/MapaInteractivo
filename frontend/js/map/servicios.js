/* =========================================================
   map/servicios.js — servicios disponibles por edificio (HU-07)
   · panel lateral que lista las oficinas, laboratorios y
     servicios de la torre seleccionada, agrupados por piso
   · al hacer clic se navega al espacio en el mapa
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  var edificioFiltro = 1;

  function t(clave) { return UniMap.i18n.t(clave); }

  function espaciosDeEdificio(edificioId) {
    var todos = estado.todosLosEspacios || [];
    var lista = [];
    for (var i = 0; i < todos.length; i++) {
      var s = todos[i];
      if (s.edificio !== edificioId) continue;
      if (UniMap.filtros && UniMap.filtros.esInfraestructura(s)) continue;
      lista.push(s);
    }
    return lista;
  }

  function renderizar() {
    var contenedor = util.el('lista-servicios');
    if (!contenedor) return;

    var campo = util.el('campo-busqueda-servicio');
    var consulta = ((campo && campo.value) || '').trim().toLowerCase();

    var lista = espaciosDeEdificio(edificioFiltro);

    /* Agrupar por piso */
    var porPiso = {};
    var pisos = [];
    for (var i = 0; i < lista.length; i++) {
      var s = lista[i];
      if (consulta && s.nombre.toLowerCase().indexOf(consulta) === -1 &&
          s.tipo.toLowerCase().indexOf(consulta) === -1) continue;
      if (!porPiso[s.piso]) { porPiso[s.piso] = []; pisos.push(s.piso); }
      porPiso[s.piso].push(s);
    }
    pisos.sort(function (a, b) { return a - b; });

    if (pisos.length === 0) {
      contenedor.innerHTML = '<div class="fav-vacio"><div class="fav-vacio-icono">&#128269;</div>' +
        '<p>' + util.escapar(t('serv.vacio')) + '</p></div>';
      return;
    }

    var html = '';
    for (var p = 0; p < pisos.length; p++) {
      var piso = pisos[p];
      html += '<div class="serv-piso">' +
        util.escapar((datos.nombrePiso ? datos.nombrePiso(piso) : ('Piso ' + piso)) +
        ' · ' + porPiso[piso].length + ' ' + t('serv.porPiso')) + '</div>';

      var items = porPiso[piso];
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var etiqueta = UniMap.tooltip && UniMap.tooltip.ETIQUETAS_TIPOS
          ? (UniMap.tooltip.ETIQUETAS_TIPOS[item.tipo] || item.tipo) : item.tipo;
        html += '<div class="serv-item" data-id="' + util.escapar(item.id) + '" tabindex="0" role="button">' +
          '<div class="serv-item-main">' +
          '<span class="serv-nombre">' + util.escapar(item.nombre) + '</span>' +
          '<span class="serv-tipo">' + util.escapar(etiqueta) + '</span>' +
          '</div>' +
          '<span class="serv-estado ' + util.escapar(item.estado) + '"></span>' +
          '<span class="serv-ir">' + util.escapar(t('serv.ir')) + '</span>' +
          '</div>';
      }
    }
    contenedor.innerHTML = html;

    var itemsDom = contenedor.querySelectorAll('.serv-item');
    for (var k = 0; k < itemsDom.length; k++) {
      itemsDom[k].addEventListener('click', function () {
        irA(this.getAttribute('data-id'));
      });
      itemsDom[k].addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); irA(this.getAttribute('data-id')); }
      });
    }
  }

  function irA(idEspacio) {
    if (UniMap.ui) UniMap.ui.irAEspacio(idEspacio);
    var panel = util.el('panel-servicios');
    if (panel) panel.classList.add('hidden');
  }

  function cambiarEdificio(edificioId) {
    edificioFiltro = edificioId;
    var botones = document.querySelectorAll('.serv-torre-btn');
    for (var b = 0; b < botones.length; b++) {
      botones[b].classList.toggle('active',
        parseInt(botones[b].getAttribute('data-building'), 10) === edificioId);
    }
    renderizar();
  }

  function iniciar() {
    edificioFiltro = estado.edificioActual || 1;

    var abrir = util.el('boton-servicios');
    var cerrar = util.el('cerrar-servicios');
    var campo = util.el('campo-busqueda-servicio');

    if (abrir) abrir.addEventListener('click', function () {
      var panel = util.el('panel-servicios');
      panel.classList.toggle('hidden');
      ['panel-filtros', 'panel-horarios', 'panel-favoritos', 'panel-avisos', 'panel-sugerencias'].forEach(function (id) {
        var p = util.el(id);
        if (p) p.classList.add('hidden');
      });
      edificioFiltro = estado.edificioActual || 1;
      cambiarEdificio(edificioFiltro);
      if (campo) campo.value = '';
    });

    if (cerrar) cerrar.addEventListener('click', function () {
      util.el('panel-servicios').classList.add('hidden');
    });

    if (campo) campo.addEventListener('input', renderizar);

    var botonesTorre = document.querySelectorAll('.serv-torre-btn');
    for (var b = 0; b < botonesTorre.length; b++) {
      botonesTorre[b].addEventListener('click', function () {
        cambiarEdificio(parseInt(this.getAttribute('data-building'), 10));
      });
    }

    /* Si cambia la torre en el mapa, reflejarlo al abrir */
    document.addEventListener('idioma:cambiado', function () {
      if (util.el('panel-servicios') && !util.el('panel-servicios').classList.contains('hidden')) renderizar();
    });
  }

  UniMap.servicios = {
    iniciar: iniciar,
    renderizar: renderizar,
    cambiarEdificio: cambiarEdificio
  };
})();
