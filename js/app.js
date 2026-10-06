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
      window.location.replace('index.html');
      return;
    }
    UniMap.estado.usuarioActual = sesion;

    /* 2. Interfaz y pantalla */
    UniMap.ui.iniciar();

    /* 3. Modulos del mapa 2D */
    UniMap.filtros.iniciar();
    UniMap.busqueda.iniciar();
    UniMap.horarios.iniciar();
    UniMap.favoritos.iniciar();

    /* 4. Visor 3D (solo registra eventos; la escena es perezosa) */
    if (UniMap.vista3D) UniMap.vista3D.iniciar();

    /* 5. Lienzo 2D: redimensiona, arranca el bucle de dibujo
          y conecta zoom + selector de piso */
    UniMap.mapa2D.iniciar();

    /* 6. Pintado inicial */
    UniMap.mapa2D.dibujar();
    if (UniMap.vista3D) UniMap.vista3D.actualizarMarcadores();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarAplicacion);
  } else {
    iniciarAplicacion();
  }
})();
