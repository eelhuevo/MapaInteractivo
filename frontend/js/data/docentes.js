/* =========================================================
   data/docentes.js — personal docente y horarios
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  UniMap.datos = UniMap.datos || {};

  UniMap.datos.docentes = [
    { id: 'f1', nombre: 'Dr. Carlos Mendez', departamento: 'Ciencias de la Computacion', correo: 'cmendez@uni.edu',
      horario: { 0: ['08:00-10:00', '14:00-16:00'], 1: ['10:00-12:00'], 2: ['08:00-10:00'], 3: ['14:00-16:00'], 4: ['10:00-12:00'] }},
    { id: 'f2', nombre: 'Dra. Laura Sanchez', departamento: 'Matematicas', correo: 'lsanchez@uni.edu',
      horario: { 0: ['10:00-12:00'], 1: ['08:00-10:00', '16:00-18:00'], 2: ['10:00-12:00'], 3: ['08:00-10:00'], 4: ['14:00-16:00'] }},
    { id: 'f3', nombre: 'Dr. Roberto Diaz', departamento: 'Fisica', correo: 'rdiaz@uni.edu',
      horario: { 0: ['12:00-14:00'], 1: ['12:00-14:00'], 2: ['14:00-16:00'], 3: ['12:00-14:00'], 4: ['08:00-10:00'] }},
    { id: 'f4', nombre: 'Dra. Maria Torres', departamento: 'Ingenieria Electrica', correo: 'mtorres@uni.edu',
      horario: { 0: ['08:00-10:00', '14:00-16:00'], 1: ['08:00-10:00'], 2: ['10:00-12:00'], 3: ['14:00-16:00'], 4: ['10:00-12:00'] }},
    { id: 'f5', nombre: 'Dr. Fernando Reyes', departamento: 'Quimica', correo: 'freyes@uni.edu',
      horario: { 0: ['10:00-12:00'], 1: ['14:00-16:00'], 2: ['08:00-10:00'], 3: ['10:00-12:00'], 4: ['14:00-16:00'] }},
    { id: 'f6', nombre: 'Dra. Ana Gutierrez', departamento: 'Ciencias Sociales', correo: 'agutierrez@uni.edu',
      horario: { 0: ['08:00-10:00'], 1: ['10:00-12:00', '14:00-16:00'], 2: ['14:00-16:00'], 3: ['08:00-10:00'], 4: ['10:00-12:00'] }},
    { id: 'f7', nombre: 'Dr. Javier Morales', departamento: 'Administracion', correo: 'jmorales@uni.edu',
      horario: { 0: ['14:00-16:00'], 1: ['08:00-10:00'], 2: ['10:00-12:00'], 3: ['14:00-16:00'], 4: ['08:00-10:00'] }},
    { id: 'f8', nombre: 'Dra. Patricia Luna', departamento: 'Derecho', correo: 'pluna@uni.edu',
      horario: { 0: ['10:00-12:00'], 1: ['14:00-16:00'], 2: ['08:00-10:00'], 3: ['10:00-12:00'], 4: ['14:00-16:00'] }}
  ];
})();
