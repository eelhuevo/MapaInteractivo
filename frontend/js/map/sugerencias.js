/* =========================================================
   map/sugerencias.js — sugerencias segun carrera y semestre
   (HU-20)
   · perfil del usuario (carrera + semestre) en localStorage
   · panel "Para ti" con espacios relevantes destacados
   · resaltado en el plano de los espacios sugeridos
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  var LLAVE = 'unimap_perfil';

  var CARRERAS = ['ing-sistemas', 'ing-electronica', 'ing-industrial', 'ing-civil', 'admin', 'derecho', 'ciencias'];

  /* Reglas: palabras clave sobre nombre/tipo/subtipo del espacio */
  var REGLAS = {
    'ing-sistemas': {
      subtipos: ['informatica', 'ia', 'ciberseguridad', 'iot', 'robotica'],
      palabras: ['Programacion', 'Bases de Datos', 'Redes', 'Sistemas Operativos', 'Algebra', 'Ingles', 'Investigacion']
    },
    'ing-electronica': {
      subtipos: ['electronica', 'fisica', 'iot'],
      palabras: ['Electronica', 'Fisica', 'Quimica', 'IoT', 'Redes', 'Innovacion']
    },
    'ing-industrial': {
      subtipos: ['mecanica', 'produccion'],
      palabras: ['Mecanica', 'Quimica', 'Probabilidad', 'Metodos Numericos', 'Administracion', 'Direccion', 'Secretaria']
    },
    'ing-civil': {
      subtipos: ['mecanica', 'fisica'],
      palabras: ['Estructuras', 'Fisica', 'Calculo', 'Quimica', 'Secretaria']
    },
    'admin': {
      subtipos: [],
      palabras: ['Administracion', 'Direccion', 'Secretaria', 'Coordinacion', 'Sala de Profesores', 'Coworking', 'Vinculacion', 'Startup']
    },
    'derecho': {
      subtipos: [],
      palabras: ['Ciencias Sociales', 'Derecho', 'Secretaria', 'Sala de Estudio', 'Biblioteca', 'Auditorio']
    },
    'ciencias': {
      subtipos: ['quimica', 'fisica', 'informatica'],
      palabras: ['Quimica', 'Fisica', 'Algebra', 'Calculo', 'Laboratorio', 'Biblioteca']
    }
  };

  /* Semestres avanzados priorizan laboratorios avanzados y
     oficinas de gestion academica */
  var AVANZADO = {
    subtipos: ['ia', 'ciberseguridad', 'robotica', 'produccion'],
    palabras: ['Direccion de Carrera', 'Investigacion', 'Vinculacion', 'Conferencias', 'Innovacion']
  };

  function t(clave) { return UniMap.i18n.t(clave); }

  function obtenerPerfil() {
    var todos = util.almacen.leer(LLAVE, {});
    if (!estado.usuarioActual) return null;
    return todos[estado.usuarioActual.id] || null;
  }

  function guardarPerfil(carrera, semestre) {
    if (!estado.usuarioActual) return;
    var todos = util.almacen.leer(LLAVE, {});
    todos[estado.usuarioActual.id] = { carrera: carrera, semestre: semestre };
    util.almacen.escribir(LLAVE, todos);
  }

  function coincide(espacio, regla) {
    if (!regla) return false;
    var nombre = (espacio.nombre || '').toLowerCase();
    var subtipo = espacio.subtipo || '';
    if (regla.subtipos && regla.subtipos.indexOf(subtipo) !== -1) return true;
    if (regla.palabras) {
      for (var i = 0; i < regla.palabras.length; i++) {
        if (nombre.indexOf(regla.palabras[i].toLowerCase()) !== -1) return true;
      }
    }
    return false;
  }

  function sugerencias() {
    var perfil = obtenerPerfil();
    if (!perfil || !perfil.carrera) return [];

    var regla = REGLAS[perfil.carrera];
    if (!regla) return [];

    var semestre = parseInt(perfil.semestre, 10) || 1;
    var avanzado = semestre >= 6;
    var resultado = [];

    var todos = estado.todosLosEspacios || [];
    for (var i = 0; i < todos.length; i++) {
      var s = todos[i];
      if (UniMap.filtros && UniMap.filtros.esInfraestructura(s)) continue;
      if (s.estado === 'inactivo') continue;

      var puntaje = 0;
      if (coincide(s, regla)) puntaje += 2;
      if (avanzado && coincide(s, AVANZADO)) puntaje += 3;
      if (!avanzado && s.tipo === 'aula') puntaje += 1;

      if (puntaje > 0) {
        resultado.push({ espacio: s, puntaje: puntaje });
      }
    }

    resultado.sort(function (a, b) { return b.puntaje - a.puntaje; });
    var finales = [];
    for (var j = 0; j < resultado.length && j < 10; j++) finales.push(resultado[j].espacio);
    return finales;
  }

  function esSugerido(espacio) {
    if (!espacio || !sugerenciasVisibles) return false;
    var lista = sugerencias();
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === espacio.id) return true;
    }
    return false;
  }

  var sugerenciasVisibles = false; /* solo destaca con el panel abierto */

  /* ── INTERFAZ ─────────────────────────────────────── */
  function renderizar() {
    var contenedor = util.el('lista-sugerencias');
    if (!contenedor) return;

    var perfil = obtenerPerfil();
    var badge = util.el('perfil-badge');
    if (badge) {
      badge.textContent = perfil && perfil.carrera
        ? t('carr.' + perfil.carrera) + ' · ' + (perfil.semestre ? perfil.semestre + '. ' + t('sug.semestre') : '')
        : t('sug.vacio');
    }

    if (!perfil || !perfil.carrera) {
      contenedor.innerHTML = '<div class="fav-vacio"><div class="fav-vacio-icono">&#128161;</div>' +
        '<p>' + util.escapar(t('sug.vacio')) + '</p>' +
        '<p class="fav-vacio-sub">' + util.escapar(t('sug.actualiza')) + '</p></div>';
      return;
    }

    var lista = sugerencias();
    if (lista.length === 0) {
      contenedor.innerHTML = '<div class="fav-vacio"><div class="fav-vacio-icono">&#128161;</div>' +
        '<p>' + util.escapar(t('sug.vacio2')) + '</p></div>';
      return;
    }

    var html = '';
    for (var i = 0; i < lista.length; i++) {
      var s = lista[i];
      var torre = datos && datos.nombreEdificio ? datos.nombreEdificio(s.edificio) : '';
      var piso = datos && datos.nombrePiso ? datos.nombrePiso(s.piso) : '';
      html += '<div class="fav-item sugerencia-item" data-id="' + util.escapar(s.id) + '" tabindex="0" role="button">' +
        '<div class="fav-item-nombre">&#10024; ' + util.escapar(s.nombre) + '</div>' +
        '<div class="fav-item-fecha">' + util.escapar(torre + ' · ' + piso) + '</div></div>';
    }
    contenedor.innerHTML = html;

    var items = contenedor.querySelectorAll('.sugerencia-item');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', function () {
        irA(this.getAttribute('data-id'));
      });
      items[j].addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); irA(this.getAttribute('data-id')); }
      });
    }
  }

  function irA(idEspacio) {
    if (UniMap.ui) UniMap.ui.irAEspacio(idEspacio);
    var panel = util.el('panel-sugerencias');
    if (panel) panel.classList.add('hidden');
    sugerenciasVisibles = false;
    if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
  }

  function llenarSelectorCarreras() {
    var select = util.el('perfil-carrera');
    if (!select || select.options.length > 1) return;
    for (var i = 0; i < CARRERAS.length; i++) {
      var opcion = document.createElement('option');
      opcion.value = CARRERAS[i];
      opcion.textContent = t('carr.' + CARRERAS[i]);
      select.appendChild(opcion);
    }
  }

  function abrirPerfil() {
    var modal = util.el('modal-perfil');
    if (!modal) return;
    llenarSelectorCarreras();
    var perfil = obtenerPerfil();
    var select = util.el('perfil-carrera');
    var semestre = util.el('perfil-semestre');
    if (select && perfil && perfil.carrera) select.value = perfil.carrera;
    if (semestre && perfil && perfil.semestre) semestre.value = String(perfil.semestre);
    modal.classList.remove('hidden');
  }

  function iniciar() {
    var abrir = util.el('boton-sugerencias');
    var cerrar = util.el('cerrar-sugerencias');
    var btnPerfil = util.el('abrir-perfil');
    var btnGuardar = util.el('guardar-perfil');
    var cerrarPerfil = util.el('cerrar-perfil');

    if (abrir) abrir.addEventListener('click', function () {
      var panel = util.el('panel-sugerencias');
      panel.classList.toggle('hidden');
      ['panel-filtros', 'panel-horarios', 'panel-favoritos', 'panel-avisos', 'panel-servicios'].forEach(function (id) {
        var p = util.el(id);
        if (p) p.classList.add('hidden');
      });
      sugerenciasVisibles = !panel.classList.contains('hidden');
      renderizar();
      if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
    });

    if (cerrar) cerrar.addEventListener('click', function () {
      util.el('panel-sugerencias').classList.add('hidden');
      sugerenciasVisibles = false;
      if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
    });

    if (btnPerfil) btnPerfil.addEventListener('click', abrirPerfil);
    if (cerrarPerfil) cerrarPerfil.addEventListener('click', function () {
      util.el('modal-perfil').classList.add('hidden');
    });

    var cancelarPerfil = util.el('cerrar-perfil-btn');
    if (cancelarPerfil) cancelarPerfil.addEventListener('click', function () {
      util.el('modal-perfil').classList.add('hidden');
    });

    /* El formulario no debe recargar la pagina */
    var formPerfil = util.el('form-perfil');
    if (formPerfil) formPerfil.addEventListener('submit', function (e) { e.preventDefault(); });

    if (btnGuardar) btnGuardar.addEventListener('click', function (e) {
      e.preventDefault();
      var carrera = util.el('perfil-carrera').value;
      var semestre = util.el('perfil-semestre').value;
      if (!carrera) { util.notificar(t('sug.vacio')); return; }
      guardarPerfil(carrera, semestre);
      util.el('modal-perfil').classList.add('hidden');
      util.notificar(t('sug.listo'));
      renderizar();
      if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
    });

    document.addEventListener('idioma:cambiado', function () {
      llenarSelectorCarreras();
      if (util.el('panel-sugerencias') && !util.el('panel-sugerencias').classList.contains('hidden')) renderizar();
    });
  }

  UniMap.sugerencias = {
    iniciar: iniciar,
    renderizar: renderizar,
    sugerencias: sugerencias,
    esSugerido: esSugerido,
    obtenerPerfil: obtenerPerfil
  };
})();
