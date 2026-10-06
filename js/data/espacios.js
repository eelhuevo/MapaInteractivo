/* =========================================================
   data/espacios.js — construccion de los espacios de cada
   piso y listado global
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  UniMap.datos = UniMap.datos || {};

  var estado = UniMap.estado;

  /* ── FUNCION QUE CREA LOS ESPACIOS DE CADA PISO ──── */
  function construirEspacios(numeroPiso) {
    var espaciosDelPiso = [];

    if (numeroPiso === 0) {
      espaciosDelPiso.push(
        {id:'pb-a1', nombre:'Aula 101', tipo:'aula', categoria:1, edificio:1, piso:0, x:60, y:60, ancho:120, alto:80, capacidad:40, estado:'activo', docente:'f1', horarioAtencion:'07:00-20:00', telefono:'Ext. 101'},
        {id:'pb-a2', nombre:'Aula 102', tipo:'aula', categoria:1, edificio:1, piso:0, x:200, y:60, ancho:120, alto:80, capacidad:40, estado:'activo', docente:'f2', horarioAtencion:'07:00-20:00', telefono:'Ext. 102'},
        {id:'pb-a3', nombre:'Aula 103', tipo:'aula', categoria:1, edificio:1, piso:0, x:340, y:60, ancho:120, alto:80, capacidad:35, estado:'activo', docente:null, horarioAtencion:'07:00-20:00', telefono:'Ext. 103'},
        {id:'pb-l1', nombre:'Lab. Informatica', tipo:'laboratorio', categoria:2, edificio:2, piso:0, x:60, y:160, ancho:160, alto:90, capacidad:30, estado:'activo', docente:'f3', horarioAtencion:'08:00-18:00', telefono:'Ext. 201'},
        {id:'pb-l2', nombre:'Lab. Fisica', tipo:'laboratorio', categoria:2, edificio:2, piso:0, x:240, y:160, ancho:160, alto:90, capacidad:25, estado:'inactivo', docente:null, horarioAtencion:'08:00-18:00', telefono:'Ext. 202'},
        {id:'pb-of1', nombre:'Direccion General', tipo:'oficina', categoria:3, edificio:1, piso:0, x:420, y:60, ancho:100, alto:80, capacidad:5, estado:'activo', docente:null, horarioAtencion:'09:00-17:00', telefono:'555-0101'},
        {id:'pb-of2', nombre:'Secretaria Academica', tipo:'oficina', categoria:3, edificio:1, piso:0, x:420, y:160, ancho:100, alto:90, capacidad:8, estado:'activo', docente:null, horarioAtencion:'08:00-16:00', telefono:'555-0102'},
        {id:'pb-bib', nombre:'Biblioteca Central', tipo:'biblioteca', categoria:4, edificio:1, piso:0, x:60, y:280, ancho:200, alto:120, capacidad:100, estado:'activo', docente:null, horarioAtencion:'07:00-21:00', telefono:'555-0103'},
        {id:'pb-aud', nombre:'Auditorio Principal', tipo:'auditorio', categoria:5, edificio:1, piso:0, x:280, y:280, ancho:240, alto:120, capacidad:200, estado:'activo', docente:null, horarioAtencion:'08:00-20:00', telefono:'555-0104'},
        {id:'pb-com', nombre:'Comedor Universitario', tipo:'comedor', categoria:6, edificio:1, piso:0, x:60, y:420, ancho:200, alto:80, capacidad:150, estado:'activo', docente:null, horarioAtencion:'07:00-19:00', telefono:'555-0105'},
        {id:'pb-sal1', nombre:'Salon de Eventos', tipo:'salon', categoria:8, edificio:1, piso:0, x:280, y:420, ancho:240, alto:80, capacidad:80, estado:'activo', docente:null, horarioAtencion:'08:00-22:00', telefono:'555-0106'},
        {id:'pb-pas', nombre:'Pasillo Principal', tipo:'pasillo', piso:0, x:540, y:60, ancho:30, alto:440, capacidad:0, estado:'activo', docente:null},
        {id:'pb-dep', nombre:'Cancha Deportiva', tipo:'deportivo', categoria:7, edificio:1, piso:0, x:600, y:60, ancho:160, alto:180, capacidad:50, estado:'activo', docente:null, horarioAtencion:'06:00-20:00', telefono:'555-0107'},
        {id:'pb-par', nombre:'Estacionamiento', tipo:'estacionamiento', piso:0, x:600, y:260, ancho:160, alto:120, capacidad:40, estado:'activo', docente:null},
        {id:'pb-jar', nombre:'Jardin Central', tipo:'jardin', piso:0, x:600, y:400, ancho:160, alto:100, capacidad:0, estado:'activo', docente:null}
      );
    } else if (numeroPiso === 1) {
      espaciosDelPiso.push(
        {id:'p1-a1', nombre:'Aula 201', tipo:'aula', categoria:1, edificio:1, piso:1, x:60, y:60, ancho:120, alto:80, capacidad:40, estado:'activo', docente:'f4', horarioAtencion:'07:00-20:00', telefono:'Ext. 201'},
        {id:'p1-a2', nombre:'Aula 202', tipo:'aula', categoria:1, edificio:1, piso:1, x:200, y:60, ancho:120, alto:80, capacidad:40, estado:'activo', docente:'f5', horarioAtencion:'07:00-20:00', telefono:'Ext. 202'},
        {id:'p1-a3', nombre:'Aula 203', tipo:'aula', categoria:1, edificio:1, piso:1, x:340, y:60, ancho:120, alto:80, capacidad:35, estado:'inactivo', docente:null, horarioAtencion:'07:00-20:00', telefono:'Ext. 203'},
        {id:'p1-l1', nombre:'Lab. Quimica', tipo:'laboratorio', categoria:2, edificio:2, piso:1, x:60, y:160, ancho:160, alto:90, capacidad:25, estado:'activo', docente:'f5', horarioAtencion:'08:00-18:00', telefono:'Ext. 301'},
        {id:'p1-l2', nombre:'Lab. Electronica', tipo:'laboratorio', categoria:2, edificio:2, piso:1, x:240, y:160, ancho:160, alto:90, capacidad:20, estado:'activo', docente:'f4', horarioAtencion:'08:00-18:00', telefono:'Ext. 302'},
        {id:'p1-of1', nombre:'Dept. Ciencias', tipo:'oficina', categoria:3, edificio:2, piso:1, x:420, y:60, ancho:100, alto:80, capacidad:4, estado:'activo', docente:null, horarioAtencion:'09:00-17:00', telefono:'555-0201'},
        {id:'p1-of2', nombre:'Dept. Ingenieria', tipo:'oficina', categoria:3, edificio:3, piso:1, x:420, y:160, ancho:100, alto:90, capacidad:6, estado:'activo', docente:null, horarioAtencion:'09:00-17:00', telefono:'555-0202'},
        {id:'p1-sa1', nombre:'Salon Multiuso', tipo:'salon', categoria:8, edificio:1, piso:1, x:60, y:280, ancho:200, alto:100, capacidad:60, estado:'activo', docente:null, horarioAtencion:'07:00-22:00', telefono:'555-0203'},
        {id:'p1-a4', nombre:'Aula 204', tipo:'aula', categoria:1, edificio:1, piso:1, x:280, y:280, ancho:120, alto:80, capacidad:35, estado:'activo', docente:'f6', horarioAtencion:'07:00-20:00', telefono:'Ext. 204'},
        {id:'p1-a5', nombre:'Aula 205', tipo:'aula', categoria:1, edificio:1, piso:1, x:420, y:280, ancho:100, alto:80, capacidad:30, estado:'activo', docente:'f7', horarioAtencion:'07:00-20:00', telefono:'Ext. 205'},
        {id:'p1-pas', nombre:'Pasillo P1', tipo:'pasillo', piso:1, x:540, y:60, ancho:30, alto:300, capacidad:0, estado:'activo', docente:null},
        {id:'p1-toilets', nombre:'Sanitarios', tipo:'sanitarios', piso:1, x:60, y:400, ancho:80, alto:50, capacidad:0, estado:'activo', docente:null}
      );
    } else if (numeroPiso === 2) {
      espaciosDelPiso.push(
        {id:'p2-a1', nombre:'Aula 301', tipo:'aula', categoria:1, edificio:1, piso:2, x:60, y:60, ancho:120, alto:80, capacidad:40, estado:'activo', docente:'f8', horarioAtencion:'07:00-20:00', telefono:'Ext. 301'},
        {id:'p2-a2', nombre:'Aula 302', tipo:'aula', categoria:1, edificio:1, piso:2, x:200, y:60, ancho:120, alto:80, capacidad:40, estado:'activo', docente:'f1', horarioAtencion:'07:00-20:00', telefono:'Ext. 302'},
        {id:'p2-a3', nombre:'Aula 303', tipo:'aula', categoria:1, edificio:1, piso:2, x:340, y:60, ancho:120, alto:80, capacidad:30, estado:'activo', docente:'f3', horarioAtencion:'07:00-20:00', telefono:'Ext. 303'},
        {id:'p2-l1', nombre:'Lab. Biologia', tipo:'laboratorio', categoria:2, edificio:2, piso:2, x:60, y:160, ancho:160, alto:90, capacidad:25, estado:'inactivo', docente:null, horarioAtencion:'08:00-18:00', telefono:'Ext. 401'},
        {id:'p2-l2', nombre:'Lab. Redes', tipo:'laboratorio', categoria:2, edificio:3, piso:2, x:240, y:160, ancho:160, alto:90, capacidad:20, estado:'activo', docente:'f1', horarioAtencion:'08:00-18:00', telefono:'Ext. 402'},
        {id:'p2-of1', nombre:'Dept. Sociales', tipo:'oficina', categoria:3, edificio:1, piso:2, x:420, y:60, ancho:100, alto:80, capacidad:4, estado:'activo', docente:null, horarioAtencion:'09:00-17:00', telefono:'555-0301'},
        {id:'p2-of2', nombre:'Sala de Profesores', tipo:'oficina', categoria:3, edificio:1, piso:2, x:420, y:160, ancho:100, alto:90, capacidad:12, estado:'activo', docente:null, horarioAtencion:'07:00-20:00', telefono:'555-0302'},
        {id:'p2-a4', nombre:'Aula 304', tipo:'aula', categoria:1, edificio:1, piso:2, x:60, y:280, ancho:120, alto:80, capacidad:35, estado:'activo', docente:'f2', horarioAtencion:'07:00-20:00', telefono:'Ext. 304'},
        {id:'p2-sa1', nombre:'Seminario', tipo:'salon', categoria:8, edificio:1, piso:2, x:200, y:280, ancho:160, alto:80, capacidad:40, estado:'activo', docente:null, horarioAtencion:'08:00-20:00', telefono:'555-0303'},
        {id:'p2-pas', nombre:'Pasillo P2', tipo:'pasillo', piso:2, x:540, y:60, ancho:30, alto:300, capacidad:0, estado:'activo', docente:null}
      );
    } else if (numeroPiso === 3) {
      espaciosDelPiso.push(
        {id:'p3-a1', nombre:'Aula 401', tipo:'aula', categoria:1, edificio:1, piso:3, x:60, y:60, ancho:120, alto:80, capacidad:40, estado:'activo', docente:'f6', horarioAtencion:'07:00-20:00', telefono:'Ext. 401'},
        {id:'p3-a2', nombre:'Aula 402', tipo:'aula', categoria:1, edificio:1, piso:3, x:200, y:60, ancho:120, alto:80, capacidad:40, estado:'activo', docente:'f7', horarioAtencion:'07:00-20:00', telefono:'Ext. 402'},
        {id:'p3-of1', nombre:'Direccion de Carrera', tipo:'oficina', categoria:3, edificio:1, piso:3, x:340, y:60, ancho:180, alto:80, capacidad:6, estado:'activo', docente:null, horarioAtencion:'09:00-17:00', telefono:'555-0401'},
        {id:'p3-l1', nombre:'Lab. Avanzado', tipo:'laboratorio', categoria:2, edificio:3, piso:3, x:60, y:160, ancho:160, alto:90, capacidad:20, estado:'activo', docente:'f8', horarioAtencion:'08:00-18:00', telefono:'Ext. 501'},
        {id:'p3-sa1', nombre:'Sala de Conferencias', tipo:'salon', categoria:5, edificio:1, piso:3, x:240, y:160, ancho:280, alto:90, capacidad:80, estado:'activo', docente:null, horarioAtencion:'08:00-22:00', telefono:'555-0402'},
        {id:'p3-pas', nombre:'Pasillo P3', tipo:'pasillo', piso:3, x:540, y:60, ancho:30, alto:200, capacidad:0, estado:'activo', docente:null},
        {id:'p3-terraza', nombre:'Terraza', tipo:'jardin', piso:3, x:60, y:280, ancho:460, alto:80, capacidad:0, estado:'activo', docente:null}
      );
    }

    return espaciosDelPiso;
  }

  /* ── LISTADO GLOBAL (los 4 pisos) ─────────────────── */
  function construirTodosLosEspacios() {
    var acumulado = [];
    for (var piso = 0; piso <= 3; piso++) {
      var espaciosDelPiso = construirEspacios(piso);
      for (var i = 0; i < espaciosDelPiso.length; i++) {
        acumulado.push(espaciosDelPiso[i]);
      }
    }
    return acumulado;
  }

  UniMap.datos.construirEspacios = construirEspacios;
  UniMap.datos.construirTodosLosEspacios = construirTodosLosEspacios;

  /* Estado inicial del mapa */
  estado.espacios = construirEspacios(0);
  estado.todosLosEspacios = construirTodosLosEspacios();
})();
