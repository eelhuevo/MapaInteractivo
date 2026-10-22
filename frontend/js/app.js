/* =========================================================
   app.js — punto de arranque de la pantalla del mapa
   (verifica la sesion y arranca todos los modulos)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;

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
