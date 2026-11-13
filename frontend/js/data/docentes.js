/* =========================================================
   data/docentes.js — personal docente y horarios
   (HU "Consulta de docentes" / "Consulta de horarios")

   IMPORTANTE: los docentes NO se inventan aqui. La unica fuente de
   datos es el backend (GET /api/docentes, sembrado por
   DocenteSeeder con 10 docentes y su horario semanal), que se pide
   en core/api.js (cargarDocentes) y se publica en
   UniMap.datos.docentes. Si el backend esta apagado la lista queda
   vacia y el panel de horarios no muestra nada (cero datos falsos).
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  UniMap.datos = UniMap.datos || {};

  /* Sin datos locales: solo lo que traiga el backend */
  UniMap.datos.docentes = [];
})();
