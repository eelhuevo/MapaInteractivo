/* =========================================================
   map/filtros.js — logica y panel de filtros
   (tipos, disponibilidad, piso y torre; en 2D y 3D)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var estado = UniMap.estado;

  var TIPOS_POR_DEFECTO = ['aula', 'laboratorio', 'oficina', 'biblioteca', 'auditorio', 'comedor', 'deportivo', 'salon'];
  var PISOS_POR_DEFECTO = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  var EDIFICIOS_POR_DEFECTO = [1, 2];
  /* HU-19: subtipos de laboratorio visibles por defecto (todos) */
  var LABS_POR_DEFECTO = ['informatica', 'electronica', 'fisica', 'quimica', 'mecanica',
    'ia', 'robotica', 'iot', 'ciberseguridad', 'produccion'];

  /* Tipos "de planta": pasillos, jardin, estacionamiento, sanitarios y
     la entrada principal (HU-08) forman parte del propio edificio, no de
     las 8 categorias filtrables. Se pintan siempre (los datos y los
     colores del plano existen para ellos) pero no son seleccionables
     ni aparecen en los marcadores 3D. */
  var TIPOS_INFRAESTRUCTURA = ['pasillo', 'jardin', 'estacionamiento', 'sanitarios', 'entrada'];

  function esInfraestructura(espacio) {
    return TIPOS_INFRAESTRUCTURA.indexOf(espacio.tipo) !== -1;
  }

  function esInteractable(espacio) {
    return !esInfraestructura(espacio);
  }

  /**
   * Espacios del piso/torre actual que pasan los filtros activos.
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
      /* HU-19: los laboratorios se filtran tambien por subtipo */
      if (s.tipo === 'laboratorio' && s.subtipo &&
          (!estado.filtros.laboratorios || estado.filtros.laboratorios.indexOf(s.subtipo) === -1)) continue;
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

  /* ── PISOS Y TORRES PERMITIDOS ─────────────────────── */
  function pisoPermitido(piso) {
    return estado.filtros.pisos.indexOf(piso) !== -1;
  }

  function edificioPermitido(edificio) {
    if (!estado.filtros.edificios) return true;
    return estado.filtros.edificios.indexOf(edificio) !== -1;
  }

  /* Sincroniza el selector de piso con los filtros: desactiva los
     botones de pisos ocultos y, si el piso actual quedo fuera de los
     filtros, salta al primer piso permitido. */
  function refrescarPisos() {
    if (estado.filtros.pisos.length === 0) return;

    if (!pisoPermitido(estado.pisoActual)) {
      var maxPisos = UniMap.datos.pisosDeEdificio ? UniMap.datos.pisosDeEdificio(estado.edificioActual) : 9;
      var primero = maxPisos;
      for (var i = 0; i < estado.filtros.pisos.length; i++) {
        if (estado.filtros.pisos[i] < primero) primero = estado.filtros.pisos[i];
      }
      if (UniMap.mapa2D) UniMap.mapa2D.cambiarPiso(primero);
    }
    if (UniMap.mapa2D) UniMap.mapa2D.refrescarBotonesPiso();
  }

  /* Si la torre actual quedo fuera de los filtros, salta a la permitida */
  function refrescarEdificios() {
    if (!estado.filtros.edificios || estado.filtros.edificios.length === 0) return;
    if (!edificioPermitido(estado.edificioActual)) {
      if (UniMap.mapa2D) UniMap.mapa2D.cambiarEdificio(estado.filtros.edificios[0]);
    }
  }

  function aplicar() {
    var panel = util.el('panel-filtros');
    if (!panel) return;

    /* Tipos de espacio */
    var tipos = [];
    var seccionTipos = util.el('filtros-tipo');
    if (seccionTipos) {
      var cbs = seccionTipos.querySelectorAll('input[type=checkbox]');
      for (var c = 0; c < cbs.length; c++) {
        if (cbs[c].checked) tipos.push(cbs[c].value);
      }
    }

    /* Disponibilidad */
    var disponibilidad = [];
    var cbDisponible = util.el('filtro-disponible');
    var cbNoDisponible = util.el('filtro-no-disponible');
    if (cbDisponible && cbDisponible.checked) disponibilidad.push('activo');
    if (cbNoDisponible && cbNoDisponible.checked) disponibilidad.push('inactivo');

    /* Torres */
    var edificios = [];
    var contenedorTorres = util.el('filtros-edificio');
    if (contenedorTorres) {
      var cbsTorre = contenedorTorres.querySelectorAll('input[type=checkbox]');
      for (var e = 0; e < cbsTorre.length; e++) {
        if (cbsTorre[e].checked) edificios.push(parseInt(cbsTorre[e].value, 10));
      }
    }

    /* Pisos */
    var pisos = [];
    var contenedorPisos = util.el('filtros-piso');
    if (contenedorPisos) {
      var cbsPiso = contenedorPisos.querySelectorAll('input[type=checkbox]');
      for (var p = 0; p < cbsPiso.length; p++) {
        if (cbsPiso[p].checked) pisos.push(parseInt(cbsPiso[p].value, 10));
      }
    }

    /* HU-19: subtipos de laboratorio */
    var laboratorios = [];
    var seccionLab = util.el('filtros-lab');
    if (seccionLab) {
      var cbsLab = seccionLab.querySelectorAll('input[type=checkbox]');
      for (var lb = 0; lb < cbsLab.length; lb++) {
        if (cbsLab[lb].checked) laboratorios.push(cbsLab[lb].value);
      }
    }

    /* Validaciones */
    if (edificios.length === 0) {
      util.notificar(UniMap.i18n.t('filtros.alMenosTorre'));
      return;
    }
    if (pisos.length === 0) {
      util.notificar(UniMap.i18n.t('filtros.alMenosPiso'));
      return;
    }
    if (tipos.indexOf('laboratorio') !== -1 && laboratorios.length === 0) {
      util.notificar(UniMap.i18n.t('filtros.alMenosLab'));
      return;
    }

    estado.filtros.tipos = tipos;
    estado.filtros.disponibilidad = disponibilidad;
    estado.filtros.pisos = pisos;
    estado.filtros.edificios = edificios;
    estado.filtros.laboratorios = laboratorios;

    refrescarEdificios();
    refrescar();
    refrescarPisos();
    panel.classList.add('hidden');
    util.notificar(UniMap.i18n.t('filtros.aplicados'));
  }

  function restablecer() {
    var panel = util.el('panel-filtros');
    if (panel) {
      var todos = panel.querySelectorAll('input[type=checkbox]');
      for (var c = 0; c < todos.length; c++) todos[c].checked = true;
    }

    estado.filtros = {
      tipos: TIPOS_POR_DEFECTO.slice(),
      laboratorios: LABS_POR_DEFECTO.slice(),
      disponibilidad: ['activo', 'inactivo'],
      pisos: PISOS_POR_DEFECTO.slice(),
      edificios: EDIFICIOS_POR_DEFECTO.slice()
    };

    refrescarEdificios();
    refrescarPisos();
    refrescar();
    util.notificar(UniMap.i18n.t('filtros.restablecidos'));
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
      ['panel-favoritos', 'panel-servicios', 'panel-avisos', 'panel-sugerencias'].forEach(function (id) {
        var p = util.el(id);
        if (p) p.classList.add('hidden');
      });
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
    edificioPermitido: edificioPermitido,
    refrescarPisos: refrescarPisos,
    refrescarEdificios: refrescarEdificios,
    TIPOS_INFRAESTRUCTURA: TIPOS_INFRAESTRUCTURA
  };
})();
