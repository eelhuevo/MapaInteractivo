/* =========================================================
   map/busqueda.js — buscador de espacios del top bar
   (por nombre, tipo, docente o departamento)
   =========================================================
   Tarea #50 · Buscador de espacios y docentes de la barra
              superior
   Autor: ItsMegabo11
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  var campoBusqueda = util.el('campo-busqueda');
  var resultadosBusqueda = util.el('resultados-busqueda');

  /* Cantidad maxima de resultados que se muestran a la vez */
  var MAXIMO_RESULTADOS = 20;

  var ETIQUETAS = {
    aula: 'Aula', laboratorio: 'Lab', oficina: 'Oficina', biblioteca: 'Biblioteca',
    auditorio: 'Auditorio', comedor: 'Comedor', deportivo: 'Deportivo', salon: 'Salon'
  };

  /* ── NORMALIZACION ────────────────────────────────────
     Se ignoran los acentos y las mayusculas para que "laboratorio",
     "Laboratorio" y "LABORATORIO" den el mismo resultado. */
  function normalizar(texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ── RESALTADO DEL TEXTO ENCONTRADO ────────────────── */
  function resaltar(texto, consulta) {
    var seguro = util.escapar(texto);
    if (!texto || !consulta) return seguro;

    var normalizado = normalizar(texto);
    var patron = normalizar(consulta);
    var posicion = normalizado.indexOf(patron);
    if (posicion === -1) return seguro;

    /* Si al normalizar cambia el largo no se puede ubicar con
       seguridad el fragmento original, asi que no se marca. */
    if (normalizado.length !== texto.length) return seguro;

    var original = texto.slice(posicion, posicion + patron.length);
    if (normalizar(original) !== patron) return seguro;

    return util.escapar(texto.slice(0, posicion)) +
      '<mark>' + util.escapar(original) + '</mark>' +
      util.escapar(texto.slice(posicion + patron.length));
  }

  /* ── BUSQUEDA ───────────────────────────────────────── */
  function buscar(consulta) {
    var encontrados = [];
    var patron = normalizar(consulta);
    if (!patron) return encontrados;

    for (var i = 0; i < estado.todosLosEspacios.length; i++) {
      var s = estado.todosLosEspacios[i];
      /* La infraestructura de la planta (pasillo, jardin...) no tiene ficha */
      if (UniMap.filtros && UniMap.filtros.esInfraestructura(s)) continue;

      var coincide = normalizar(s.nombre).indexOf(patron) !== -1 ||
        normalizar(s.tipo).indexOf(patron) !== -1;

      /* Tambien se busca por el nombre legible del tipo (Aula, Lab...) */
      if (!coincide) {
        var etiqueta = ETIQUETAS[s.tipo];
        if (etiqueta && normalizar(etiqueta).indexOf(patron) !== -1) coincide = true;
      }

      if (!coincide && s.docente) {
        for (var d = 0; d < datos.docentes.length; d++) {
          if (datos.docentes[d].id === s.docente) {
            if (normalizar(datos.docentes[d].nombre).indexOf(patron) !== -1 ||
                normalizar(datos.docentes[d].departamento).indexOf(patron) !== -1) {
              coincide = true;
            }
            break;
          }
        }
      }

      if (coincide) encontrados.push(s);
    }
    return encontrados;
  }

  /* ── LISTA DE RESULTADOS ───────────────────────────── */
  function pintarResultados() {
    if (!campoBusqueda || !resultadosBusqueda) return;

    var consulta = campoBusqueda.value.trim();
    if (normalizar(consulta).length < 2) {
      resultadosBusqueda.classList.add('hidden');
      resultadosBusqueda.innerHTML = '';
      return;
    }

    var encontrados = buscar(consulta);

    if (encontrados.length === 0) {
      resultadosBusqueda.innerHTML = '<div class="search-no-results">No se encontraron resultados</div>';
    } else {
      var html = '';
      var mostrados = Math.min(encontrados.length, MAXIMO_RESULTADOS);
      for (var r = 0; r < mostrados; r++) {
        var res = encontrados[r];
        var detalle = (ETIQUETAS[res.tipo] || res.tipo) + ' - Piso ' + res.piso;

        if (res.docente) {
          for (var d2 = 0; d2 < datos.docentes.length; d2++) {
            if (datos.docentes[d2].id === res.docente) {
              detalle += ' - ' + datos.docentes[d2].nombre;
              break;
            }
          }
        }

        html += '<div class="search-result-item" data-id="' + util.escapar(res.id) + '" data-floor="' + res.piso + '">' +
          '<div class="sr-name">' + resaltar(res.nombre, consulta) + '</div>' +
          '<div class="sr-detail">' + util.escapar(detalle) + '</div></div>';
      }

      if (encontrados.length > mostrados) {
        html += '<div class="search-no-results">Mostrando los primeros ' +
          mostrados + ' de ' + encontrados.length + ' resultados</div>';
      }

      resultadosBusqueda.innerHTML = html;
    }

    resultadosBusqueda.classList.remove('hidden');
    moverActivo(0);
  }

  /* ── NAVEGACION CON EL TECLADO ─────────────────────── */
  var indiceActivo = -1;

  function moverActivo(paso) {
    if (!resultadosBusqueda) return;
    var items = resultadosBusqueda.querySelectorAll('.search-result-item');
    if (!items.length) return;

    for (var i = 0; i < items.length; i++) items[i].classList.remove('sr-activo');

    indiceActivo = Math.min(Math.max(indiceActivo + paso, 0), items.length - 1);
    var activo = items[indiceActivo];
    if (activo) {
      activo.classList.add('sr-activo');
      if (activo.scrollIntoView) activo.scrollIntoView({ block: 'nearest' });
    }
  }

  function reiniciarActivo() {
    indiceActivo = -1;
    if (!resultadosBusqueda) return;
    var items = resultadosBusqueda.querySelectorAll('.search-result-item');
    for (var i = 0; i < items.length; i++) items[i].classList.remove('sr-activo');
  }

  /* ── ARRANQUE DEL MODULO ────────────────────────────── */
  function iniciar() {
    if (!campoBusqueda || !resultadosBusqueda) return;

    campoBusqueda.addEventListener('input', pintarResultados);

    resultadosBusqueda.addEventListener('click', function (e) {
      var item = e.target.closest ? e.target.closest('.search-result-item') : null;
      if (!item) return;

      var id = item.getAttribute('data-id');
      if (UniMap.ui) UniMap.ui.irAEspacio(id);

      resultadosBusqueda.classList.add('hidden');
      campoBusqueda.value = '';
      reiniciarActivo();
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.search-container')) {
        resultadosBusqueda.classList.add('hidden');
        reiniciarActivo();
      }
    });

    var boton = util.el('boton-busqueda');
    if (boton) {
      boton.addEventListener('click', function () {
        campoBusqueda.dispatchEvent(new Event('input'));
      });
    }

    /* Enter: abre el primer resultado de la lista */
    campoBusqueda.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.keyCode !== 13) return;

      var items = resultadosBusqueda.querySelectorAll('.search-result-item');
      var elegido = null;

      if (indiceActivo >= 0 && indiceActivo < items.length) {
        elegido = items[indiceActivo];
      } else if (items.length) {
        elegido = items[0];
      }

      if (elegido) {
        e.preventDefault();
        elegido.click();
      }
    });

    /* Flechas: mueven el resaltado por la lista */
    campoBusqueda.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.keyCode === 40) {
        e.preventDefault();
        moverActivo(1);
      } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
        e.preventDefault();
        moverActivo(-1);
      } else if (e.key === 'Escape' || e.keyCode === 27) {
        resultadosBusqueda.classList.add('hidden');
        reiniciarActivo();
      }
    });
  }

  UniMap.busqueda = {
    iniciar: iniciar,
    buscar: buscar,
    normalizar: normalizar
  };
})();
