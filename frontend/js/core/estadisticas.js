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
       (POST /api/eventos-consulta: idEspacio debe ser numerico;
       los ids locales del demo no lo son, asi que se omite
       silenciosamente y el conteo sigue siendo local) */
    if (UniMap.config && UniMap.config.activa && /^\d+$/.test(String(idEspacio))) {
      try {
        fetch(UniMap.config.apiBase + '/eventos-consulta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ idEspacio: parseInt(idEspacio, 10), tipoEvento: 'consulta' })
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

  /* Cuenta de espacios por tipo (para la distribucion del panel admin).
     En admin.html no se carga map/filtros.js, asi que la lista de
     infraestructura se toma de ahi si existe y si no se usa local. */
  function porTipo() {
    var infra = (UniMap.filtros && UniMap.filtros.TIPOS_INFRAESTRUCTURA) ||
      ['pasillo', 'jardin', 'estacionamiento', 'sanitarios', 'entrada'];
    var espacios = UniMap.estado.todosLosEspacios || [];
    var cuenta = {};
    for (var i = 0; i < espacios.length; i++) {
      var s = espacios[i];
      if (infra.indexOf(s.tipo) !== -1) continue;
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
