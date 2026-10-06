/* =========================================================
   map/filtros.js — logica y panel de filtros
   (tipos, disponibilidad y piso; se aplican en 2D y 3D)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var estado = UniMap.estado;

  var TIPOS_POR_DEFECTO = ['aula', 'laboratorio', 'oficina', 'biblioteca', 'auditorio', 'comedor', 'deportivo', 'salon'];

  /* Tipos "de planta": pasillos, jardin, estacionamiento y sanitarios
     forman parte del propio edificio, no de las 8 categorias filtrables.
     Se pintan siempre (los datos y los colores del plano existen para
     ellos) pero no son seleccionables ni aparecen en los marcadores 3D. */
  var TIPOS_INFRAESTRUCTURA = ['pasillo', 'jardin', 'estacionamiento', 'sanitarios'];

  function esInfraestructura(espacio) {
    return TIPOS_INFRAESTRUCTURA.indexOf(espacio.tipo) !== -1;
  }

  function esInteractable(espacio) {
    return !esInfraestructura(espacio);
  }

  /**
   * Espacios del piso actual que pasan los filtros activos.
   * Se usa para dibujar el plano 2D (incluye la infraestructura,
   * que nunca se oculta) y para descartar espacios al hacer hit-test.
   */
  function espaciosVisibles() {
    var resultado = [];
    var lista = estado.espacios || [];
    for (var i = 0; i < lista.length; i++) {
      var s = lista[i];

      if (esInfraestructura(s)) { resultado.push(s); continue; }

      if (estado.filtros.tipos.indexOf(s.tipo) === -1) continue;
      if (estado.filtros.disponibilidad.indexOf(s.estado) === -1) continue;
      resultado.push(s);
    }
    return resultado;
  }

  /**
   * Espacios con ficha propia (las 8 categorias) que pasan los filtros.
   * Es lo que se marca en 3D, lo que abre tooltip y lo que se busca.
   */
  function espaciosInteractuales() {
    var resultado = [];
    var visibles = espaciosVisibles();
    for (var i = 0; i < visibles.length; i++) {
      if (esInteractable(visibles[i])) resultado.push(visibles[i]);
    }
    return resultado;
  }

  /* ── PISOS PERMITIDOS ──────────────────────────────── */
  function pisoPermitido(piso) {
    return estado.filtros.pisos.indexOf(piso) !== -1;
  }

  /* Sincroniza el selector de piso con los filtros: desactiva los
     botones de pisos ocultos y, si el piso actual quedo fuera de los
     filtros, salta al primer piso permitido. */
  function refrescarPisos() {
    if (estado.filtros.pisos.length === 0) return;

    if (!pisoPermitido(estado.pisoActual)) {
      var primero = Math.min.apply(null, estado.filtros.pisos);
      if (UniMap.mapa2D) UniMap.mapa2D.cambiarPiso(primero);
    }
    if (UniMap.mapa2D) UniMap.mapa2D.refrescarBotonesPiso();
  }

  function aplicar() {
    var panel = util.el('panel-filtros');
    if (!panel) return;

    /* Los tres grupos se leen primero en temporales: si algo falta
       no se toca el estado y el panel sigue abierto */

    /* Tipos de espacio */
    var tipos = [];
    var secciones = panel.querySelectorAll('.filter-section');
    var cbs = secciones[0].querySelectorAll('input[type=checkbox]');
    for (var c = 0; c < cbs.length; c++) {
      if (cbs[c].checked) tipos.push(cbs[c].value);
    }

    /* Disponibilidad */
    var disponibilidad = [];
    var cbDisponible = util.el('filtro-disponible');
    var cbNoDisponible = util.el('filtro-no-disponible');
    if (cbDisponible && cbDisponible.checked) disponibilidad.push('activo');
    if (cbNoDisponible && cbNoDisponible.checked) disponibilidad.push('inactivo');

    /* Pisos */
    var pisos = [];
    var contenedorPisos = util.el('filtros-piso');
    if (contenedorPisos) {
      var cbsPiso = contenedorPisos.querySelectorAll('input[type=checkbox]');
      for (var p = 0; p < cbsPiso.length; p++) {
        if (cbsPiso[p].checked) pisos.push(parseInt(cbsPiso[p].value, 10));
      }
    }

    /* Sin pisos no hay mapa que mostrar: se anula el cambio */
    if (pisos.length === 0) {
      util.notificar('Selecciona al menos un piso');
      return;
    }

    estado.filtros.tipos = tipos;
    estado.filtros.disponibilidad = disponibilidad;
    estado.filtros.pisos = pisos;

    refrescar();
    refrescarPisos();
    panel.classList.add('hidden');
    util.notificar('Filtros aplicados');
  }

  function restablecer() {
    var panel = util.el('panel-filtros');
    if (panel) {
      var todos = panel.querySelectorAll('input[type=checkbox]');
      for (var c = 0; c < todos.length; c++) todos[c].checked = true;
    }

    estado.filtros = {
      tipos: TIPOS_POR_DEFECTO.slice(),
      disponibilidad: ['activo', 'inactivo'],
      pisos: [0, 1, 2, 3]
    };

    refrescarPisos();
    refrescar();
    util.notificar('Filtros restablecidos');
  }

  function refrescar() {
    if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
    if (UniMap.vista3D) UniMap.vista3D.actualizarMarcadores();
  }

  function iniciar() {
    var abrir = util.el('boton-filtros');
    var cerrar = util.el('cerrar-filtros');
    var aplicarBtn = util.el('aplicar-filtros');
    var restablecerBtn = util.el('restablecer-filtros');

    if (abrir) abrir.addEventListener('click', function () {
      util.el('panel-filtros').classList.toggle('hidden');
      util.el('panel-horarios').classList.add('hidden');
      var pf = util.el('panel-favoritos');
      if (pf) pf.classList.add('hidden');
    });

    if (cerrar) cerrar.addEventListener('click', function () {
      util.el('panel-filtros').classList.add('hidden');
    });

    if (aplicarBtn) aplicarBtn.addEventListener('click', aplicar);
    if (restablecerBtn) restablecerBtn.addEventListener('click', restablecer);
  }

  UniMap.filtros = {
    iniciar: iniciar,
    aplicar: aplicar,
    restablecer: restablecer,
    espaciosVisibles: espaciosVisibles,
    espaciosInteractuales: espaciosInteractuales,
    esInfraestructura: esInfraestructura,
    esInteractable: esInteractable,
    pisoPermitido: pisoPermitido,
    refrescarPisos: refrescarPisos,
    TIPOS_INFRAESTRUCTURA: TIPOS_INFRAESTRUCTURA
  };
})();
