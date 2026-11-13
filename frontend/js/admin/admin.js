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
    var consulta = util.normalizar(util.el('admin-buscar').value).trim();
    var torre = util.el('admin-filtro-torre').value;
    var tipo = util.el('admin-filtro-tipo').value;

    var lista = espaciosFiltrables();
    var resultado = [];
    for (var i = 0; i < lista.length; i++) {
      var s = lista[i];
      if (consulta && util.normalizar(s.nombre).indexOf(consulta) === -1) continue;
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
          sincronizarBaja(id);
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

  /* ═══════════════ SINCRONIZACION CON EL BACKEND ═══════════════
     El cambio ya quedo en localStorage (la web responde al instante);
     aqui se envia ademas a Laravel para que aparezca en la base de
     datos. Si el backend esta apagado el cambio se encola y se
     reintenta solo. */
  function haySesionBackend() {
    return !!(UniMap.api && UniMap.api.activa() && UniMap.api.token());
  }

  function sincronizar(idEspacio) {
    if (!UniMap.api || !UniMap.api.activa()) return;

    if (!UniMap.api.token()) {
      util.notificar(t('adm.syncSinSesion'), 5000);
      return;
    }

    UniMap.api.sincronizarEspacio(idEspacio).then(function (r) {
      if (r.ok) {
        util.notificar(t('adm.syncOk'), 3500);
        /* Volver a traer los espacios guardados: el id visible pasa
           a ser el del backend (b{id}) y no queda ninguno duplicado */
        UniMap.api.cargarEspaciosRemotos().then(function (cargados) {
          if (cargados) refrescar();
        });
        return;
      }
      if (r.motivo === 'pendiente') { util.notificar(t('adm.syncPendiente'), 5000); return; }
      if (r.motivo === 'sin-sesion') { util.notificar(t('adm.syncSinSesion'), 5000); return; }
      util.notificar(t('adm.syncError') + (r.mensaje ? ': ' + r.mensaje : ''), 5000);
    });
  }

  function sincronizarBaja(idEspacio) {
    if (!haySesionBackend()) return;
    UniMap.api.sincronizarBaja(idEspacio).then(function (r) {
      if (r.motivo === 'pendiente') util.notificar(t('adm.syncPendiente'), 5000);
    });
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
      /* Posicion del marcador (pin) */
      util.el('esp-x').value = String(s.x !== undefined ? s.x : '');
      util.el('esp-y').value = String(s.y !== undefined ? s.y : '');
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
    util.el('esp-x-error').textContent = '';
    util.el('esp-y-error').textContent = '';

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
    var px = parseInt(util.el('esp-x').value, 10);
    var py = parseInt(util.el('esp-y').value, 10);
    if (isNaN(px) || px < 0 || px > 800) {
      util.el('esp-x-error').textContent = '0 – 800';
      return;
    }
    if (isNaN(py) || py < 0 || py > 600) {
      util.el('esp-y-error').textContent = '0 – 600';
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
      estado: util.el('esp-estado').value,
      /* Coordenadas del marcador (pin) sobre el plano */
      x: parseInt(util.el('esp-x').value, 10) || 0,
      y: parseInt(util.el('esp-y').value, 10) || 0
    };

    if (editandoId) {
      /* Cambio de planta: recolocar en la zona libre del nuevo piso */
      var original = buscarEspacio(editandoId);
      if (original && (cambios.piso !== original.piso || cambios.edificio !== original.edificio)) {
        cambios.x = 600;
        cambios.y = 60;
      }
      UniMap.personalizacion.guardarEdicion(editandoId, cambios);
      /* Primero el aviso local; el de sincronizacion llega despues
         (sincronizar notifica en cuanto responde el backend) */
      util.notificar(t('adm.actualizado'));
      sincronizar(editandoId);
    } else {
      var idNuevo = UniMap.personalizacion.agregar(cambios);
      util.notificar(t('adm.creado'));
      sincronizar(idNuevo);
    }

    cerrarModal();
    refrescar();
  }

  /* ═══════════════ ESTADISTICAS (HU-14) ═══════════════
     El panel se pinta primero con el conteo local (respaldo: funciona
     con el backend apagado) y, si hay sesion del backend, el ranking
     real de la base de datos lo sobreescribe. Asi la web y el backend
     nunca muestran cifras distintas: manda Supabase. */
  function pintarEstadisticas() {
    util.el('stats-total-espacios').textContent = String(espaciosFiltrables().length);
    pintarRanking(UniMap.estadisticas.ranking(10), UniMap.estadisticas.total());
    pintarDistribucion();
    pintarRankingBackend();
  }

  function pintarRanking(ranking, totalConsultas) {
    util.el('stats-total-consultas').textContent = String(totalConsultas);

    var contTop = util.el('stats-top');
    if (ranking.length === 0) {
      contTop.innerHTML = '<div class="admin-vacio">' + util.escapar(t('est.sinDatos')) + '</div>';
      return;
    }
    var maximo = ranking[0].total;
    var html = '';
    for (var i = 0; i < ranking.length; i++) {
      var pct = maximo ? Math.round((ranking[i].total / maximo) * 100) : 0;
      html += '<div class="stat-linea">' +
        '<span class="stat-nombre">' + util.escapar(ranking[i].nombre) + '</span>' +
        '<span class="stat-barra"><span class="stat-relleno" style="width:' + pct + '%"></span></span>' +
        '<span class="stat-valor">' + ranking[i].total + '</span></div>';
    }
    contTop.innerHTML = html;
  }

  /* Ranking de la base de datos (eventos de todas las maquinas).
     Silencioso: si el backend esta apagado o no hay token se queda
     el respaldo local ya pintado. */
  function pintarRankingBackend() {
    if (!haySesionBackend()) return;

    UniMap.api.solicitar('GET', '/admin/estadisticas/espacios-mas-consultados?limite=10').then(function (r) {
      if (!r.ok || !r.json || !Array.isArray(r.json.ranking)) return;

      var lista = [];
      for (var i = 0; i < r.json.ranking.length; i++) {
        var fila = r.json.ranking[i];
        lista.push({
          espacioId: String(fila.idEspacio),
          nombre: fila.nombreEspacio || String(fila.idEspacio),
          total: fila.totalConsultas || 0
        });
      }
      pintarRanking(lista, r.json.totalEventosRegistrados || 0);
    });
  }

  /* Distribucion por tipo */
  function pintarDistribucion() {
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

  /* ═══════════ CRUD DE LA BASE DE DATOS ═══════════
     Panel del administrador: usuarios, estudiantes, docentes, materias,
     carreras, roles y catalogos de tipos. Todo lo que se pinta aqui lo
     trae el backend (Supabase): no hay ninguna lista local.
     Usuarios, estudiantes y docentes NO se borran: se activan o
     desactivan para conservar favoritos, avisos y estadisticas. */

  var cacheCRUD = {};      /* entidad -> lista de filas */
  var cacheOpciones = {};  /* nombre de catalogo -> [{v,t}] */
  var cacheFiltros = {};   /* tab -> texto/filtros aplicados */
  var registroActual = null;
  var cargadas = {};

  /* Alias: el resto de admin.js usa UniMap.api.solicitar a mano */
  function solicitar(metodo, ruta, cuerpo, cabeceras) {
    return UniMap.api.solicitar(metodo, ruta, cuerpo, cabeceras);
  }

  function etiquetaDe(valor, defecto) {
    return valor || defecto || '—';
  }

  function celdaEstado(estaActivo) {
    var clase = estaActivo ? 'activo' : 'inactivo';
    return '<span class="estado-punto ' + clase + '"></span>' +
      util.escapar(estaActivo ? t('ley.activo') : t('ley.inactivo'));
  }

  function celdaRol(rol) {
    return '<span class="etiqueta-rol">' + util.escapar(etiquetaDe(rol)) + '</span>';
  }

  function celdaCarrera(nombre) {
    return '<span class="etiqueta-carrera">' + util.escapar(etiquetaDe(nombre)) + '</span>';
  }

  function celdaLista(texto) {
    return '<span class="celda-multi">' + util.escapar(etiquetaDe(texto)) + '</span>';
  }

  function nombresDe(lista, campo) {
    if (!lista || !lista.length) return '—';
    var partes = [];
    for (var i = 0; i < lista.length; i++) partes.push(lista[i][campo] || '');
    return partes.join(', ');
  }

  /* Campos del formulario (id = nombre del campo que espera Laravel) */
  var CAMPOS_NOMBRE = [
    { id: 'nombreUsuario', tipo: 'texto', etiqueta: 'adm.fNombre', req: true },
    { id: 'apellidoPaternoUsuario', tipo: 'texto', etiqueta: 'adm.fPaterno' },
    { id: 'apellidoMaternoUsuario', tipo: 'texto', etiqueta: 'adm.fMaterno' }
  ];
  var CAMPOS_CORREO = [
    { id: 'correoUsuario', tipo: 'correo', etiqueta: 'adm.fCorreo', req: true }
  ];
  var CAMPOS_CONTRASENA = [
    { id: 'contrasena', tipo: 'password', etiqueta: 'adm.fContrasenaAlta', reqEnAlta: true, edita: true }
  ];

  var CRUD = {
    usuarios: {
      lectura: { ruta: '/admin/usuarios', llave: 'usuarios' },
      ruta: '/admin/usuarios', campoId: 'idUsuario', estado: true,
      titulo: 'adm.tabUsuarios', altaTitulo: 'adm.nuevoUsuario',
      texto: function (r) { return (r.nombreCompleto || '') + ' ' + (r.correoUsuario || '') + ' ' + (r.rol || ''); },
      columnas: [
        { t: 'adm.nombre', v: function (r) {
            return '<strong>' + util.escapar(r.nombreCompleto || '') + '</strong>' +
              '<span class="celda-secundaria">' + util.escapar(r.correoUsuario || '') + '</span>'; } },
        { t: 'adm.colRol', v: function (r) { return celdaRol(r.rol); } },
        { t: 'adm.colIdioma', v: function (r) { return util.escapar(String(r.idiomaPreferido || 'es').toUpperCase()); } },
        { t: 'adm.estado', estado: true }
      ],
      filtros: [
        { id: 'filtro-rol', campo: function (r) { return r.rol || ''; }, opciones: 'roles' },
        { id: 'filtro-estado', campo: function (r) { return r.estaActivo ? 'activo' : 'inactivo'; }, opciones: 'estado' }
      ],
      campos: CAMPOS_NOMBRE.concat(CAMPOS_CORREO, CAMPOS_CONTRASENA, [
        { id: 'nombreRol', tipo: 'select', etiqueta: 'adm.fRol', req: true, opciones: 'roles', esRol: true },
        { id: 'idiomaPreferido', tipo: 'select', etiqueta: 'adm.colIdioma',
          opciones: [{ v: 'es', t: 'ES' }, { v: 'en', t: 'EN' }] },
        { id: 'idCarrera', tipo: 'select', etiqueta: 'adm.fCarrera', req: true, opciones: 'carreras', siRol: 'estudiante' },
        { id: 'semestreEstudiante', tipo: 'numero', etiqueta: 'adm.fSemestre', req: true, min: 1, max: 15, siRol: 'estudiante' },
        { id: 'departamentoDocente', tipo: 'texto', etiqueta: 'adm.fDepartamento', siRol: 'docente' }
      ])
    },

    estudiantes: {
      lectura: { ruta: '/admin/estudiantes', llave: 'estudiantes' },
      ruta: '/admin/estudiantes', rutaAlta: '/admin/usuarios', campoId: 'idEstudiante',
      idUsuario: true, estado: true, rolFijo: 'estudiante',
      titulo: 'adm.tabEstudiantes', altaTitulo: 'adm.nuevoEstudiante',
      texto: function (r) { return (r.nombreCompleto || '') + ' ' + (r.correoUsuario || '') + ' ' + (r.nombreCarrera || ''); },
      columnas: [
        { t: 'adm.nombre', v: function (r) {
            return '<strong>' + util.escapar(r.nombreCompleto || '') + '</strong>' +
              '<span class="celda-secundaria">' + util.escapar(r.correoUsuario || '') + '</span>'; } },
        { t: 'adm.colCarrera', v: function (r) { return celdaCarrera(r.nombreCarrera); } },
        { t: 'adm.colSemestre', v: function (r) { return util.escapar(String(r.semestreEstudiante || '')); } },
        { t: 'adm.estado', estado: true }
      ],
      filtros: [
        { id: 'filtro-carrera-estudiantes', campo: function (r) { return String(r.idCarrera || ''); }, opciones: 'carreras' },
        { id: 'filtro-estado-estudiantes', campo: function (r) { return r.estaActivo ? 'activo' : 'inactivo'; }, opciones: 'estado' }
      ],
      campos: CAMPOS_NOMBRE.concat(CAMPOS_CORREO, CAMPOS_CONTRASENA, [
        { id: 'idCarrera', tipo: 'select', etiqueta: 'adm.fCarrera', req: true, opciones: 'carreras', ancho: false },
        { id: 'semestreEstudiante', tipo: 'numero', etiqueta: 'adm.fSemestre', req: true, min: 1, max: 15 }
      ])
    },

    docentes: {
      lectura: { ruta: '/admin/docentes', llave: 'docentes' },
      ruta: '/admin/docentes', rutaAlta: '/admin/usuarios', campoId: 'idDocente',
      idUsuario: true, estado: true, rolFijo: 'docente',
      titulo: 'adm.tabDocentes', altaTitulo: 'adm.nuevoDocente',
      texto: function (r) { return (r.nombreCompleto || '') + ' ' + (r.correoUsuario || '') + ' ' + (r.departamentoDocente || ''); },
      columnas: [
        { t: 'adm.nombre', v: function (r) {
            return '<strong>' + util.escapar(r.nombreCompleto || '') + '</strong>' +
              '<span class="celda-secundaria">' + util.escapar(r.correoUsuario || '') + '</span>'; } },
        { t: 'adm.colDepartamento', v: function (r) { return util.escapar(r.departamentoDocente || '—'); } },
        { t: 'adm.colOficina', v: function (r) { return util.escapar(r.nombreEspacioOficina || '—'); } },
        { t: 'adm.colMaterias', v: function (r) { return celdaLista(nombresDe(r.materias, 'nombreMateria')); } },
        { t: 'adm.estado', estado: true }
      ],
      filtros: [
        { id: 'filtro-estado-docentes', campo: function (r) { return r.estaActivo ? 'activo' : 'inactivo'; }, opciones: 'estado' }
      ],
      campos: CAMPOS_NOMBRE.concat(CAMPOS_CORREO, CAMPOS_CONTRASENA, [
        { id: 'departamentoDocente', tipo: 'texto', etiqueta: 'adm.fDepartamento' },
        { id: 'idEspacioOficina', tipo: 'select', etiqueta: 'adm.fOficina', opciones: 'oficinas' },
        { id: 'idMaterias', tipo: 'multi', etiqueta: 'adm.fMaterias', opciones: 'materias', ancho: true }
      ])
    },

    administradores: {
      lectura: { ruta: '/admin/administradores', llave: 'administradores' },
      ruta: '/admin/administradores', rutaAlta: '/admin/usuarios', campoId: 'idUsuario',
      idUsuario: true, estado: true, rolFijo: 'administrador',
      titulo: 'adm.tabAdministradores', altaTitulo: 'adm.nuevoAdministrador',
      texto: function (r) { return (r.nombreCompleto || '') + ' ' + (r.correoUsuario || ''); },
      columnas: [
        { t: 'adm.nombre', v: function (r) {
            return '<strong>' + util.escapar(r.nombreCompleto || '') + '</strong>' +
              '<span class="celda-secundaria">' + util.escapar(r.correoUsuario || '') + '</span>'; } },
        { t: 'adm.colRol', v: function (r) { return celdaRol(r.rol); } },
        { t: 'adm.colIdioma', v: function (r) { return util.escapar(String(r.idiomaPreferido || 'es').toUpperCase()); } },
        { t: 'adm.estado', estado: true }
      ],
      filtros: [
        { id: 'filtro-estado-administradores', campo: function (r) { return r.estaActivo ? 'activo' : 'inactivo'; }, opciones: 'estado' }
      ],
      campos: CAMPOS_NOMBRE.concat(CAMPOS_CORREO, CAMPOS_CONTRASENA, [
        { id: 'idiomaPreferido', tipo: 'select', etiqueta: 'adm.colIdioma',
          opciones: [{ v: 'es', t: 'ES' }, { v: 'en', t: 'EN' }] }
      ])
    },

    materias: {
      lectura: { ruta: '/admin/materias', llave: 'materias' },
      ruta: '/admin/catalogos/materias', campoId: 'idMateria', borrar: true,
      titulo: 'adm.tabMaterias', altaTitulo: 'adm.nuevaMateria',
      texto: function (r) { return (r.nombreMateria || '') + ' ' + nombresDe(r.docentes, 'nombreCompleto'); },
      columnas: [
        { t: 'adm.fNombreCatalogo', v: function (r) { return '<strong>' + util.escapar(r.nombreMateria || '') + '</strong>'; } },
        { t: 'adm.colDocentes', v: function (r) { return celdaLista(nombresDe(r.docentes, 'nombreCompleto')); } }
      ],
      filtros: [],
      campos: [
        { id: 'nombreMateria', tipo: 'texto', etiqueta: 'adm.fNombreCatalogo', req: true, ancho: true },
        { id: 'idDocentes', tipo: 'multi', etiqueta: 'adm.colDocentes', opciones: 'docentes', ancho: true }
      ]
    },

    carreras: {
      lectura: { ruta: '/catalogos/carreras', llave: 'carreras' },
      ruta: '/admin/catalogos/carreras', campoId: 'idCarrera', borrar: true,
      titulo: 'adm.tabCarreras', altaTitulo: 'adm.nuevaCarrera',
      texto: function (r) { return r.nombreCarrera || ''; },
      columnas: [{ t: 'adm.fNombreCatalogo', v: function (r) { return '<strong>' + util.escapar(r.nombreCarrera || '') + '</strong>'; } }],
      filtros: [],
      campos: [{ id: 'nombreCarrera', tipo: 'texto', etiqueta: 'adm.fNombreCatalogo', req: true, ancho: true }]
    },

    roles: {
      lectura: { ruta: '/roles', llave: 'roles' },
      ruta: '/admin/catalogos/roles', campoId: 'idRol', borrar: true,
      titulo: 'adm.tabRoles', altaTitulo: 'adm.nuevoRol',
      texto: function (r) { return (r.nombreRol || '') + ' ' + (r.descripcionRol || ''); },
      columnas: [
        { t: 'adm.fNombreCatalogo', v: function (r) { return '<strong>' + util.escapar(r.nombreRol || '') + '</strong>'; } },
        { t: 'adm.colDescripcion', v: function (r) { return util.escapar(r.descripcionRol || '—'); } }
      ],
      filtros: [],
      campos: [
        { id: 'nombreRol', tipo: 'texto', etiqueta: 'adm.fNombreCatalogo', req: true },
        { id: 'descripcionRol', tipo: 'texto', etiqueta: 'adm.fDescripcion', ancho: true }
      ]
    }
  };

  /* Los tres catalogos de tipos comparten pantalla: cambian segun el
     selector de la pestaña "Catalogos" */
  CRUD['tipos-espacio'] = {
    lectura: { ruta: '/catalogos/tipos-espacio', llave: 'tiposEspacio' },
    ruta: '/admin/catalogos/tipos-espacio', campoId: 'idTipoEspacio', borrar: true,
    titulo: 'adm.catTiposEspacio', altaTitulo: 'adm.nuevoRegistro',
    texto: function (r) { return r.nombreTipoEspacio || ''; },
    columnas: [{ t: 'adm.fNombreCatalogo', v: function (r) { return '<strong>' + util.escapar(r.nombreTipoEspacio || '') + '</strong>'; } }],
    filtros: [],
    campos: [{ id: 'nombreTipoEspacio', tipo: 'texto', etiqueta: 'adm.fNombreCatalogo', req: true, ancho: true }]
  };
  CRUD['categorias-servicio'] = {
    lectura: { ruta: '/catalogos/categorias-servicio', llave: 'categoriasServicio' },
    ruta: '/admin/catalogos/categorias-servicio', campoId: 'idCategoriaServicio', borrar: true,
    titulo: 'adm.catCategoriasServicio', altaTitulo: 'adm.nuevoRegistro',
    texto: function (r) { return r.nombreCategoriaServicio || ''; },
    columnas: [{ t: 'adm.fNombreCatalogo', v: function (r) { return '<strong>' + util.escapar(r.nombreCategoriaServicio || '') + '</strong>'; } }],
    filtros: [],
    campos: [{ id: 'nombreCategoriaServicio', tipo: 'texto', etiqueta: 'adm.fNombreCatalogo', req: true, ancho: true }]
  };
  CRUD['tipos-laboratorio'] = {
    lectura: { ruta: '/catalogos/tipos-laboratorio', llave: 'tiposLaboratorio' },
    ruta: '/admin/catalogos/tipos-laboratorio', campoId: 'idTipoLaboratorio', borrar: true,
    titulo: 'adm.catTiposLaboratorio', altaTitulo: 'adm.nuevoRegistro',
    texto: function (r) { return r.nombreTipoLaboratorio || ''; },
    columnas: [{ t: 'adm.fNombreCatalogo', v: function (r) { return '<strong>' + util.escapar(r.nombreTipoLaboratorio || '') + '</strong>'; } }],
    filtros: [],
    campos: [{ id: 'nombreTipoLaboratorio', tipo: 'texto', etiqueta: 'adm.fNombreCatalogo', req: true, ancho: true }]
  };

  /* Configuracion efectiva de una pestana (en "Catalogos" depende del
     selector) */
  function configDe(tab) {
    if (tab === 'catalogos') {
      var sel = util.el('selector-catalogo');
      return CRUD[sel ? sel.value : 'tipos-espacio'];
    }
    return CRUD[tab] || null;
  }

  function listaDe(tab) {
    var cfg = configDe(tab);
    return (cfg && cacheCRUD[cfg.lectura.llave]) || [];
  }

  /* ── Catalogos de apoyo (selects y filtros) ── */
  function pedirOpciones(nombre) {
    if (cacheOpciones[nombre]) return Promise.resolve(cacheOpciones[nombre]);
    if (!UniMap.api || !UniMap.api.activa()) return Promise.resolve([]);

    var rutas = {
      roles: '/roles',
      carreras: '/catalogos/carreras',
      materias: '/admin/materias',
      docentes: '/admin/docentes',
      oficinas: '/espacios?incluirInactivos=1'
    };
    var rutasRoles = {
      roles: 'roles', carreras: 'carreras', materias: 'materias', docentes: 'docentes'
    };

    return solicitar('GET', rutas[nombre]).then(function (r) {
      if (!r.ok || !r.json) return [];
      var lista = rutasRoles[nombre] ? r.json[rutasRoles[nombre]] : r.json.data;
      if (!Array.isArray(lista)) return [];

      var opciones = lista.map(function (x) {
        /* El valor es el nombre (no el id): el filtro lo compara con
           r.rol y el modal lo envia como nombreRol al backend */
        if (nombre === 'roles') return { v: x.nombreRol, t: x.nombreRol };
        if (nombre === 'carreras') return { v: x.idCarrera, t: x.nombreCarrera };
        if (nombre === 'materias') return { v: x.idMateria, t: x.nombreMateria };
        if (nombre === 'docentes') {
          return { v: x.idDocente, t: x.nombreCompleto + (x.estaActivo ? '' : ' (' + t('ley.inactivo') + ')') };
        }
        return { v: x.idEspacio, t: (x.nombreEspacio || '') + ' (' + x.idEspacio + ')' };
      });

      if (nombre === 'oficinas') {
        opciones.sort(function (a, b) { return String(a.t).localeCompare(String(b.t)); });
      }
      cacheOpciones[nombre] = opciones;
      return opciones;
    });
  }

  /* ── Lectura y pintado ── */
  function textoVacio(tab, mensaje) {
    var vacio = util.el('vacio-' + tab);
    if (vacio) {
      vacio.textContent = mensaje;
      vacio.classList.remove('hidden');
    }
  }

  function cargarCRUD(tab) {
    var cfg = configDe(tab);
    if (!cfg) return;
    var cuerpo = util.el('cuerpo-' + tab);
    if (!cuerpo) return;

    if (!haySesionBackend()) {
      cuerpo.innerHTML = '';
      textoVacio(tab, t('adm.sinSesionCrud'));
      return;
    }

    cuerpo.innerHTML = '<tr><td colspan="99">' + util.escapar(t('adm.cargando')) + '</td></tr>';

    /* Los filtros (rol, carrera...) salen de sus catalogos: se piden en
       paralelo con la lista para pintar todo de una vez */
    var necesarias = {};
    if (cfg.filtros) {
      for (var f = 0; f < cfg.filtros.length; f++) {
        if (cfg.filtros[f].opciones !== 'estado') necesarias[cfg.filtros[f].opciones] = true;
      }
    }

    var peticiones = [solicitar('GET', cfg.lectura.ruta)];
    Object.keys(necesarias).forEach(function (n) { peticiones.push(pedirOpciones(n)); });

    Promise.all(peticiones).then(function (resultados) {
      var r = resultados[0];
      if (!r.ok || !r.json) {
        cuerpo.innerHTML = '';
        textoVacio(tab, r.estado === 0 ? t('mapa.sinBackend') : t('adm.errorGenerico'));
        if (r.json && r.json.mensaje) util.notificar(r.json.mensaje, 6000);
        return;
      }
      var lista = r.json[cfg.lectura.llave];
      cacheCRUD[cfg.lectura.llave] = Array.isArray(lista) ? lista : [];
      cargadas[tab] = true;
      rellenarFiltro(tab);
      pintarCRUD(tab);
    });
  }

  function rellenarFiltro(tab) {
    var cfg = configDe(tab);
    if (!cfg || !cfg.filtros) return;
    for (var i = 0; i < cfg.filtros.length; i++) {
      var filtro = cfg.filtros[i];
      var sel = util.el(filtro.id);
      if (!sel || filtro.opciones === 'estado') continue;

      var actual = sel.value;
      var html = '<option value="" data-i18n="adm.filtroTodos">' + util.escapar(t('adm.filtroTodos')) + '</option>';
      var opciones = cacheOpciones[filtro.opciones] || [];
      for (var j = 0; j < opciones.length; j++) {
        html += '<option value="' + util.escapar(String(opciones[j].v)) + '">' +
          util.escapar(String(opciones[j].t)) + '</option>';
      }
      sel.innerHTML = html;
      sel.value = actual || '';
    }
  }

  function filasFiltradas(tab) {
    var cfg = configDe(tab);
    var lista = listaDe(tab).slice();
    var campo = util.el('buscar-' + tab);
    var texto = campo ? util.normalizar(campo.value).trim() : '';

    var condiciones = [];
    if (cfg && cfg.filtros) {
      for (var i = 0; i < cfg.filtros.length; i++) {
        var sel = util.el(cfg.filtros[i].id);
        if (sel && sel.value) condiciones.push({ filtro: cfg.filtros[i], valor: sel.value });
      }
    }

    return lista.filter(function (fila) {
      if (texto && util.normalizar(cfg.texto(fila)).indexOf(texto) === -1) return false;
      for (var k = 0; k < condiciones.length; k++) {
        if (String(condiciones[k].filtro.campo(fila)) !== condiciones[k].valor) return false;
      }
      return true;
    });
  }

  function pintarCRUD(tab) {
    var cfg = configDe(tab);
    var cabecera = util.el('cabecera-' + tab);
    var cuerpo = util.el('cuerpo-' + tab);
    var vacio = util.el('vacio-' + tab);
    var contador = util.el('contador-' + tab);
    if (!cfg || !cabecera || !cuerpo) return;

    /* Cabecera */
    var cab = '';
    for (var c = 0; c < cfg.columnas.length; c++) {
      cab += '<th' + (cfg.columnas[c].estado ? ' class="col-estado"' : '') + '>' +
        util.escapar(t(cfg.columnas[c].t)) + '</th>';
    }
    cab += '<th>' + util.escapar(t('adm.accion')) + '</th>';
    cabecera.innerHTML = '<tr>' + cab + '</tr>';

    /* Filas */
    var filas = filasFiltradas(tab);
    if (contador) contador.textContent = filas.length + ' / ' + listaDe(tab).length;

    if (!filas.length) {
      cuerpo.innerHTML = '';
      if (vacio) {
        vacio.textContent = t('adm.vacio');
        vacio.classList.remove('hidden');
      }
      return;
    }
    if (vacio) vacio.classList.add('hidden');

    var html = '';
    for (var i = 0; i < filas.length; i++) {
      var fila = filas[i];
      var id = fila[cfg.campoId];
      html += '<tr>';
      for (var d = 0; d < cfg.columnas.length; d++) {
        var col = cfg.columnas[d];
        html += '<td' + (col.estado ? ' class="col-estado"' : '') + '>' +
          (col.estado ? celdaEstado(!!fila.estaActivo) : col.v(fila)) + '</td>';
      }
      html += '<td class="col-acciones">' +
        '<button class="btn-tabla-editar" data-tab="' + tab + '" data-accion="editar" data-id="' +
        util.escapar(String(id)) + '">' + util.escapar(t('adm.editar')) + '</button>';

      if (cfg.estado) {
        html += '<button class="btn-tabla-estado ' + (fila.estaActivo ? 'apagar' : 'encender') + '" ' +
          'data-tab="' + tab + '" data-accion="estado" data-id="' + util.escapar(String(id)) + '">' +
          util.escapar(fila.estaActivo ? t('adm.desactivar') : t('adm.activar')) + '</button>';
      }
      if (cfg.borrar) {
        html += '<button class="btn-tabla-eliminar" data-tab="' + tab + '" data-accion="eliminar" ' +
          'data-id="' + util.escapar(String(id)) + '" data-nombre="' +
          util.escapar(cfg.texto(fila).trim()) + '">' + util.escapar(t('adm.eliminar')) + '</button>';
      }
      html += '</td></tr>';
    }
    cuerpo.innerHTML = html;
  }

  function buscarFila(cfg, id) {
    var lista = cacheCRUD[cfg.lectura.llave] || [];
    for (var i = 0; i < lista.length; i++) {
      if (String(lista[i][cfg.campoId]) === String(id)) return lista[i];
    }
    return null;
  }

  /* ── Modal: construccion del formulario ── */
  function agruparCampos(campos) {
    var filas = [];
    var pendiente = [];
    for (var i = 0; i < campos.length; i++) {
      if (campos[i].ancho) {
        if (pendiente.length) { filas.push(pendiente); pendiente = []; }
        filas.push([campos[i]]);
      } else {
        pendiente.push(campos[i]);
        if (pendiente.length === 2) { filas.push(pendiente); pendiente = []; }
      }
    }
    if (pendiente.length) filas.push(pendiente);
    return filas;
  }

  function opcionesHTML(campo, valor) {
    /* Las opciones pueden salir de un catalogo remoto (cache) o ser
       una lista fija declarada en la propia config del campo */
    var lista = Array.isArray(campo.opciones) ? campo.opciones : (cacheOpciones[campo.opciones] || []);
    var html = '<option value="" data-i18n="adm.filtroTodos">' + util.escapar(t('adm.filtroTodos')) + '</option>';
    var esMulti = campo.tipo === 'multi';
    if (esMulti) html = '';
    for (var i = 0; i < lista.length; i++) {
      var sel = false;
      if (esMulti) {
        sel = Array.isArray(valor) && valor.map(String).indexOf(String(lista[i].v)) !== -1;
      } else {
        sel = String(valor === undefined || valor === null ? '' : valor) === String(lista[i].v);
      }
      html += '<option value="' + util.escapar(String(lista[i].v)) + '"' + (sel ? ' selected' : '') + '>' +
        util.escapar(String(lista[i].t)) + '</option>';
    }
    return html;
  }

  function valorDe(campo, fila, esAlta) {
    if (!fila) {
      if (campo.tipo === 'multi') return [];
      if (campo.tipo === 'numero') return campo.min || 1;
      if (campo.id === 'idiomaPreferido') return 'es';
      return '';
    }
    if (campo.id === 'idMaterias') {
      return (fila.materias || []).map(function (m) { return String(m.idMateria); });
    }
    if (campo.id === 'idDocentes') {
      return (fila.idDocentes || []).map(function (m) { return String(m); });
    }
    /* El listado trae el rol como nombre en r.rol */
    if (campo.id === 'nombreRol') return fila.nombreRol || fila.rol || '';
    var valor = fila[campo.id];
    if (valor === undefined || valor === null) return campo.tipo === 'multi' ? [] : '';
    return valor;
  }

  function campoHTML(campo, valor, esAlta) {
    var id = 'cr-' + campo.id;
    var etiqueta = t(campo.etiqueta);
    var contenido;
    var clases = 'form-group' + (campo.ancho ? ' campo-ancho' : '');

    if (campo.tipo === 'select') {
      contenido = '<select id="' + id + '" data-campo="' + util.escapar(campo.id) + '">' +
        opcionesHTML(campo, valor) + '</select>';
    } else if (campo.tipo === 'multi') {
      contenido = '<select id="' + id + '" multiple data-campo="' + util.escapar(campo.id) + '">' +
        opcionesHTML(campo, valor) + '</select>';
    } else if (campo.tipo === 'numero') {
      contenido = '<input type="number" id="' + id + '" data-campo="' + util.escapar(campo.id) +
        '" min="' + (campo.min || 0) + '" max="' + (campo.max || 99) + '" value="' +
        util.escapar(String(valor)) + '">';
    } else if (campo.tipo === 'correo') {
      contenido = '<input type="email" id="' + id + '" data-campo="' + util.escapar(campo.id) +
        '" value="' + util.escapar(String(valor)) + '">';
    } else if (campo.tipo === 'password') {
      contenido = '<input type="password" id="' + id + '" data-campo="' + util.escapar(campo.id) +
        '" autocomplete="new-password" placeholder="' +
        util.escapar(esAlta ? '' : t('adm.fContrasena')) + '">';
    } else {
      contenido = '<input type="text" id="' + id + '" data-campo="' + util.escapar(campo.id) +
        '" value="' + util.escapar(String(valor)) + '">';
    }

    return '<div class="' + clases + '"' +
      (campo.siRol ? ' data-si-rol="' + util.escapar(campo.siRol) + '"' : '') + '>' +
      '<label for="' + id + '">' + util.escapar(etiqueta) + (campo.req ? ' *' : '') + '</label>' +
      contenido + '<span class="error-msg" id="' + id + '-error"></span></div>';
  }

  function abrirRegistro(tab, id) {
    var cfg = configDe(tab);
    if (!cfg) return;
    var fila = id ? buscarFila(cfg, id) : null;
    registroActual = { tab: tab, id: id || null, rolFijo: cfg.rolFijo || null };

    util.el('modal-registro-titulo').textContent = fila
      ? t(cfg.titulo) + ' · ' + t('adm.editar')
      : t(cfg.altaTitulo);

    /* Los catalogos de apoyo (roles, carreras...) se piden si faltan */
    var necesarias = {};
    for (var i = 0; i < cfg.campos.length; i++) {
      var c = cfg.campos[i];
      if (typeof c.opciones === 'string') necesarias[c.opciones] = true;
    }
    if (cfg.filtros) {
      for (var f = 0; f < cfg.filtros.length; f++) {
        if (cfg.filtros[f].opciones !== 'estado') necesarias[cfg.filtros[f].opciones] = true;
      }
    }

    var pendientes = Object.keys(necesarias).map(pedirOpciones);
    Promise.all(pendientes).then(function () { pintarModal(cfg, fila, !id); });
  }

  function pintarModal(cfg, fila, esAlta) {
    var cont = util.el('campos-registro');
    var grupos = agruparCampos(cfg.campos);
    var html = '';

    for (var i = 0; i < grupos.length; i++) {
      html += '<div class="form-row">';
      for (var j = 0; j < grupos[i].length; j++) {
        html += campoHTML(grupos[i][j], valorDe(grupos[i][j], fila, esAlta), esAlta);
      }
      html += '</div>';
    }
    cont.innerHTML = html;

    /* Las contrasenas nunca muestran la guardada */
    var pass = cont.querySelector('[data-campo="contrasena"]');
    if (pass) pass.value = '';

    aplicarVisibilidadRol(cont);
    var selRol = cont.querySelector('[data-campo="nombreRol"]');
    if (selRol) selRol.addEventListener('change', function () { aplicarVisibilidadRol(cont); });

    util.el('modal-registro').classList.remove('hidden');
    setTimeout(function () {
      var primero = cont.querySelector('input, select');
      if (primero) primero.focus();
    }, 50);
  }

  function aplicarVisibilidadRol(cont) {
    var selRol = cont.querySelector('[data-campo="nombreRol"]');
    var rol = selRol ? selRol.value : (registroActual && registroActual.rolFijo) || '';
    var grupos = cont.querySelectorAll('[data-si-rol]');
    for (var i = 0; i < grupos.length; i++) {
      var requerido = grupos[i].getAttribute('data-si-rol');
      grupos[i].classList.toggle('hidden', !!requerido && requerido !== rol);
    }
  }

  function cerrarRegistro() {
    util.el('modal-registro').classList.add('hidden');
    registroActual = null;
  }

  /* ── Guardado (alta y edicion) ── */
  function leerYValidar(cfg, esAlta) {
    var cuerpo = {};
    var cont = util.el('campos-registro');
    var errores = 0;

    for (var i = 0; i < cfg.campos.length; i++) {
      var campo = cfg.campos[i];
      var grupo = cont.querySelector('[data-campo="' + campo.id + '"]');
      if (!grupo) continue;
      /* Campos ocultos por rol: no viajan */
      var envoltura = grupo.closest('[data-si-rol]');
      if (envoltura && envoltura.classList.contains('hidden')) continue;

      var error = util.el('cr-' + campo.id + '-error');
      if (error) error.textContent = '';
      var valor;

      if (campo.tipo === 'multi') {
        var seleccion = [];
        for (var s = 0; s < grupo.options.length; s++) {
          if (grupo.options[s].selected && grupo.options[s].value) seleccion.push(grupo.options[s].value);
        }
        valor = seleccion;
      } else if (campo.tipo === 'numero') {
        valor = parseInt(grupo.value, 10);
      } else {
        valor = String(grupo.value || '').trim();
      }

      var vacio = campo.tipo === 'multi' ? valor.length === 0 : (valor === '' || (campo.tipo === 'numero' && isNaN(valor)));
      if (campo.req && vacio) {
        if (error) error.textContent = t('adm.errRequerido');
        errores++;
        continue;
      }
      if (campo.reqEnAlta && esAlta && campo.tipo === 'password' && String(valor).length < 8) {
        if (error) error.textContent = valor ? t('adm.errMin8') : t('adm.errRequerido');
        errores++;
        continue;
      }
      if (campo.tipo === 'password') {
        if (String(valor) && String(valor).length < 8) {
          if (error) error.textContent = t('adm.errMin8');
          errores++;
          continue;
        }
        if (!String(valor)) continue;   /* vacia = no cambiar la clave */
      }
      if (campo.tipo === 'correo' && valor && !util.validarCorreo(valor)) {
        if (error) error.textContent = t('adm.errCorreo');
        errores++;
        continue;
      }
      if (campo.tipo === 'numero' && !vacio) {
        if ((campo.min && valor < campo.min) || (campo.max && valor > campo.max)) {
          if (error) error.textContent = campo.min + ' – ' + campo.max;
          errores++;
          continue;
        }
      }
      if (campo.tipo === 'multi' && valor.length === 0 && campo.id === 'idMaterias' && !esAlta) {
        cuerpo[campo.id] = [];   /* vaciar materias del docente es valido */
        continue;
      }

      cuerpo[campo.id] = valor;
    }

    if (cfg.rolFijo) cuerpo.nombreRol = cfg.rolFijo;
    if (errores > 0) return null;
    return cuerpo;
  }

  function guardarRegistro(e) {
    if (e) e.preventDefault();
    if (!registroActual) return;

    var cfg = configDe(registroActual.tab);
    if (!cfg) return;
    var esAlta = !registroActual.id;
    var cuerpo = leerYValidar(cfg, esAlta);
    if (!cuerpo) return;

    if (!haySesionBackend()) {
      util.notificar(t('adm.sinSesionCrud'), 6000);
      return;
    }

    var ruta = esAlta
      ? (cfg.rutaAlta || cfg.ruta)
      : (cfg.ruta + '/' + registroActual.id);
    var metodo = esAlta ? 'POST' : 'PUT';

    solicitar(metodo, ruta, cuerpo).then(function (r) {
      if (r.ok) {
        util.notificar(esAlta ? t('adm.creadoMsg') : t('adm.actualizadoMsg'));
        var tab = registroActual.tab;
        cerrarRegistro();
        cargarCRUD(tab);
        return;
      }
      util.notificar(mensajeDeError(r), 7000);
    });
  }

  function mensajeDeError(r) {
    if (r.estado === 0) return t('mapa.sinBackend');
    var json = r.json || {};
    if (Array.isArray(json.errors)) return json.errors.join(' · ');
    if (json.errors) {
      var partes = [];
      for (var k in json.errors) if (json.errors.hasOwnProperty(k)) partes = partes.concat(json.errors[k]);
      if (partes.length) return partes.join(' · ');
    }
    return json.mensaje || json.message || t('adm.errorGenerico');
  }

  /* ── Activar / desactivar y eliminar ── */
  function alternarEstado(tab, id) {
    var cfg = configDe(tab);
    var fila = buscarFila(cfg, id);
    if (!fila) return;

    var activar = !fila.estaActivo;
    var mensaje = activar
      ? t('adm.confirmarActivar', { n: cfg.texto(fila).trim() })
      : t('adm.confirmarDesactivar', { n: cfg.texto(fila).trim() });
    if (!window.confirm(mensaje)) return;

    if (!haySesionBackend()) { util.notificar(t('adm.sinSesionCrud'), 6000); return; }

    solicitar('PATCH', '/admin/usuarios/' + fila.idUsuario + '/estado',
      { estaActivo: activar }).then(function (r) {
        if (r.ok) {
          util.notificar(t('adm.estadoMsg'));
          cargarCRUD(tab);
          return;
        }
        util.notificar(mensajeDeError(r), 7000);
      });
  }

  function eliminarRegistro(tab, id) {
    var cfg = configDe(tab);
    if (!cfg || !cfg.borrar) return;
    var fila = buscarFila(cfg, id);
    if (!fila) return;

    if (!window.confirm(t('adm.confirmarBorrar', { n: cfg.texto(fila).trim() }))) return;
    if (!haySesionBackend()) { util.notificar(t('adm.sinSesionCrud'), 6000); return; }

    solicitar('DELETE', cfg.ruta + '/' + id).then(function (r) {
      if (r.ok || r.estado === 404) {
        util.notificar(t('adm.borradoMsg'));
        cargarCRUD(tab);
        return;
      }
      util.notificar(mensajeDeError(r), 7000);
    });
  }

  function accionCRUD(e) {
    var destino = e.target;
    var boton = destino && destino.closest ? destino.closest('button[data-accion]') : null;
    if (!boton) return;

    var tab = boton.getAttribute('data-tab');
    var id = boton.getAttribute('data-id');
    var accion = boton.getAttribute('data-accion');

    if (accion === 'editar') abrirRegistro(tab, id);
    else if (accion === 'estado') alternarEstado(tab, id);
    else if (accion === 'eliminar') eliminarRegistro(tab, id);
  }

  /* ═══════════════ ARRANQUE ═══════════════ */

  /* Pestañas del panel: "espacios" y "estadisticas" son paneles
     propios; el resto son CRUD que se cargan solos la primera vez
     que se abren (y se recargan si ya estaban vistos). */
  var TABS_CRUD = ['usuarios', 'estudiantes', 'docentes', 'administradores', 'materias', 'carreras', 'roles', 'catalogos'];

  function mostrarTab(nombre) {
    var tabs = document.querySelectorAll('.admin-tab');
    for (var j = 0; j < tabs.length; j++) {
      tabs[j].classList.toggle('active', tabs[j].getAttribute('data-tab') === nombre);
    }

    /* Ocultar todos los paneles y mostrar el pedido */
    var paneles = document.querySelectorAll('.admin-tab-panel');
    for (var p = 0; p < paneles.length; p++) {
      paneles[p].classList.toggle('hidden', paneles[p].id !== 'tab-' + nombre);
    }

    if (nombre === 'estadisticas') { pintarEstadisticas(); return; }
    if (TABS_CRUD.indexOf(nombre) === -1) return;   /* espacios: ya pintado */

    if (cargadas[nombre]) pintarCRUD(nombre);       /* refresca filtros/idioma */
    else cargarCRUD(nombre);
  }

  function iniciarCRUD() {
    /* Acciones de las tablas (editar / estado / eliminar) por
       delegacion: las filas se repintan y los botones son nuevos */
    var cuerpos = document.querySelectorAll('[id^="cuerpo-"]');
    for (var i = 0; i < cuerpos.length; i++) cuerpos[i].addEventListener('click', accionCRUD);

    /* Botones de alta */
    var altas = document.querySelectorAll('[data-alta]');
    for (var a = 0; a < altas.length; a++) {
      altas[a].addEventListener('click', function () {
        abrirRegistro(this.getAttribute('data-alta'), null);
      });
    }

    /* Buscadores y filtros de cada pestana */
    var buscadores = document.querySelectorAll('[id^="buscar-"]');
    for (var b = 0; b < buscadores.length; b++) {
      (function (campo) {
        campo.addEventListener('input', function () {
          pintarCRUD(campo.id.replace('buscar-', ''));
        });
      })(buscadores[b]);
    }

    var filtros = document.querySelectorAll('[id^="filtro-"]');
    for (var f = 0; f < filtros.length; f++) {
      (function (sel) {
        sel.addEventListener('change', function () {
          pintarCRUD(tabDelFiltro(sel.id));
        });
      })(filtros[f]);
    }

    /* Selector de la pestana "Catalogos" (tipos de espacio, categorias
       y tipos de laboratorio comparten pantalla) */
    var selector = util.el('selector-catalogo');
    if (selector) {
      selector.addEventListener('change', function () {
        cargadas['catalogos'] = false;
        cargarCRUD('catalogos');
      });
    }

    /* Modal de registro */
    var form = util.el('form-registro');
    if (form) form.addEventListener('submit', guardarRegistro);
    var cerrar = document.querySelectorAll('.cerrar-modal-registro');
    for (var c = 0; c < cerrar.length; c++) cerrar[c].addEventListener('click', cerrarRegistro);
  }

  /* Id del select de filtro -> pestana a la que pertenece */
  function tabDelFiltro(id) {
    if (id.indexOf('-estudiantes') !== -1) return 'estudiantes';
    if (id.indexOf('-docentes') !== -1) return 'docentes';
    if (id.indexOf('-administradores') !== -1) return 'administradores';
    if (id.indexOf('-catalogos') !== -1) return 'catalogos';
    if (id.indexOf('-materias') !== -1) return 'materias';
    if (id.indexOf('-carreras') !== -1) return 'carreras';
    if (id.indexOf('-roles') !== -1) return 'roles';
    return 'usuarios';   /* filtro-rol, filtro-estado */
  }

  function iniciar() {
    UniMap.i18n.iniciar();

    if (!verificarAcceso()) return;

    UniMap.personalizacion.reconstruir();

    /* Reintentar los cambios que quedaron en cola la vez anterior
       (por ejemplo, con el backend apagado) */
    if (haySesionBackend()) {
      UniMap.api.procesarPendientes().then(function (n) {
        if (n > 0) {
          util.notificar(t('adm.syncReintentados', { n: n }), 4500);
          refrescar();
        }
      });
    }

    /* Tabs */
    var tabs = document.querySelectorAll('.admin-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        mostrarTab(this.getAttribute('data-tab'));
      });
    }

    /* CRUD de la base de datos */
    iniciarCRUD();

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

    /* Modal de espacios */
    util.el('form-espacio').addEventListener('submit', guardarFormulario);
    var cerrar = document.querySelectorAll('.cerrar-modal-admin');
    for (var c = 0; c < cerrar.length; c++) cerrar[c].addEventListener('click', cerrarModal);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!util.el('modal-registro').classList.contains('hidden')) { cerrarRegistro(); return; }
      if (!util.el('modal-espacio').classList.contains('hidden')) cerrarModal();
    });

    document.addEventListener('idioma:cambiado', function () {
      pintarTabla();
      if (!util.el('tab-estadisticas').classList.contains('hidden')) pintarEstadisticas();
      /* Repintar la pestana CRUD abierta con las nuevas traducciones */
      var activa = document.querySelector('.admin-tab.active');
      if (activa) {
        var nombre = activa.getAttribute('data-tab');
        if (TABS_CRUD.indexOf(nombre) !== -1 && cargadas[nombre]) pintarCRUD(nombre);
      }
    });

    pintarTabla();

    /* Backend como fuente de verdad: traer los espacios registrados en
       la base de datos (visibles desde cualquier maquina) y refrescar.
       Si no responde, el panel queda vacio y con aviso. */
    if (UniMap.api && UniMap.api.activa()) {
      UniMap.api.cargarEspaciosRemotos().then(function (ok) {
        if (!ok) {
          util.avisoPersistente(t('mapa.sinBackend'), 'aviso-backend');
          return;
        }
        util.quitarAvisoPersistente('aviso-backend');
        refrescar();
      });
    } else {
      util.avisoPersistente(t('mapa.sinBackend'), 'aviso-backend');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
