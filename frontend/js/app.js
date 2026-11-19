/* =========================================================
   app.js — punto de arranque de la pantalla del mapa
   (verifica la sesion y arranca todos los modulos)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;

  /* ── CARGA DEL BACKEND (fuente de verdad del plano) ── */
  var intentosBackend = 0;
  var MAX_INTENTOS_BACKEND = 30;
  var REINTENTO_BACKEND_MS = 10000;

  function pintarDatosBackend() {
    UniMap.personalizacion.reconstruir();
    UniMap.mapa2D.dibujar();
    if (UniMap.vista3D) UniMap.vista3D.actualizarMarcadores();
  }

  function cargarEspaciosDelBackend(primerIntento) {
    if (primerIntento) {
      var aviso = UniMap.util.avisoPersistente(UniMap.i18n.t('mapa.conectando'), 'aviso-backend');
      if (aviso) aviso.style.background = '#1d4ed8';
    }

    UniMap.api.cargarEspaciosRemotos().then(function (ok) {
      if (ok) {
        intentosBackend = 0;
        UniMap.util.quitarAvisoPersistente('aviso-backend');
        pintarDatosBackend();
        return;
      }
      var fallo = UniMap.util.avisoPersistente(UniMap.i18n.t('mapa.sinBackend'), 'aviso-backend');
      if (fallo) fallo.style.background = '#b45309';
      intentosBackend++;
      if (intentosBackend < MAX_INTENTOS_BACKEND) {
        setTimeout(function () { cargarEspaciosDelBackend(false); }, REINTENTO_BACKEND_MS);
      }
    });
  }

  /* ── Modo invitado: menos ruido visual en la barra ── */
  function marcarModoInvitado() {
    var sesion = UniMap.estado.usuarioActual
      || (UniMap.auth && UniMap.auth.sesionGuardada ? UniMap.auth.sesionGuardada() : null);
    var esInvitado = !sesion
      || sesion.rol === 'invitado'
      || sesion.rol === 'guest'
      || sesion.rol === 'Invitado';

    document.body.classList.toggle('modo-invitado', !!esInvitado);

  }

  /* ── Menú “Más” (móvil): reutiliza los botones reales ── */
  function iniciarMenuMas() {
    var btn = document.getElementById('boton-mas');
    var panel = document.getElementById('menu-mas-panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var abierto = panel.classList.toggle('abierto');
      btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });

    document.addEventListener('click', function () {
      panel.classList.remove('abierto');
      btn.setAttribute('aria-expanded', 'false');
    });

    panel.addEventListener('click', function (e) {
      e.stopPropagation();
      var item = e.target.closest('[data-accion]');
      if (!item) return;
      var accion = item.getAttribute('data-accion');
      var mapa = {
        filtros: 'boton-filtros',
        horarios: 'boton-horarios',
        servicios: 'boton-servicios',
        ruta: 'boton-ruta',
        ubicacion: 'boton-ubicacion',
        qr: 'boton-escanear-qr',
        sugerencias: 'boton-sugerencias',
        avisos: 'boton-avisos',
        favoritos: 'boton-favoritos',
        editar: 'boton-editar-posiciones',
        admin: 'boton-admin'
      };
      var id = mapa[accion];
      var target = id ? document.getElementById(id) : null;
      /* Quitar display:none temporal del CSS móvil para poder hacer click */
      if (target) {
        var prev = target.style.display;
        target.style.display = 'inline-flex';
        target.click();
        target.style.display = prev;
      }
      panel.classList.remove('abierto');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  function iniciarAplicacion() {
    /* 1. Sesion obligatoria para ver el mapa */
    var sesion = UniMap.auth.sesionGuardada();
    if (!sesion) {
      window.location.replace('../index.html');
      return;
    }
    UniMap.estado.usuarioActual = sesion;

    /* 1b. Clase CSS para invitado (barra más limpia) */
    marcarModoInvitado();
    /* 2. Idioma de la interfaz (HU-15) */
    UniMap.i18n.iniciar();

    /* 3. Espacios personalizados por el administrador (HU-06) */
    if (UniMap.personalizacion) UniMap.personalizacion.reconstruir();

    /* 4. Interfaz y pantalla */
    UniMap.ui.iniciar();
    iniciarUserMenu();
    iniciarBottomNav();
    iniciarBusquedaMovil();
    iniciarBannerEdicion();

    /* 5. Modulos del mapa 2D */
    UniMap.filtros.iniciar();
    UniMap.busqueda.iniciar();
    UniMap.horarios.iniciar();
    UniMap.favoritos.iniciar();

    /* 6. Modulos nuevos */
    if (UniMap.ruta) UniMap.ruta.iniciar();
    if (UniMap.ar) UniMap.ar.iniciar();
    if (UniMap.qr) UniMap.qr.iniciar();
    if (UniMap.servicios) UniMap.servicios.iniciar();
    if (UniMap.sugerencias) UniMap.sugerencias.iniciar();
    if (UniMap.avisos) UniMap.avisos.iniciar();

    /* 7. Visor 3D */
    if (UniMap.vista3D) UniMap.vista3D.iniciar();

    /* 8. Lienzo 2D */
    UniMap.mapa2D.iniciar();

    /* 9. Pintado inicial */
    UniMap.mapa2D.dibujar();
    if (UniMap.vista3D) UniMap.vista3D.actualizarMarcadores();

    /* 9b. Backend */
    if (UniMap.api && UniMap.api.activa()) {
      cargarEspaciosDelBackend(true);
    } else {
      UniMap.util.avisoPersistente(UniMap.i18n.t('mapa.sinBackend'), 'aviso-backend');
    }

    /* 10. QR deep link */
    if (UniMap.qr) UniMap.qr.procesarEnlace();

    /* 11. Menú overflow móvil */
    iniciarMenuMas();
  }
  function iniciarUserMenu() {
    var trigger = document.getElementById('user-menu-trigger');
    var panel = document.getElementById('user-menu-panel');
    if (!trigger || !panel) return;

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.classList.toggle('abierto');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function () {
      panel.classList.remove('abierto');
      trigger.setAttribute('aria-expanded', 'false');
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });

    panel.addEventListener('click', function (e) {
      var item = e.target.closest('[data-user-accion]');
      if (!item) return;
      var a = item.getAttribute('data-user-accion');
      if (a === 'tema') {
        var btn = document.getElementById('boton-tema');
        if (btn) btn.click();
      } else if (a === 'idioma') {
        var idi = document.querySelector('.boton-idioma');
        if (idi) idi.click();
        var lab = document.getElementById('idioma-menu-label');
        var cur = document.getElementById('idioma-actual');
        if (lab && cur) lab.textContent = cur.textContent;
      } else if (a === 'favoritos') {
        var f = document.getElementById('boton-favoritos');
        if (f) { f.style.display = 'inline-flex'; f.click(); f.style.display = 'none'; }
      } else if (a === 'editar') {
        var ed = document.getElementById('boton-editar-posiciones');
        if (ed) ed.click();
      }
      /* admin es <a href> */
      panel.classList.remove('abierto');
    });
  }

  function iniciarBottomNav() {
    var nav = document.getElementById('bottom-nav');
    if (!nav) return;

    function setActive(name) {
      nav.querySelectorAll('.bn-item').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-bn') === name);
      });
    }

    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-bn]');
      if (!btn) return;
      var bn = btn.getAttribute('data-bn');
      setActive(bn);

      if (bn === 'explorar') {
        var f = document.getElementById('boton-filtros');
        if (f) f.click();
      } else if (bn === 'rutas') {
        var r = document.getElementById('boton-ruta');
        if (r) r.click();
      } else if (bn === 'agente') {
        /* Usar la API del asistente (mantiene estado interno correcto) */
        if (UniMap.asistente && typeof UniMap.asistente.alternar === 'function') {
          UniMap.asistente.alternar();
        } else {
          /* Fallback si aún no se exportó alternar */
          var botonNativo = document.querySelector('.uni-chat .uni-boton');
          if (botonNativo) botonNativo.click();
        }
      } else if (bn === 'servicios') {
        var s = document.getElementById('boton-servicios');
        if (s) s.click();
      } else if (bn === 'mas') {
        var sheet = document.getElementById('sheet-mas');
        if (sheet) sheet.classList.remove('hidden');
      }
    });

    var sheet = document.getElementById('sheet-mas');
    var backdrop = document.getElementById('sheet-mas-backdrop');
    if (backdrop) backdrop.addEventListener('click', function () {
      sheet.classList.add('hidden');
    });
    if (sheet) {
      sheet.addEventListener('click', function (e) {
        var item = e.target.closest('[data-sheet]');
        if (!item) return;
        var k = item.getAttribute('data-sheet');
        var map = {
          horarios: 'boton-horarios',
          sugerencias: 'boton-sugerencias',
          avisos: 'boton-avisos',
          favoritos: 'boton-favoritos',
          tema: 'boton-tema',
          idioma: null,
          editar: 'boton-editar-posiciones'
        };
        if (k === 'idioma') {
          var idi = document.querySelector('.boton-idioma');
          if (idi) idi.click();
        } else if (map[k]) {
          var el = document.getElementById(map[k]);
          if (el) {
            var prev = el.style.display;
            el.style.display = 'inline-flex';
            el.click();
            el.style.display = prev || 'none';
          }
        }
        sheet.classList.add('hidden');
      });
    }
    var sheetSalir = document.getElementById('sheet-salir');
    if (sheetSalir) {
      sheetSalir.addEventListener('click', function () {
        var salir = document.getElementById('boton-salir');
        if (salir) salir.click();
      });
    }
  }

  function iniciarBannerEdicion() {
    var banner = document.getElementById('banner-edicion');
    var btnGuardarBanner = document.getElementById('banner-edicion-guardar');
    if (!banner) return;

    /* Observa el botón editar para mostrar/ocultar banner */
    var ed = document.getElementById('boton-editar-posiciones');
    if (ed) {
      var obs = new MutationObserver(function () {
        var activo = ed.classList.contains('activo');
        banner.classList.toggle('hidden', !activo);
      });
      obs.observe(ed, { attributes: true, attributeFilter: ['class'] });
    }
    if (btnGuardarBanner) {
      btnGuardarBanner.addEventListener('click', function () {
        var g = document.getElementById('boton-guardar-posiciones');
        if (g) g.click();
        banner.classList.add('hidden');
      });
    }
  }
    /* ── Buscador móvil: lupa abre panel ── */
  function iniciarBusquedaMovil() {
    var lupa = document.getElementById('boton-lupa-movil');
    var isla = document.getElementById('island-left');
    var campo = document.getElementById('campo-busqueda');
    if (!lupa || !isla) return;

    lupa.addEventListener('click', function (e) {
      e.stopPropagation();
      var abierto = isla.classList.toggle('busqueda-abierta');
      lupa.classList.toggle('activo', abierto);
      if (abierto && campo) {
        setTimeout(function () { campo.focus(); }, 50);
      }
    });

    document.addEventListener('click', function (e) {
      if (!isla.contains(e.target)) {
        isla.classList.remove('busqueda-abierta');
        lupa.classList.remove('activo');
      }
    });

    /* Cerrar con Escape */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        isla.classList.remove('busqueda-abierta');
        lupa.classList.remove('activo');
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarAplicacion);
  } else {
    iniciarAplicacion();
  }
})();