/* =========================================================
   admin/admin.js — panel de administracion
   · HU-06: agregar, modificar y eliminar oficinas/servicios
     (solo usuarios autorizados: rol administrador)
   · HU-14: estadisticas de uso de los espacios
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  var TIPOS_INFRA = ['pasillo', 'jardin', 'estacionamiento', 'sanitarios', 'entrada'];

  var editandoId = null;

  function t(clave, params) { return UniMap.i18n.t(clave, params); }

  /* ═══════════════ CONTROL DE ACCESO (HU-06) ═══════════════ */
  function verificarAcceso() {
    var sesion = UniMap.auth.sesionGuardada();
    if (!sesion || sesion.rol !== 'admin') {
      util.el('admin-sin-permisos').classList.remove('hidden');
      var texto = util.el('texto-sin-permisos');
      if (texto && sesion && sesion.rol !== 'admin') texto.textContent = t('adm.sinPermisos');
      return false;
    }
    util.el('admin-contenido').classList.remove('hidden');
    return true;
  }

  /* ═══════════════ LISTADO Y FILTROS ═══════════════ */
  function espaciosFiltrables() {
    var todos = estado.todosLosEspacios || [];
    var lista = [];
    for (var i = 0; i < todos.length; i++) {
      if (TIPOS_INFRA.indexOf(todos[i].tipo) === -1) lista.push(todos[i]);
    }
    return lista;
  }

  function filtrados() {
    var consulta = (util.el('admin-buscar').value || '').trim().toLowerCase();
    var torre = util.el('admin-filtro-torre').value;
    var tipo = util.el('admin-filtro-tipo').value;

    var lista = espaciosFiltrables();
    var resultado = [];
    for (var i = 0; i < lista.length; i++) {
      var s = lista[i];
      if (consulta && s.nombre.toLowerCase().indexOf(consulta) === -1) continue;
      if (torre && String(s.edificio) !== torre) continue;
      if (tipo && s.tipo !== tipo) continue;
      resultado.push(s);
    }
    return resultado;
  }

  function pintarTabla() {
    var cuerpo = util.el('admin-cuerpo');
    var vacio = util.el('admin-vacio');
    if (!cuerpo) return;

    var lista = filtrados();
    if (lista.length === 0) {
      cuerpo.innerHTML = '';
      vacio.classList.remove('hidden');
      return;
    }
    vacio.classList.add('hidden');

    var html = '';
    for (var i = 0; i < lista.length; i++) {
      var s = lista[i];
      var etiquetaTipo = UniMap.tooltip && UniMap.tooltip.ETIQUETAS_TIPOS
        ? (UniMap.tooltip.ETIQUETAS_TIPOS[s.tipo] || s.tipo) : s.tipo;
      var torre = datos.nombreEdificio ? datos.nombreEdificio(s.edificio) : s.edificio;
      var piso = datos.nombrePiso ? datos.nombrePiso(s.piso) : ('Piso ' + s.piso);
      var personalizado = UniMap.personalizacion.esPersonalizado(s.id);

      html += '<tr>' +
        '<td><strong>' + util.escapar(s.nombre) + '</strong>' +
        (personalizado ? ' <span class="badge-personalizado" data-i18n="adm.est.creado">personalizado</span>' : '') + '</td>' +
        '<td>' + util.escapar(etiquetaTipo) + '</td>' +
        '<td>' + util.escapar(torre) + '</td>' +
        '<td>' + util.escapar(piso) + '</td>' +
        '<td>' + util.escapar(s.horarioAtencion || '—') + '</td>' +
        '<td><span class="estado-punto ' + util.escapar(s.estado) + '"></span>' +
        util.escapar(s.estado === 'activo' ? t('ley.activo') : t('ley.inactivo')) + '</td>' +
        '<td class="col-acciones">' +
        '<button class="btn-tabla-editar" data-id="' + util.escapar(s.id) + '">' + util.escapar(t('adm.editar')) + '</button>' +
        '<button class="btn-tabla-eliminar" data-id="' + util.escapar(s.id) + '" data-nombre="' + util.escapar(s.nombre) + '">' + util.escapar(t('adm.eliminar')) + '</button>' +
        '</td></tr>';
    }
    cuerpo.innerHTML = html;

    var editar = cuerpo.querySelectorAll('.btn-tabla-editar');
    for (var e = 0; e < editar.length; e++) {
      editar[e].addEventListener('click', function () { abrirModal(this.getAttribute('data-id')); });
    }
    var eliminar = cuerpo.querySelectorAll('.btn-tabla-eliminar');
    for (var d = 0; d < eliminar.length; d++) {
      eliminar[d].addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var nombre = this.getAttribute('data-nombre');
        if (window.confirm(t('adm.confirmarEliminar', { n: nombre }))) {
          UniMap.personalizacion.eliminar(id);
          refrescar();
          util.notificar(t('adm.eliminadoMsg'));
        }
      });
    }
  }

  function refrescar() {
    UniMap.personalizacion.reconstruir();
    pintarTabla();
    if (!util.el('tab-estadisticas').classList.contains('hidden')) pintarEstadisticas();
  }

  /* ═══════════════ MODAL ALTA / EDICION ═══════════════ */
  function buscarEspacio(id) {
    var lista = estado.todosLosEspacios || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  }

  /* Pisos del selector del modal: los que existen en la torre elegida
     (p. ej. Torre Antigua 4-17, Torre Innovacion PB y 4-11) */
  function rellenarPisos(valorDeseado) {
    var sel = util.el('esp-piso');
    if (!sel) return;
    var torre = parseInt(util.el('esp-torre').value, 10) || 1;
    var pisos = UniMap.datos.pisosDe ? UniMap.datos.pisosDe(torre) : [0, 1, 2, 3, 4, 5, 6, 7, 8];

    var html = '';
    for (var i = 0; i < pisos.length; i++) {
      html += '<option value="' + pisos[i] + '">' +
        (pisos[i] === 0 ? 'PB' : 'P' + pisos[i]) + '</option>';
    }
    sel.innerHTML = html;

    var valor = (valorDeseado !== undefined && valorDeseado !== null && pisos.indexOf(valorDeseado) !== -1)
      ? valorDeseado
      : pisos[0];
    sel.value = String(valor);
  }

  function abrirModal(idEspacio) {
    editandoId = idEspacio || null;
    var modal = util.el('modal-espacio');
    util.el('esp-nombre-error').textContent = '';
    util.el('esp-piso-error').textContent = '';

    if (editandoId) {
      var s = buscarEspacio(editandoId);
      if (!s) return;
      util.el('modal-espacio-titulo').textContent = t('adm.editar') + ': ' + s.nombre;
      util.el('esp-nombre').value = s.nombre;
      util.el('esp-tipo').value = s.tipo;
      util.el('esp-torre').value = String(s.edificio);
      rellenarPisos(s.piso);
      util.el('esp-horario').value = s.horarioAtencion || '';
      util.el('esp-telefono').value = s.telefono || '';
      util.el('esp-capacidad').value = String(s.capacidad || 0);
      util.el('esp-estado').value = s.estado || 'activo';
    } else {
      util.el('modal-espacio-titulo').textContent = t('adm.nuevo');
      util.el('esp-nombre').value = '';
      util.el('esp-tipo').value = 'aula';
      util.el('esp-torre').value = '1';
      rellenarPisos();
      util.el('esp-horario').value = '';
      util.el('esp-telefono').value = '';
      util.el('esp-capacidad').value = '0';
      util.el('esp-estado').value = 'activo';
    }
    modal.classList.remove('hidden');
    setTimeout(function () { util.el('esp-nombre').focus(); }, 50);
  }

  function cerrarModal() {
    util.el('modal-espacio').classList.add('hidden');
    editandoId = null;
  }

  function guardarFormulario(e) {
    if (e) e.preventDefault();
    var nombre = util.el('esp-nombre').value.trim();
    var piso = parseInt(util.el('esp-piso').value, 10);

    util.el('esp-nombre-error').textContent = '';
    util.el('esp-piso-error').textContent = '';

    if (!nombre || nombre.length < 2) {
      util.el('esp-nombre-error').textContent = nombre ? 'Min. 2 caracteres' : 'Requerido';
      return;
    }
    var edificio = parseInt(util.el('esp-torre').value, 10);
    var pisosTorre = UniMap.datos.pisosDe ? UniMap.datos.pisosDe(edificio) : [];
    if (isNaN(piso) || pisosTorre.indexOf(piso) === -1) {
      util.el('esp-piso-error').textContent = pisosTorre.length
        ? pisosTorre.map(function (p) { return p === 0 ? 'PB' : 'P' + p; }).join(', ')
        : 'Requerido';
      return;
    }

    var cambios = {
      nombre: nombre,
      tipo: util.el('esp-tipo').value,
      edificio: edificio,
      piso: piso,
      horarioAtencion: util.el('esp-horario').value.trim(),
      telefono: util.el('esp-telefono').value.trim(),
      capacidad: parseInt(util.el('esp-capacidad').value, 10) || 0,
      estado: util.el('esp-estado').value
    };

    if (editandoId) {
      /* Cambio de planta: recolocar en la zona libre del nuevo piso */
      var original = buscarEspacio(editandoId);
      if (original && (cambios.piso !== original.piso || cambios.edificio !== original.edificio)) {
        cambios.x = 600;
        cambios.y = 60;
      }
      UniMap.personalizacion.guardarEdicion(editandoId, cambios);
      util.notificar(t('adm.actualizado'));
    } else {
      UniMap.personalizacion.agregar(cambios);
      util.notificar(t('adm.creado'));
    }

    cerrarModal();
    refrescar();
  }

  /* ═══════════════ ESTADISTICAS (HU-14) ═══════════════ */
  function pintarEstadisticas() {
    util.el('stats-total-espacios').textContent = String(espaciosFiltrables().length);
    util.el('stats-total-consultas').textContent = String(UniMap.estadisticas.total());

    /* Ranking de mas consultados */
    var ranking = UniMap.estadisticas.ranking(10);
    var contTop = util.el('stats-top');
    if (ranking.length === 0) {
      contTop.innerHTML = '<div class="admin-vacio">' + util.escapar(t('est.sinDatos')) + '</div>';
    } else {
      var maximo = ranking[0].total;
      var html = '';
      for (var i = 0; i < ranking.length; i++) {
        var pct = Math.round((ranking[i].total / maximo) * 100);
        html += '<div class="stat-linea">' +
          '<span class="stat-nombre">' + util.escapar(ranking[i].nombre) + '</span>' +
          '<span class="stat-barra"><span class="stat-relleno" style="width:' + pct + '%"></span></span>' +
          '<span class="stat-valor">' + ranking[i].total + '</span></div>';
      }
      contTop.innerHTML = html;
    }

    /* Distribucion por tipo */
    var porTipo = UniMap.estadisticas.porTipo();
    var contTipos = util.el('stats-tipos');
    var maxTipo = 0;
    var tipoActual = null;
    for (var k in porTipo) {
      if (porTipo.hasOwnProperty(k) && porTipo[k] > maxTipo) maxTipo = porTipo[k];
    }
    var html2 = '';
    for (var tipo in porTipo) {
      if (!porTipo.hasOwnProperty(tipo)) continue;
      tipoActual = porTipo[tipo];
      var etiqueta = UniMap.tooltip && UniMap.tooltip.ETIQUETAS_TIPOS
        ? (UniMap.tooltip.ETIQUETAS_TIPOS[tipo] || tipo) : tipo;
      var pct2 = maxTipo ? Math.round((tipoActual / maxTipo) * 100) : 0;
      html2 += '<div class="stat-linea">' +
        '<span class="stat-nombre">' + util.escapar(etiqueta) + '</span>' +
        '<span class="stat-barra"><span class="stat-relleno alt" style="width:' + pct2 + '%"></span></span>' +
        '<span class="stat-valor">' + tipoActual + '</span></div>';
    }
    contTipos.innerHTML = html2 || '<div class="admin-vacio">' + util.escapar(t('est.sinDatos')) + '</div>';
  }

  /* ═══════════════ ARRANQUE ═══════════════ */
  function iniciar() {
    UniMap.i18n.iniciar();

    if (!verificarAcceso()) return;

    UniMap.personalizacion.reconstruir();

    /* Tabs */
    var tabs = document.querySelectorAll('.admin-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        var nombre = this.getAttribute('data-tab');
        for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
        this.classList.add('active');
        util.el('tab-espacios').classList.toggle('hidden', nombre !== 'espacios');
        util.el('tab-estadisticas').classList.toggle('hidden', nombre !== 'estadisticas');
        if (nombre === 'estadisticas') pintarEstadisticas();
      });
    }

    /* Filtros del listado */
    util.el('admin-buscar').addEventListener('input', pintarTabla);
    util.el('admin-filtro-torre').addEventListener('change', pintarTabla);
    util.el('admin-filtro-tipo').addEventListener('change', pintarTabla);

    /* Acciones */
    util.el('admin-nuevo').addEventListener('click', function () { abrirModal(null); });
    /* Al cambiar la torre, el selector de piso pasa a sus pisos */
    util.el('esp-torre').addEventListener('change', function () { rellenarPisos(); });
    util.el('admin-restaurar').addEventListener('click', function () {
      if (window.confirm(t('adm.restaurar') + '?')) {
        UniMap.personalizacion.restaurarTodo();
        refrescar();
        util.notificar(t('adm.restaurado'));
      }
    });

    /* Modal */
    util.el('form-espacio').addEventListener('submit', guardarFormulario);
    var cerrar = document.querySelectorAll('.cerrar-modal-admin');
    for (var c = 0; c < cerrar.length; c++) cerrar[c].addEventListener('click', cerrarModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !util.el('modal-espacio').classList.contains('hidden')) cerrarModal();
    });

    document.addEventListener('idioma:cambiado', function () {
      pintarTabla();
      if (!util.el('tab-estadisticas').classList.contains('hidden')) pintarEstadisticas();
    });

    pintarTabla();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
