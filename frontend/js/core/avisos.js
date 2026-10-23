/* =========================================================
   core/avisos.js — notificaciones de cambios de ubicacion,
   horario y estado de espacios (HU-13)
   · campana en la barra superior con contador de no leidos
   · los avisos se generan cuando un administrador edita un
     espacio (personalizacion.js) o desde el backend opcional
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var estado = UniMap.estado;

  var LLAVE = 'unimap_avisos';

  function obtener() {
    return util.almacen.leer(LLAVE, []);
  }

  function guardar(lista) {
    util.almacen.escribir(LLAVE, lista.slice(-50)); /* maximo 50 avisos */
  }

  /* tipo: horario | estado | nombre | piso | ubicacion | nuevo | eliminado
     datos: { espacioId, nombre, antes, despues } */
  function registrar(tipo, datos) {
    var lista = obtener();
    lista.push({
      id: 'av' + Date.now() + Math.floor(Math.random() * 1000),
      tipo: tipo,
      espacioId: datos.espacioId || null,
      nombre: datos.nombre || '',
      antes: datos.antes || '',
      despues: datos.despues || '',
      fecha: new Date().toISOString(),
      leido: false
    });
    guardar(lista);
    refrescarContador();
    refrescarPanel();
  }

  function noLeidos() {
    var lista = obtener();
    var n = 0;
    for (var i = 0; i < lista.length; i++) if (!lista[i].leido) n++;
    return n;
  }

  function marcarTodoLeido() {
    var lista = obtener();
    for (var i = 0; i < lista.length; i++) lista[i].leido = true;
    guardar(lista);
    refrescarContador();
    refrescarPanel();
  }

  function mensajeDe(aviso) {
    switch (aviso.tipo) {
      case 'horario': return UniMap.i18n.t('av.horario', { n: aviso.nombre, a: aviso.antes, b: aviso.despues });
      case 'estado': return UniMap.i18n.t('av.estado', { n: aviso.nombre, a: aviso.despues });
      case 'nombre': return UniMap.i18n.t('av.nombre', { a: aviso.antes, n: aviso.despues });
      case 'piso': return UniMap.i18n.t('av.piso', { n: aviso.nombre, a: aviso.despues });
      case 'ubicacion': return UniMap.i18n.t('av.ubicacion', { n: aviso.nombre });
      case 'nuevo': return UniMap.i18n.t('av.nuevo', { n: aviso.nombre });
      case 'eliminado': return UniMap.i18n.t('av.eliminado', { n: aviso.nombre });
      default: return aviso.nombre;
    }
  }

  /* ── INTERFAZ ─────────────────────────────────────── */
  function refrescarContador() {
    var badge = util.el('contador-avisos');
    if (!badge) return;
    var n = noLeidos();
    badge.textContent = n > 9 ? '9+' : String(n);
    badge.classList.toggle('hidden', n === 0);
  }

  function refrescarPanel() {
    var lista = util.el('lista-avisos');
    if (!lista || lista.classList.contains('hidden')) return;
    pintarLista();
  }

  function pintarLista() {
    var contenedor = util.el('lista-avisos');
    if (!contenedor) return;

    var lista = obtener().slice().reverse();
    if (lista.length === 0) {
      contenedor.innerHTML = '<div class="fav-vacio"><div class="fav-vacio-icono">&#128276;</div>' +
        '<p>' + util.escapar(UniMap.i18n.t('av.vacio')) + '</p></div>';
      return;
    }

    var html = '';
    for (var i = 0; i < lista.length; i++) {
      var av = lista[i];
      var fecha = new Date(av.fecha).toLocaleDateString();
      html += '<div class="aviso-item' + (av.leido ? '' : ' no-leido') + '" data-id="' + util.escapar(av.id) + '"' +
        (av.espacioId ? ' data-espacio="' + util.escapar(av.espacioId) + '"' : '') + '>' +
        '<div class="aviso-texto">' + util.escapar(mensajeDe(av)) + '</div>' +
        '<div class="aviso-fecha">' + util.escapar(fecha) + '</div></div>';
    }
    contenedor.innerHTML = html;

    var items = contenedor.querySelectorAll('.aviso-item');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', function () {
        var idEspacio = this.getAttribute('data-espacio');
        /* Marcar como leido */
        var idAviso = this.getAttribute('data-id');
        var todos = obtener();
        for (var k = 0; k < todos.length; k++) {
          if (todos[k].id === idAviso) { todos[k].leido = true; break; }
        }
        guardar(todos);
        refrescarContador();
        pintarLista();

        if (idEspacio && UniMap.ui) {
          UniMap.ui.irAEspacio(idEspacio);
          util.el('panel-avisos').classList.add('hidden');
        }
      });
    }
  }

  function iniciar() {
    var boton = util.el('boton-avisos');
    var cerrar = util.el('cerrar-avisos');
    var marcarBtn = util.el('marcar-avisos-leidos');

    if (boton) boton.addEventListener('click', function () {
      var panel = util.el('panel-avisos');
      panel.classList.toggle('hidden');
      /* cerrar los demas paneles */
      ['panel-filtros', 'panel-horarios', 'panel-favoritos', 'panel-servicios', 'panel-sugerencias'].forEach(function (id) {
        var p = util.el(id);
        if (p) p.classList.add('hidden');
      });
      pintarLista();
    });

    if (cerrar) cerrar.addEventListener('click', function () {
      util.el('panel-avisos').classList.add('hidden');
    });

    if (marcarBtn) marcarBtn.addEventListener('click', marcarTodoLeido);

    refrescarContador();

    /* Sincronizacion opcional con el backend Laravel */
    if (UniMap.config && UniMap.config.activa) {
      setTimeout(function () {
        try {
          fetch(UniMap.config.apiBase + '/avisos', {
            headers: { 'Accept': 'application/json' }
          }).then(function (r) { return r.ok ? r.json() : null; })
            .then(function (json) {
              if (!json || !json.data) return;
              var lista = obtener();
              for (var i = 0; i < json.data.length; i++) {
                var remoto = json.data[i];
                lista.push({
                  id: 'api' + (remoto.id || i),
                  tipo: remoto.tipo || 'estado',
                  espacioId: remoto.espacio_id || null,
                  nombre: remoto.nombre || '',
                  antes: remoto.antes || '',
                  despues: remoto.despues || '',
                  fecha: remoto.fecha || new Date().toISOString(),
                  leido: false
                });
              }
              guardar(lista);
              refrescarContador();
            })
            .catch(function () { /* sin backend */ });
        } catch (e) { /* sin red */ }
      }, 2500);
    }

    document.addEventListener('idioma:cambiado', function () {
      if (util.el('lista-avisos') && !util.el('lista-avisos').classList.contains('hidden')) pintarLista();
    });
  }

  UniMap.avisos = {
    iniciar: iniciar,
    registrar: registrar,
    obtener: obtener,
    noLeidos: noLeidos,
    marcarTodoLeido: marcarTodoLeido
  };
})();
