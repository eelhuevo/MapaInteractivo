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
     Si el servidor Laravel esta disponible (INICIAR-BACKEND.bat,
     puerto 8000) se activa la sincronizacion de avisos,
     estadisticas y de los cambios hechos en el panel de
     administracion. Si el backend esta apagado todo sigue
     funcionando con localStorage y los cambios quedan en
     cola para reintentarlos. */
  UniMap.config = {
    activa: true,
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
      /* HU-19: subtipos de laboratorio visibles (catalogo del backend) */
      laboratorios: ['quimica', 'redes', 'fisica', 'sistemas'],
      disponibilidad: ['activo', 'inactivo'],
      pisos: [0, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17],
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

    /* Aviso persistente creado por codigo (sin depender del HTML):
       se usa para avisar que el backend esta apagado. Se muestra
       arriba del todo y solo se quita con quitarAvisoPersistente. */
    avisoPersistente: function (texto, id) {
      var contenedor = util.el(id || 'aviso-persistente');
      if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = id || 'aviso-persistente';
        contenedor.setAttribute('role', 'status');
        contenedor.style.position = 'fixed';
        contenedor.style.top = '0';
        contenedor.style.left = '0';
        contenedor.style.right = '0';
        contenedor.style.zIndex = '9999';
        contenedor.style.padding = '10px 16px';
        contenedor.style.textAlign = 'center';
        contenedor.style.font = '600 14px/1.4 system-ui, sans-serif';
        contenedor.style.background = '#b45309';
        contenedor.style.color = '#fff';
        document.body.appendChild(contenedor);
      }
      contenedor.textContent = texto;
      contenedor.style.display = 'block';
      return contenedor;
    },

    quitarAvisoPersistente: function (id) {
      var contenedor = util.el(id || 'aviso-persistente');
      if (contenedor) contenedor.style.display = 'none';
    },

    /* Texto en minusculas y sin tildes, para que "maria" encuentre
       a "Maria Elena" en los buscadores (busqueda y horarios) */
    normalizar: function (texto) {
      var bruto = texto === null || texto === undefined ? '' : String(texto);
      return bruto.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
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
