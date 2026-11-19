/* =========================================================
   data/categorias.js — tipos/categorias de espacio

   IMPORTANTE: las categorias NO se inventan aqui. La unica fuente
   de datos es el backend (GET /api/catalogos/tipos-espacio y
   GET /api/catalogos/categorias-servicio, sembrados por
   CatalogoSeeder). Este archivo queda vacio como punto de entrada
   para no romper la etiqueta <script> de mapa.html y admin.html
   (igual que data/espacios.js y data/docentes.js).
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  UniMap.datos = UniMap.datos || {};

  /* Sin datos locales: solo lo que traiga el backend */
  UniMap.datos.categorias = [];
})();
