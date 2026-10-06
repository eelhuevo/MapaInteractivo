/* =========================================================
   map/busqueda.js — buscador de espacios del top bar
   (por nombre, tipo, docente o departamento)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  var campoBusqueda = util.el('campo-busqueda');
  var resultadosBusqueda = util.el('resultados-busqueda');

  var ETIQUETAS = {
    aula: 'Aula', laboratorio: 'Lab', oficina: 'Oficina', biblioteca: 'Biblioteca',
    auditorio: 'Auditorio', comedor: 'Comedor', deportivo: 'Deportivo', salon: 'Salon'
  };

  function buscar(consulta) {
    var encontrados = [];
    for (var i = 0; i < estado.todosLosEspacios.length; i++) {
      var s = estado.todosLosEspacios[i];
      /* La infraestructura de la planta (pasillo, jardin...) no tiene ficha */
      if (UniMap.filtros && UniMap.filtros.esInfraestructura(s)) continue;

      var coincide = s.nombre.toLowerCase().indexOf(consulta) !== -1 ||
        s.tipo.toLowerCase().indexOf(consulta) !== -1;

      if (!coincide && s.docente) {
        for (var d = 0; d < datos.docentes.length; d++) {
          if (datos.docentes[d].id === s.docente) {
            if (datos.docentes[d].nombre.toLowerCase().indexOf(consulta) !== -1 ||
                datos.docentes[d].departamento.toLowerCase().indexOf(consulta) !== -1) {
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

  function pintarResultados() {
    if (!campoBusqueda || !resultadosBusqueda) return;

    var consulta = campoBusqueda.value.trim().toLowerCase();
    if (consulta.length < 2) {
      resultadosBusqueda.classList.add('hidden');
      return;
    }

    var encontrados = buscar(consulta);

    if (encontrados.length === 0) {
      resultadosBusqueda.innerHTML = '<div class="search-no-results">No se encontraron resultados</div>';
    } else {
      var html = '';
      for (var r = 0; r < encontrados.length; r++) {
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
          '<div class="sr-name">' + util.escapar(res.nombre) + '</div>' +
          '<div class="sr-detail">' + util.escapar(detalle) + '</div></div>';
      }
      resultadosBusqueda.innerHTML = html;
    }

    resultadosBusqueda.classList.remove('hidden');
  }

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
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.search-container')) {
        resultadosBusqueda.classList.add('hidden');
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
      var primero = resultadosBusqueda.querySelector('.search-result-item');
      if (primero) {
        e.preventDefault();
        primero.click();
      }
    });
  }

  UniMap.busqueda = {
    iniciar: iniciar,
    buscar: buscar
  };
})();
