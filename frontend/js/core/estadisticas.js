/* =========================================================
   core/estadisticas.js — registro de consultas de espacios
   (HU-14: panel de estadisticas de uso, solo administrador)
   · cuenta cada vez que un usuario abre la ficha de un espacio
   · expone el ranking para el panel de administracion
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;

  var LLAVE = 'unimap_estadisticas';

  function obtenerDatos() {
    return util.almacen.leer(LLAVE, {});
  }

  function registrar(idEspacio) {
    if (!idEspacio) return;
    var datos = obtenerDatos();
    datos[idEspacio] = (datos[idEspacio] || 0) + 1;
    util.almacen.escribir(LLAVE, datos);

    /* Intento opcional de sincronizar con el backend Laravel
       (silencioso: si no hay API disponible se ignora) */
    if (UniMap.config && UniMap.config.activa) {
      try {
        fetch(UniMap.config.apiBase + '/estadisticas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ espacio: idEspacio, fecha: new Date().toISOString() })
        }).catch(function () { /* sin backend */ });
      } catch (e) { /* sin red */ }
    }
  }

  function total() {
    var datos = obtenerDatos();
    var suma = 0;
    for (var k in datos) {
      if (datos.hasOwnProperty(k)) suma += datos[k];
    }
    return suma;
  }

  /* Devuelve [{ espacioId, nombre, total }] ordenado desc */
  function ranking(cantidad) {
    var datos = obtenerDatos();
    var lista = [];
    for (var k in datos) {
      if (datos.hasOwnProperty(k)) {
        var espacio = buscarEspacio(k);
        lista.push({
          espacioId: k,
          nombre: espacio ? espacio.nombre : k,
          total: datos[k]
        });
      }
    }
    lista.sort(function (a, b) { return b.total - a.total; });
    return cantidad ? lista.slice(0, cantidad) : lista;
  }

  /* Cuenta de espacios por tipo (para la distribucion del panel admin) */
  function porTipo() {
    var espacios = UniMap.estado.todosLosEspacios || [];
    var cuenta = {};
    for (var i = 0; i < espacios.length; i++) {
      var s = espacios[i];
      if (UniMap.filtros && UniMap.filtros.esInfraestructura(s)) continue;
      cuenta[s.tipo] = (cuenta[s.tipo] || 0) + 1;
    }
    return cuenta;
  }

  function buscarEspacio(id) {
    var espacios = UniMap.estado.todosLosEspacios || [];
    for (var i = 0; i < espacios.length; i++) {
      if (espacios[i].id === id) return espacios[i];
    }
    return null;
  }

  function limpiar() {
    util.almacen.escribir(LLAVE, {});
  }

  UniMap.estadisticas = {
    registrar: registrar,
    ranking: ranking,
    total: total,
    porTipo: porTipo,
    limpiar: limpiar
  };
})();
