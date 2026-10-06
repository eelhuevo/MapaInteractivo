/* =========================================================
   store.js — espacio de nombres global, estado compartido,
   almacenamiento y utilidades generales
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap = window.UniMap || {};

  /* ── LLAVES DE ALMACENAMIENTO ─────────────────────── */
  UniMap.CLAVES = {
    usuarios: 'unimap_usuarios',
    favoritos: 'unimap_favoritos',
    sesion: 'unimap_sesion'
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

  /* ── NOTA: en index.html no existe el div de notificacion,
         por eso util.notificar hace guardas. ─────────── */
})();
