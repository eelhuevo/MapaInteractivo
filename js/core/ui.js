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

    var roles = { estudiante: 'Estudiante', docente: 'Docente', admin: 'Administrador', invitado: 'Invitado' };
    var badge = util.el('badge-rol');
    if (badge) {
      badge.textContent = roles[usuario.rol] || usuario.rol;
      badge.className = 'badge-rol ' + usuario.rol;
    }

    /* El boton de favoritos solo existe para usuarios registrados */
    var botonFavoritos = util.el('boton-favoritos');
    if (botonFavoritos) {
      botonFavoritos.style.display = (usuario.rol === 'invitado') ? 'none' : '';
    }

    /* Cargar favoritos guardados */
    estado.favoritos = UniMap.favoritos.obtener();

    /* Estado inicial del mapa: se respetan el piso y la vista que
       quedaron guardados de la ultima visita (preferencias) */
    var piso = estado.pisoActual;
    var vista = estado.vista;

    estado.espacios = datos.construirEspacios(piso);
    estado.nivelZoom = 1;
    estado.desplazamientoX = 0;
    estado.desplazamientoY = 0;
    estado.espacioSeleccionado = null;
    estado.espacioResaltado = null;

    var etiqueta = util.el('etiqueta-piso-actual');
    if (etiqueta) etiqueta.textContent = ['Planta Baja', 'Piso 1', 'Piso 2', 'Piso 3'][piso];

    cambiarVista(vista === '3d' ? '3d' : '2d');
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
      if (nivel) nivel.textContent = 'Vista 3D';
    } else {
      if (UniMap.vista3D) UniMap.vista3D.desactivar();
      if (UniMap.mapa2D) {
        UniMap.mapa2D.redimensionarLienzo();
        UniMap.mapa2D.dibujar();
      }
    }

    /* La vista elegida se recuerda para la proxima visita */
    if (estado.guardarPreferencias) estado.guardarPreferencias();
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

    /* El espacio esta en un piso que los filtros tienen oculto */
    if (UniMap.filtros && !UniMap.filtros.pisoPermitido(espacio.piso)) {
      util.notificar('Ese espacio esta en un piso oculto por los filtros');
      return;
    }

    /* Cambiar de piso si hace falta */
    if (espacio.piso !== estado.pisoActual && UniMap.mapa2D) {
      UniMap.mapa2D.cambiarPiso(espacio.piso);
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
  }

  UniMap.ui = {
    iniciar: iniciar,
    inicializarPantalla: inicializarPantalla,
    cambiarVista: cambiarVista,
    irAEspacio: irAEspacio
  };
})();
