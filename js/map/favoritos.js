/* =========================================================
   map/favoritos.js — almacenamiento y panel de favoritos
   (no disponible para invitados)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var estado = UniMap.estado;

  var llaveFavoritos = UniMap.CLAVES.favoritos;

  /* ── LECTURA / ESCRITURA ──────────────────────────── */
  function obtener() {
    if (!estado.usuarioActual || estado.usuarioActual.rol === 'invitado') return [];
    return util.almacen.leer(llaveFavoritos + '_' + estado.usuarioActual.id, []);
  }

  function guardar(lista) {
    if (!estado.usuarioActual || estado.usuarioActual.rol === 'invitado') return;
    util.almacen.escribir(llaveFavoritos + '_' + estado.usuarioActual.id, lista);
  }

  function esFavorito(idEspacio) {
    for (var f = 0; f < estado.favoritos.length; f++) {
      if (estado.favoritos[f].espacioId === idEspacio) return true;
    }
    return false;
  }

  /* ── ALTERNAR FAVORITO ────────────────────────────── */
  function alternar(espacio) {
    if (!estado.usuarioActual || estado.usuarioActual.rol === 'invitado') {
      util.notificar('Inicia sesion para usar favoritos');
      return;
    }

    var indice = -1;
    for (var f = 0; f < estado.favoritos.length; f++) {
      if (estado.favoritos[f].espacioId === espacio.id) { indice = f; break; }
    }

    if (indice >= 0) {
      estado.favoritos.splice(indice, 1);
      util.notificar('Eliminado de favoritos');
    } else {
      estado.favoritos.push({
        id: 'fav' + Date.now(),
        espacioId: espacio.id,
        espacioNombre: espacio.nombre,
        fechaAgregado: new Date().toISOString()
      });
      util.notificar('Agregado a favoritos');
    }

    guardar(estado.favoritos);
    refrescarVistas();

    /* Si la ficha sigue abierta sobre este espacio, refrescarla */
    var contenedor = util.el('contenedor-mapa');
    var tooltip = util.el('tooltip-mapa');
    if (contenedor && tooltip && !tooltip.classList.contains('hidden') &&
        estado.espacioSeleccionado && estado.espacioSeleccionado.id === espacio.id) {
      var rect = contenedor.getBoundingClientRect();
      var x = rect.left + (parseFloat(tooltip.style.left) || 0) + 20;
      var y = rect.top + (parseFloat(tooltip.style.top) || 0) + 20;
      UniMap.tooltip.mostrar(espacio, x, y);
    }
  }

  function refrescarVistas() {
    if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
    if (UniMap.vista3D) UniMap.vista3D.actualizarMarcadores();
  }

  /* ── PANEL ────────────────────────────────────────── */
  function renderizar() {
    var lista = util.el('lista-favoritos');
    if (!lista) return;

    if (estado.favoritos.length === 0) {
      lista.innerHTML = '<div class="fav-vacio"><div class="fav-vacio-icono">\u2606</div>' +
        '<p>No tienes favoritos aun</p>' +
        '<p class="fav-vacio-sub">Haz clic en un espacio y guarda tu favorito</p></div>';
      return;
    }

    var html = '';
    for (var f = 0; f < estado.favoritos.length; f++) {
      var fav = estado.favoritos[f];
      html += '<div class="fav-item" data-id="' + util.escapar(fav.espacioId) + '">' +
        '<div class="fav-item-nombre">' + util.escapar(fav.espacioNombre) + '</div>' +
        '<div class="fav-item-fecha">Agregado: ' + new Date(fav.fechaAgregado).toLocaleDateString() + '</div>' +
        '<button class="fav-item-eliminar" data-fav-id="' + util.escapar(fav.id) + '">&times;</button>' +
        '</div>';
    }
    lista.innerHTML = html;

    var items = lista.querySelectorAll('.fav-item');
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener('click', function (e) {
        if (e.target.classList.contains('fav-item-eliminar')) return;
        var idEspacio = this.getAttribute('data-id');
        if (UniMap.ui) UniMap.ui.irAEspacio(idEspacio);
      });
    }

    var botonesEliminar = lista.querySelectorAll('.fav-item-eliminar');
    for (var b = 0; b < botonesEliminar.length; b++) {
      botonesEliminar[b].addEventListener('click', function (e) {
        e.stopPropagation();
        var idFav = this.getAttribute('data-fav-id');
        for (var f2 = 0; f2 < estado.favoritos.length; f2++) {
          if (estado.favoritos[f2].id === idFav) {
            estado.favoritos.splice(f2, 1);
            break;
          }
        }
        guardar(estado.favoritos);
        renderizar();
        refrescarVistas();
        util.notificar('Favorito eliminado');
      });
    }
  }

  function iniciar() {
    var boton = util.el('boton-favoritos');
    var cerrar = util.el('cerrar-favoritos');

    if (boton) boton.addEventListener('click', function () {
      util.el('panel-favoritos').classList.toggle('hidden');
      util.el('panel-filtros').classList.add('hidden');
      util.el('panel-horarios').classList.add('hidden');
      renderizar();
    });

    if (cerrar) cerrar.addEventListener('click', function () {
      util.el('panel-favoritos').classList.add('hidden');
    });
  }

  UniMap.favoritos = {
    iniciar: iniciar,
    obtener: obtener,
    guardar: guardar,
    esFavorito: esFavorito,
    alternar: alternar,
    renderizar: renderizar
  };
})();
