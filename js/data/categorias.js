/* =========================================================
   data/categorias.js — tipos de espacio del campus
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  UniMap.datos = UniMap.datos || {};

  UniMap.datos.categorias = [
    { id: 1, nombre: 'Aula', descripcion: 'Espacios de clase para impartir materias', icono: 'aula' },
    { id: 2, nombre: 'Laboratorio', descripcion: 'Espacios equipados para practicas', icono: 'laboratorio' },
    { id: 3, nombre: 'Oficina', descripcion: 'Oficinas administrativas y academicas', icono: 'oficina' },
    { id: 4, nombre: 'Biblioteca', descripcion: 'Centro de recursos de informacion', icono: 'biblioteca' },
    { id: 5, nombre: 'Auditorio', descripcion: 'Espacios para eventos y conferencias', icono: 'auditorio' },
    { id: 6, nombre: 'Comedor', descripcion: 'Area de alimentacion', icono: 'comedor' },
    { id: 7, nombre: 'Deportivo', descripcion: 'Instalaciones deportivas', icono: 'deportivo' },
    { id: 8, nombre: 'Salon', descripcion: 'Salones multiuso y de eventos', icono: 'salon' }
  ];
})();
