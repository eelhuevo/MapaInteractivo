/* =========================================================
   data/edificios.js — edificios del campus + dias y colores
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  UniMap.datos = UniMap.datos || {};

  UniMap.datos.edificios = [
    { id: 1, nombre: 'Edificio Principal', descripcion: 'Aulas, oficinas y servicios centrales', latitud: 19.4326, longitud: -99.1332 },
    { id: 2, nombre: 'Edificio de Ciencias', descripcion: 'Laboratorios y departamentos cientificos', latitud: 19.4328, longitud: -99.1335 },
    { id: 3, nombre: 'Edificio de Ingenieria', descripcion: 'Laboratorios de ingenieria y departamento', latitud: 19.4330, longitud: -99.1330 }
  ];

  UniMap.datos.diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
})();
