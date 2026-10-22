/* =========================================================
   store.js — espacio de nombres global, estado compartido,
   almacenamiento y utilidades generales
   =========================================================
   Tarea #38 · Estado global y persistencia en localStorage
   Autor: eelhuevo
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap = window.UniMap || {};

  /* ── LLAVES DE ALMACENAMIENTO ─────────────────────── */
  UniMap.CLAVES = {
    usuarios: 'unimap_usuarios',
    favoritos: 'unimap_favoritos',
    sesion: 'unimap_sesion',
    preferencias: 'unimap_preferencias'
  };

  /* ── ESTADO DE LA APLICACION ──────────────────────── */
  UniMap.estado = {
    usuarioActual: null,
    pisoActual: 0,
    espacios: [],
    todosLosEspacios: [],

    nivelZoom: 1,
    desplazamientoX: 0,
    desplazamientoY: 0,
    estaArrastrando: false,
    inicioArrastre: { x: 0, y: 0 },

    espacioSeleccionado: null,
    espacioResaltado: null,
    favoritos: [],

    vista: '2d', // '2d' | '3d'

    filtros: {
      tipos: ['aula', 'laboratorio', 'oficina', 'biblioteca', 'auditorio', 'comedor', 'deportivo', 'salon'],
      disponibilidad: ['activo', 'inactivo'],
      pisos: [0, 1, 2, 3]
    }
  };

  /* Atajo local al estado global, para no escribir
     UniMap.estado en cada linea */
  var estado = UniMap.estado;

  /* ── CONTENEDOR DE DATOS ──────────────────────────── */
  UniMap.datos = UniMap.datos || {};

  /* ── UTILIDADES ───────────────────────────────────── */
  var util = UniMap.util = {

    el: function (id) {
      return document.getElementById(id);
    },

    todos: function (selector, contexto) {
      return (contexto || document).querySelectorAll(selector);
    },

    validarCorreo: function (correo) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    },

    /* Retrasa la ejecucion de una funcion hasta que pasan los
       milisegundos indicados sin recibir otra llamada. */
    debounce: function (fn, espera) {
      var temporizador = null;
      return function () {
        var contexto = this;
        var argumentos = arguments;
        clearTimeout(temporizador);
        temporizador = setTimeout(function () {
          fn.apply(contexto, argumentos);
        }, espera || 200);
      };
    },

    escapar: function (texto) {
      if (texto === null || texto === undefined) return '';
      return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /* Notificacion flotante (requiere #notificacion en la pagina) */
    notificar: function (mensaje, duracion) {
      var contenedor = util.el('notificacion');
      var texto = util.el('mensaje-notificacion');
      if (!contenedor || !texto) return;
      if (duracion === undefined) duracion = 3000;

      texto.textContent = mensaje;
      contenedor.classList.remove('hidden');
      clearTimeout(contenedor._timer);
      contenedor._timer = setTimeout(function () {
        contenedor.classList.add('hidden');
      }, duracion);
    },

    /* Acceso seguro a localStorage */
    almacen: {
      leer: function (llave, defecto) {
        try {
          var bruto = localStorage.getItem(llave);
          if (bruto === null) return defecto;
          return JSON.parse(bruto);
        } catch (e) {
          return defecto;
        }
      },
      escribir: function (llave, valor) {
        try { localStorage.setItem(llave, JSON.stringify(valor)); } catch (e) { /* sin espacio */ }
      },
      quitar: function (llave) {
        try { localStorage.removeItem(llave); } catch (e) { /* ignorar */ }
      }
    }
  };

  /* ── PERSISTENCIA DE LAS PREFERENCIAS ────────────────
     Se guardan el piso, la vista y los filtros activos para
     que el campus se abra como quedo la ultima vez.       */
  function guardarPreferencias() {
    util.almacen.escribir(UniMap.CLAVES.preferencias, {
      pisoActual: estado.pisoActual,
      vista: estado.vista,
      tipos: estado.filtros.tipos,
      disponibilidad: estado.filtros.disponibilidad
    });
  }

  function restaurarPreferencias() {
    var pref = util.almacen.leer(UniMap.CLAVES.preferencias, null);
    if (!pref) return false;

    if (typeof pref.pisoActual === 'number' && pref.pisoActual >= 0 && pref.pisoActual <= 3) {
      estado.pisoActual = pref.pisoActual;
    }
    if (pref.vista === '2d' || pref.vista === '3d') {
      estado.vista = pref.vista;
    }
    if (pref.tipos && pref.tipos.length) estado.filtros.tipos = pref.tipos;
    if (pref.disponibilidad && pref.disponibilidad.length) estado.filtros.disponibilidad = pref.disponibilidad;

    return true;
  }

  /* Se exponen en el estado para que los demas modulos las usen */
  estado.guardarPreferencias = guardarPreferencias;
  estado.restaurarPreferencias = restaurarPreferencias;

  restaurarPreferencias();

  /* ── NOTA: en index.html no existe el div de notificacion,
         por eso util.notificar hace guardas. ─────────── */
})();
