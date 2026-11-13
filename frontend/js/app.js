/* =========================================================
   app.js — punto de arranque de la pantalla del mapa
   (verifica la sesion y arranca todos los modulos)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;

  /* ── CARGA DEL BACKEND (fuente de verdad del plano) ──
     Mientras el backend no responde se muestra un aviso de conexion y
     se sigue intentando en segundo plano: si INICIAR-BACKEND.bat tarda
     (o el backend se reinicia), los datos aparecen solos en cuanto
     conteste, sin recargar la pagina a mano. */
  var intentosBackend = 0;
  var MAX_INTENTOS_BACKEND = 30;      /* ~5 min con el reintentos de 10 s */
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
      /* Backend todavia sin responder: avisar y volver a intentarlo */
      var fallo = UniMap.util.avisoPersistente(UniMap.i18n.t('mapa.sinBackend'), 'aviso-backend');
      if (fallo) fallo.style.background = '#b45309';
      intentosBackend++;
      if (intentosBackend < MAX_INTENTOS_BACKEND) {
        setTimeout(function () { cargarEspaciosDelBackend(false); }, REINTENTO_BACKEND_MS);
      }
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

    /* 2. Idioma de la interfaz (HU-15) */
    UniMap.i18n.iniciar();

    /* 3. Espacios personalizados por el administrador (HU-06) */
    if (UniMap.personalizacion) UniMap.personalizacion.reconstruir();

    /* 4. Interfaz y pantalla */
    UniMap.ui.iniciar();

    /* 5. Modulos del mapa 2D */
    UniMap.filtros.iniciar();
    UniMap.busqueda.iniciar();
    UniMap.horarios.iniciar();
    UniMap.favoritos.iniciar();

    /* 6. Modulos nuevos (HU-07, HU-10, HU-11, HU-13, HU-20) */
    if (UniMap.ruta) UniMap.ruta.iniciar();
    if (UniMap.qr) UniMap.qr.iniciar();
    if (UniMap.servicios) UniMap.servicios.iniciar();
    if (UniMap.sugerencias) UniMap.sugerencias.iniciar();
    if (UniMap.avisos) UniMap.avisos.iniciar();

    /* 7. Visor 3D (solo registra eventos; la escena es perezosa) */
    if (UniMap.vista3D) UniMap.vista3D.iniciar();

    /* 8. Lienzo 2D: redimensiona, arranca el bucle de dibujo
          y conecta zoom + selector de piso */
    UniMap.mapa2D.iniciar();

    /* 9. Pintado inicial */
    UniMap.mapa2D.dibujar();
    if (UniMap.vista3D) UniMap.vista3D.actualizarMarcadores();

    /* 9b. Backend como fuente de verdad: se piden los espacios del
         backend (estan en Supabase y los ven todas las maquinas).
         Si el backend esta apagado el plano queda vacio y se avisa
         (con reintentos): no hay datos inventados en el navegador. */
    if (UniMap.api && UniMap.api.activa()) {
      cargarEspaciosDelBackend(true);
    } else {
      /* Backend desactivado en la configuracion: tampoco hay datos */
      UniMap.util.avisoPersistente(UniMap.i18n.t('mapa.sinBackend'), 'aviso-backend');
    }

    /* 10. Enlace profundo de los codigos QR (HU-11):
          mapa.html?espacio=ID abre la ficha del espacio */
    if (UniMap.qr) UniMap.qr.procesarEnlace();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarAplicacion);
  } else {
    iniciarAplicacion();
  }
})();
