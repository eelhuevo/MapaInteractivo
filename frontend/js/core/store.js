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
    sesion: 'unimap_sesion',
    avisos: 'unimap_avisos',
    estadisticas: 'unimap_estadisticas',
    personalizacion: 'unimap_espacios_personalizados',
    perfil: 'unimap_perfil',
    idioma: 'unimap_idioma'
  };

  /* ── CONFIGURACION DEL BACKEND (opcional) ───────────
     Si el servidor Laravel esta disponible, activa la
     sincronizacion de avisos, estadisticas y espacios.
     Con el servidor local (INICIAR.bat) queda inactiva y
     todo funciona con localStorage. */
  UniMap.config = {
    activa: false,
    apiBase: 'http://localhost:8000/api'
  };

  /* ── ESTADO DE LA APLICACION ──────────────────────── */
  UniMap.estado = {
    usuarioActual: null,
    edificioActual: 1,   // 1 = Torre Antigua, 2 = Torre Innovacion
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

    /* HU-10: ubicacion del usuario y ruta peatonal activa */
    ubicacionUsuario: null,
    rutaActiva: null,

    vista: '2d', // '2d' | '3d'

    filtros: {
      tipos: ['aula', 'laboratorio', 'oficina', 'biblioteca', 'auditorio', 'comedor', 'deportivo', 'salon'],
      /* HU-19: subtipos de laboratorio visibles */
      laboratorios: ['informatica', 'electronica', 'fisica', 'quimica', 'mecanica',
        'ia', 'robotica', 'iot', 'ciberseguridad', 'produccion'],
      disponibilidad: ['activo', 'inactivo'],
      pisos: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      edificios: [1, 2]
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
