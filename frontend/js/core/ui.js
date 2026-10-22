/* =========================================================
   core/ui.js — interfaz compartida:
   · arranque de la pantalla del mapa
   · conmutador 2D / 3D
   · navegacion hacia un espacio (busqueda, favoritos, horarios)
   · cierre de notificaciones y modales
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  /* =========================================================
     PANTALLA DEL MAPA
     ========================================================= */
  function inicializarPantalla() {
    var usuario = estado.usuarioActual;
    if (!usuario) return;

    var nombreMostrar = usuario.nombre;
    if (usuario.apellido) nombreMostrar += ' ' + usuario.apellido;
    util.el('nombre-usuario').textContent = nombreMostrar;

    var badge = util.el('badge-rol');
    if (badge) {
      badge.textContent = etiquetaRol(usuario.rol);
      badge.className = 'badge-rol ' + usuario.rol;
    }

    /* El boton de favoritos solo existe para usuarios registrados */
    var botonFavoritos = util.el('boton-favoritos');
    if (botonFavoritos) {
      botonFavoritos.style.display = (usuario.rol === 'invitado') ? 'none' : '';
    }

    /* HU-06: el acceso a administracion es exclusivo del rol admin */
    var botonAdmin = util.el('boton-admin');
    if (botonAdmin) {
      botonAdmin.classList.toggle('hidden', usuario.rol !== 'admin');
    }

    /* Cargar favoritos guardados */
    estado.favoritos = UniMap.favoritos.obtener();

    /* Estado inicial del mapa: Torre Antigua, planta baja
       (aplicando los cambios hechos por el administrador) */
    estado.edificioActual = 1;
    estado.pisoActual = 0;
    estado.espacios = UniMap.personalizacion
      ? UniMap.personalizacion.espaciosDelPiso(1, 0)
      : datos.construirEspacios(1, 0);
    estado.nivelZoom = 1;
    estado.desplazamientoX = 0;
    estado.desplazamientoY = 0;
    estado.espacioSeleccionado = null;
    estado.espacioResaltado = null;
    estado.rutaActiva = null;

    if (UniMap.mapa2D && UniMap.mapa2D.generarBotonesPiso) {
      UniMap.mapa2D.generarBotonesPiso();
    }

    var etiqueta = util.el('etiqueta-piso-actual');
    if (etiqueta) {
      etiqueta.textContent = etiquetaPiso();
    }

    cambiarVista('2d');
  }

  /* Etiqueta i18n de la torre + planta actual (HU-15) */
  function etiquetaPiso() {
    var nombreTorre = datos.nombreEdificio ? datos.nombreEdificio(estado.edificioActual) : '';
    var nombrePlanta = datos.nombrePiso ? datos.nombrePiso(estado.pisoActual) : '';
    return nombreTorre + ' · ' + nombrePlanta;
  }

  /* Nombre del rol en el idioma activo (HU-15) */
  function etiquetaRol(rol) {
    var roles = {
      estudiante: UniMap.i18n.t('auth.rolEstudiante'),
      docente: UniMap.i18n.t('auth.rolDocente'),
      admin: UniMap.i18n.t('rol.admin'),
      invitado: UniMap.i18n.t('rol.invitado')
    };
    return roles[rol] || rol;
  }

  /* Repintar los textos fijos de la barra al cambiar de idioma */
  function refrescarTextos() {
    var usuario = estado.usuarioActual;
    var badge = util.el('badge-rol');
    if (usuario && badge) badge.textContent = etiquetaRol(usuario.rol);

    var etiqueta = util.el('etiqueta-piso-actual');
    if (etiqueta) etiqueta.textContent = etiquetaPiso();

    var boton3d = util.el('nivel-zoom');
    if (boton3d && estado.vista === '3d') boton3d.textContent = UniMap.i18n.t('v3.vista3d');
  }

  /* =========================================================
     CONMUTADOR 2D / 3D
     ========================================================= */
  function cambiarVista(vista) {
    if (vista !== '2d' && vista !== '3d') return;
    estado.vista = vista;

    var boton2D = util.el('boton-vista-2d');
    var boton3D = util.el('boton-vista-3d');
    if (boton2D) boton2D.classList.toggle('active', vista === '2d');
    if (boton3D) boton3D.classList.toggle('active', vista === '3d');

    document.body.classList.toggle('vista-3d', vista === '3d');

    var lienzo = util.el('lienzo-mapa');
    if (lienzo) lienzo.classList.toggle('hidden', vista === '3d');

    if (vista === '3d') {
      UniMap.tooltip.ocultar();
      if (UniMap.vista3D) UniMap.vista3D.activar();
      var nivel = util.el('nivel-zoom');
      if (nivel) nivel.textContent = UniMap.i18n.t('v3.vista3d');
    } else {
      if (UniMap.vista3D) UniMap.vista3D.desactivar();
      if (UniMap.mapa2D) {
        UniMap.mapa2D.redimensionarLienzo();
        UniMap.mapa2D.dibujar();
      }
    }
  }

  function conectarVista() {
    var boton2D = util.el('boton-vista-2d');
    var boton3D = util.el('boton-vista-3d');

    if (boton2D) boton2D.addEventListener('click', function () { cambiarVista('2d'); });
    if (boton3D) boton3D.addEventListener('click', function () { cambiarVista('3d'); });
  }

  /* =========================================================
     NAVEGACION HACIA UN ESPACIO
     ========================================================= */
  function irAEspacio(idEspacio) {
    var espacio = null;
    for (var i = 0; i < estado.todosLosEspacios.length; i++) {
      if (estado.todosLosEspacios[i].id === idEspacio) {
        espacio = estado.todosLosEspacios[i];
        break;
      }
    }
    if (!espacio) return;

    /* El espacio esta en un piso o torre que los filtros tienen oculto */
    if (UniMap.filtros && !UniMap.filtros.pisoPermitido(espacio.piso)) {
      util.notificar(UniMap.i18n.t('filtros.pisoOculto'));
      return;
    }
    if (UniMap.filtros && !UniMap.filtros.edificioPermitido(espacio.edificio)) {
      util.notificar(UniMap.i18n.t('filtros.torreOculta'));
      return;
    }

    /* HU-14: registrar la consulta del espacio */
    if (UniMap.estadisticas) UniMap.estadisticas.registrar(espacio.id);

    /* Cambiar de torre y piso si hace falta */
    if ((espacio.edificio !== estado.edificioActual || espacio.piso !== estado.pisoActual) && UniMap.mapa2D) {
      if (espacio.edificio !== estado.edificioActual) {
        UniMap.mapa2D.cambiarEdificio(espacio.edificio, espacio.piso);
      } else {
        UniMap.mapa2D.cambiarPiso(espacio.piso);
      }
    }

    estado.espacioSeleccionado = espacio;

    if (estado.vista === '3d') {
      if (UniMap.vista3D) UniMap.vista3D.enfocarEspacio(espacio);
    } else if (UniMap.mapa2D) {
      UniMap.mapa2D.centrarEn(espacio);

      /* Mostrar la ficha junto al espacio centrado */
      var contenedor = util.el('contenedor-mapa');
      if (contenedor) {
        var rect = contenedor.getBoundingClientRect();
        var desplazamientoX = (espacio.ancho / 2) * estado.nivelZoom + 28;
        var desplazamientoY = (espacio.alto / 2) * estado.nivelZoom;
        UniMap.tooltip.mostrar(
          espacio,
          rect.left + rect.width / 2 + desplazamientoX,
          rect.top + rect.height / 2 + desplazamientoY
        );
      }
    }

    var panel = util.el('panel-favoritos');
    if (panel) panel.classList.add('hidden');
  }

  /* =========================================================
     NOTIFICACIONES Y MODALES
     ========================================================= */
  function conectarNotificacion() {
    var cerrar = util.el('cerrar-notificacion');
    if (cerrar) {
      cerrar.addEventListener('click', function () {
        util.el('notificacion').classList.add('hidden');
      });
    }
  }

  function conectarModales() {
    var botones = document.querySelectorAll('.cerrar-modal');
    for (var i = 0; i < botones.length; i++) {
      botones[i].addEventListener('click', function () {
        this.closest('.modal').classList.add('hidden');
      });
    }
  }

  /* =========================================================
     TECLADO
     ========================================================= */
  function ocultarSiVisible(id) {
    var elemento = util.el(id);
    if (!elemento) return false;
    if (elemento.classList.contains('hidden')) return false;
    elemento.classList.add('hidden');
    return true;
  }

  function conectarTeclado() {
    document.addEventListener('keydown', function (e) {
      var esEscape = e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27;
      if (!esEscape) return;

      var cerrado = false;

      /* Listas y paneles, en orden de mas especifico a menos */
      cerrado = ocultarSiVisible('lista-modelos') || cerrado;
      cerrado = ocultarSiVisible('resultados-busqueda') || cerrado;
      cerrado = ocultarSiVisible('panel-filtros') || cerrado;
      cerrado = ocultarSiVisible('panel-horarios') || cerrado;
      cerrado = ocultarSiVisible('panel-favoritos') || cerrado;
      cerrado = ocultarSiVisible('panel-servicios') || cerrado;
      cerrado = ocultarSiVisible('panel-avisos') || cerrado;
      cerrado = ocultarSiVisible('panel-sugerencias') || cerrado;

      /* Modales nuevos: el escaner de QR detiene la camara */
      var modalEscanear = util.el('modal-escanear');
      if (modalEscanear && !modalEscanear.classList.contains('hidden')) {
        if (UniMap.qr) UniMap.qr.cerrarEscanear();
        cerrado = true;
      }
      cerrado = ocultarSiVisible('modal-qr') || cerrado;
      cerrado = ocultarSiVisible('modal-perfil') || cerrado;

      /* Si no habia paneles abiertos, se cierra la ficha */
      if (!cerrado) UniMap.tooltip.ocultar();
    });
  }

  /* =========================================================
     ARRANQUE
     ========================================================= */
  function iniciar() {
    conectarVista();
    conectarNotificacion();
    conectarModales();
    conectarTeclado();
    inicializarPantalla();

    /* HU-15: repintar los textos fijos al cambiar de idioma */
    document.addEventListener('idioma:cambiado', refrescarTextos);
  }

  UniMap.ui = {
    iniciar: iniciar,
    inicializarPantalla: inicializarPantalla,
    cambiarVista: cambiarVista,
    irAEspacio: irAEspacio,
    etiquetaPiso: etiquetaPiso
  };
})();
