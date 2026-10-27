/* =========================================================
   core/personalizacion.js — capa de personalizacion de espacios
   (base de la HU-06: administrar oficinas / servicios)
   · permite editar, eliminar y crear espacios sin tocar los
     archivos de datos (los cambios viven en localStorage)
   · al editar genera avisos de cambio (HU-13)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var datos = UniMap.datos;
  var estado = UniMap.estado;

  var LLAVE = 'unimap_espacios_personalizados';

  function obtenerCambios() {
    return util.almacen.leer(LLAVE, {});
  }

  function guardarCambios(store) {
    util.almacen.escribir(LLAVE, store);
  }

  /* Aplica los overrides a una lista de espacios concreta
     (elimina los marcados como eliminado y sobreescribe campos) */
  function aplicarOverridesA(lista) {
    var store = obtenerCambios();
    var resultado = [];
    for (var i = 0; i < lista.length; i++) {
      var espacio = lista[i];
      var ov = store[espacio.id];
      if (ov) {
        if (ov.eliminado) continue; /* HU-06: eliminar espacio */
        for (var k in ov) {
          if (ov.hasOwnProperty(k) && k !== 'eliminado' && k !== 'nuevo') {
            espacio[k] = ov[k];
          }
        }
      }
      resultado.push(espacio);
    }
    /* Espacios nuevos creados por el administrador */
    for (var id in store) {
      if (!store.hasOwnProperty(id)) continue;
      var nuevo = store[id];
      if (nuevo.nuevo && !nuevo.eliminado) {
        var clon = {};
        for (var c in nuevo) {
          if (nuevo.hasOwnProperty(c) && c !== 'nuevo' && c !== 'eliminado') clon[c] = nuevo[c];
        }
        clon.id = id;
        resultado.push(clon);
      }
    }
    return resultado;
  }

  /* Espacios de un piso concreto (reemplaza a construirEspacios) */
  function espaciosDelPiso(edificio, piso) {
    return aplicarOverridesA(datos.construirEspacios(edificio, piso));
  }

  /* Reconstruye el listado global tras un cambio */
  function reconstruir() {
    estado.todosLosEspacios = [];
    var edificios = datos.edificios || [];
    for (var e = 0; e < edificios.length; e++) {
      var ed = edificios[e];
      var pisos = datos.pisosDe ? datos.pisosDe(ed.id) : [];
      for (var p = 0; p < pisos.length; p++) {
        var lista = espaciosDelPiso(ed.id, pisos[p]);
        for (var i = 0; i < lista.length; i++) estado.todosLosEspacios.push(lista[i]);
      }
    }
    /* Rehacer la planta visible (en modo "ambas torres" con las dos
       torres y la torre 2 ya desplazada en X) */
    estado.espacios = datos.espaciosDeVista
      ? datos.espaciosDeVista(estado.edificioActual, estado.pisoActual)
      : espaciosDelPiso(estado.edificioActual, estado.pisoActual);
  }

  function buscarEnTodos(id) {
    for (var i = 0; i < estado.todosLosEspacios.length; i++) {
      if (estado.todosLosEspacios[i].id === id) return estado.todosLosEspacios[i];
    }
    return null;
  }

  /* ── GUARDAR EDICION (con deteccion de cambios -> avisos) ── */
  function guardarEdicion(idEspacio, cambios) {
    var store = obtenerCambios();
    var original = buscarEnTodos(idEspacio);
    var previo = store[idEspacio] || {};
    var combinado = {};
    for (var k in previo) if (previo.hasOwnProperty(k)) combinado[k] = previo[k];
    for (var c in cambios) if (cambios.hasOwnProperty(c)) combinado[c] = cambios[c];
    store[idEspacio] = combinado;
    guardarCambios(store);

    /* Generar avisos comparando el estado anterior y el nuevo */
    if (original) {
      var nombreMostrar = cambios.nombre || original.nombre;
      if (cambios.nombre && cambios.nombre !== original.nombre) {
        registrarAviso('nombre', { espacioId: idEspacio, nombre: nombreMostrar, antes: original.nombre, despues: cambios.nombre });
      }
      if (cambios.horarioAtencion && cambios.horarioAtencion !== original.horarioAtencion) {
        registrarAviso('horario', { espacioId: idEspacio, nombre: nombreMostrar, antes: original.horarioAtencion || '-', despues: cambios.horarioAtencion });
      }
      if (cambios.estado && cambios.estado !== original.estado) {
        registrarAviso('estado', { espacioId: idEspacio, nombre: nombreMostrar, antes: original.estado, despues: cambios.estado });
      }
      if (String(cambios.piso) !== 'undefined' && cambios.piso !== null && cambios.piso !== original.piso) {
        registrarAviso('piso', { espacioId: idEspacio, nombre: nombreMostrar, despues: datos.nombrePiso(cambios.piso) });
      }
      if (cambios.x !== undefined || cambios.y !== undefined) {
        registrarAviso('ubicacion', { espacioId: idEspacio, nombre: nombreMostrar });
      }
    }
    reconstruir();
  }

  function registrarAviso(tipo, d) {
    if (UniMap.avisos) UniMap.avisos.registrar(tipo, d);
  }

  function eliminar(idEspacio) {
    var store = obtenerCambios();
    var original = buscarEnTodos(idEspacio);
    var previo = store[idEspacio] || {};
    previo.eliminado = true;
    store[idEspacio] = previo;
    guardarCambios(store);
    if (original) registrarAviso('eliminado', { espacioId: idEspacio, nombre: original.nombre });
    reconstruir();
  }

  /* Geometria por defecto para espacios nuevos: zona libre
     a la derecha del pasillo (x 600..780) */
  function siguientePosicionLibre() {
    var usados = 0;
    var store = obtenerCambios();
    for (var id in store) {
      if (store.hasOwnProperty(id) && store[id].nuevo && !store[id].eliminado) usados++;
    }
    var y = 60 + (usados % 6) * 70;
    var x = 600;
    return { x: x, y: y, ancho: 170, alto: 60 };
  }

  function agregar(datos_espacio) {
    var id = 'cus-' + Date.now();
    var pos = siguientePosicionLibre();
    var store = obtenerCambios();
    store[id] = {
      nuevo: true,
      id: id,
      nombre: datos_espacio.nombre,
      tipo: datos_espacio.tipo,
      categoria: datos_espacio.categoria || null,
      subtipo: datos_espacio.subtipo || null,
      edificio: datos_espacio.edificio,
      piso: datos_espacio.piso,
      x: pos.x, y: pos.y, ancho: pos.ancho, alto: pos.alto,
      capacidad: datos_espacio.capacidad || 0,
      estado: datos_espacio.estado || 'activo',
      docente: null,
      horarioAtencion: datos_espacio.horarioAtencion || '',
      telefono: datos_espacio.telefono || ''
    };
    guardarCambios(store);
    registrarAviso('nuevo', { espacioId: id, nombre: datos_espacio.nombre });
    reconstruir();
    return id;
  }

  function esPersonalizado(idEspacio) {
    var store = obtenerCambios();
    return !!store[idEspacio];
  }

  function restaurarTodo() {
    util.almacen.quitar(LLAVE);
    reconstruir();
  }

  UniMap.personalizacion = {
    espaciosDelPiso: espaciosDelPiso,
    reconstruir: reconstruir,
    guardarEdicion: guardarEdicion,
    eliminar: eliminar,
    agregar: agregar,
    esPersonalizado: esPersonalizado,
    restaurarTodo: restaurarTodo,
    obtenerCambios: obtenerCambios
  };
})();
