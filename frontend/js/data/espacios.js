/* =========================================================
   data/espacios.js — construccion de los espacios de cada
   piso de cada torre (Torre Antigua 0-7, Innovacion 0-8)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  UniMap.datos = UniMap.datos || {};

  var estado = UniMap.estado;

  /* Semilla deterministica para que cada piso siempre tenga
     la misma distribucion sin ocupar memoria de más */
  function semilla(edificio, piso) {
    var n = edificio * 100 + piso;
    return function () {
      n = (n * 9301 + 49297) % 233280;
      return n / 233280;
    };
  }

  function elegir(lista, rnd) {
    return lista[Math.floor(rnd() * lista.length)];
  }

  var DOCENTES = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'];

  var NOMBRES_AULA_TA = ['Algebra', 'Calculo', 'Fisica', 'Quimica', 'Programacion', 'Bases de Datos',
    'Sistemas Operativos', 'Redes', 'Estructuras', 'Probabilidad', 'Metodos Numericos', 'Ingles'];
  var NOMBRES_AULA_TI = ['Inteligencia Artificial', 'Robótica', 'IoT', 'Big Data', 'Ciberseguridad',
    'Realidad Aumentada', 'Blockchain', 'Machine Learning', 'Cloud Computing', 'DevOps', 'UX Research', 'Data Viz'];
  var NOMBRES_LAB_TA = ['Lab. Informatica', 'Lab. Electronica', 'Lab. Fisica', 'Lab. Quimica', 'Lab. Mecanica'];
  var NOMBRES_LAB_TI = ['Lab. IA', 'Lab. Robotica', 'Lab. IoT', 'Lab. Ciberseguridad', 'Lab. Produccion'];
  /* HU-19: subtipo de cada laboratorio (mismo orden que los nombres) */
  var SUBTIPOS_LAB_TA = ['informatica', 'electronica', 'fisica', 'quimica', 'mecanica'];
  var SUBTIPOS_LAB_TI = ['ia', 'robotica', 'iot', 'ciberseguridad', 'produccion'];
  var NOMBRES_OF_TA = ['Dept. Ciencias', 'Dept. Ingenieria', 'Sala de Profesores', 'Secretaria', 'Coordinacion'];
  var NOMBRES_OF_TI = ['Innovacion', 'Investigacion', 'Vinculacion', 'Laboratorio de Ideas', 'Startup Hub'];

  /* ── PLANTILLA DE PISO ──────────────────────────────
     Genera una planta realista en el plano logico 800x600.
     Cada piso tiene: aulas (fila superior), labs (fila media),
     oficinas, salon/auditorio, pasillo y sanitarios. */
  function construirEspacios(edificio, numeroPiso) {
    var espacios = [];
    var rnd = semilla(edificio, numeroPiso);
    var prefijo = (edificio === 1 ? 'ta' : 'ti') + '-p' + numeroPiso + '-';
    var esPB = numeroPiso === 0;
    var esTop = edificio === 1 ? numeroPiso === 7 : numeroPiso === 8;
    var nomenclatura = edificio === 1 ? (100 + numeroPiso * 10) : (500 + numeroPiso * 10);
    var nombresAula = edificio === 1 ? NOMBRES_AULA_TA : NOMBRES_AULA_TI;
    var nombresLab = edificio === 1 ? NOMBRES_LAB_TA : NOMBRES_LAB_TI;
    var subtiposLab = edificio === 1 ? SUBTIPOS_LAB_TA : SUBTIPOS_LAB_TI;
    var nombresOf = edificio === 1 ? NOMBRES_OF_TA : NOMBRES_OF_TI;

    /* Infraestructura: pasillo vertical + sanitarios (siempre presentes) */
    espacios.push({
      id: prefijo + 'pas', nombre: 'Pasillo ' + (numeroPiso === 0 ? 'PB' : 'P' + numeroPiso),
      tipo: 'pasillo', piso: numeroPiso, edificio: edificio,
      x: 540, y: 60, ancho: 30, alto: 440, capacidad: 0, estado: 'activo', docente: null
    });
    espacios.push({
      id: prefijo + 'sani', nombre: 'Sanitarios', tipo: 'sanitarios',
      piso: numeroPiso, edificio: edificio,
      x: 60, y: 480, ancho: 90, alto: 40, capacidad: 0, estado: 'activo', docente: null
    });

    /* Planta Baja: servicios especiales */
    if (esPB) {
      /* Indice del laboratorio de planta baja (nombre + subtipo) */
      var indiceLab = Math.floor(rnd() * nombresLab.length);
      if (edificio === 1) {
        espacios.push(
          { id: prefijo + 'bib', nombre: 'Biblioteca', tipo: 'biblioteca', categoria: 4, edificio: 1, piso: 0,
            x: 60, y: 280, ancho: 200, alto: 120, capacidad: 100, estado: 'activo', docente: null, horarioAtencion: '07:00-21:00', telefono: 'Ext. 101' },
          { id: prefijo + 'aud', nombre: 'Auditorio', tipo: 'auditorio', categoria: 5, edificio: 1, piso: 0,
            x: 280, y: 280, ancho: 240, alto: 120, capacidad: 200, estado: 'activo', docente: null, horarioAtencion: '08:00-20:00', telefono: 'Ext. 102' },
          { id: prefijo + 'com', nombre: 'Comedor', tipo: 'comedor', categoria: 6, edificio: 1, piso: 0,
            x: 60, y: 410, ancho: 200, alto: 60, capacidad: 120, estado: 'activo', docente: null, horarioAtencion: '07:00-19:00', telefono: 'Ext. 103' },
          { id: prefijo + 'sal', nombre: 'Salon de Eventos', tipo: 'salon', categoria: 8, edificio: 1, piso: 0,
            x: 280, y: 410, ancho: 240, alto: 60, capacidad: 80, estado: 'activo', docente: null, horarioAtencion: '08:00-22:00', telefono: 'Ext. 104' }
        );
      } else {
        espacios.push(
          { id: prefijo + 'rece', nombre: 'Recepcion', tipo: 'oficina', categoria: 3, edificio: 2, piso: 0,
            x: 60, y: 280, ancho: 200, alto: 80, capacidad: 10, estado: 'activo', docente: null, horarioAtencion: '08:00-18:00', telefono: 'Ext. 501' },
          { id: prefijo + 'expo', nombre: 'Area de Exposiciones', tipo: 'salon', categoria: 8, edificio: 2, piso: 0,
            x: 280, y: 280, ancho: 240, alto: 80, capacidad: 60, estado: 'activo', docente: null, horarioAtencion: '08:00-20:00', telefono: 'Ext. 502' },
          { id: prefijo + 'cow', nombre: 'Coworking', tipo: 'salon', categoria: 8, edificio: 2, piso: 0,
            x: 60, y: 380, ancho: 200, alto: 80, capacidad: 40, estado: 'activo', docente: null, horarioAtencion: '07:00-22:00', telefono: 'Ext. 503' },
          { id: prefijo + 'cafe', nombre: 'Cafe Innovation', tipo: 'comedor', categoria: 6, edificio: 2, piso: 0,
            x: 280, y: 380, ancho: 240, alto: 80, capacidad: 50, estado: 'activo', docente: null, horarioAtencion: '07:00-20:00', telefono: 'Ext. 504' }
        );
      }
      /* Aulas de planta baja (2 grandes) */
      espacios.push(
        { id: prefijo + 'a1', nombre: 'Aula ' + (nomenclatura + 1), tipo: 'aula', categoria: 1, edificio: edificio, piso: 0,
          x: 60, y: 60, ancho: 220, alto: 90, capacidad: 50, estado: 'activo', docente: DOCENTES[0], horarioAtencion: '07:00-20:00', telefono: 'Ext. ' + (nomenclatura + 1) },
        { id: prefijo + 'a2', nombre: 'Aula ' + (nomenclatura + 2), tipo: 'aula', categoria: 1, edificio: edificio, piso: 0,
          x: 300, y: 60, ancho: 220, alto: 90, capacidad: 50, estado: 'activo', docente: DOCENTES[1], horarioAtencion: '07:00-20:00', telefono: 'Ext. ' + (nomenclatura + 2) },
        { id: prefijo + 'of1', nombre: 'Direccion', tipo: 'oficina', categoria: 3, edificio: edificio, piso: 0,
          x: 60, y: 170, ancho: 150, alto: 90, capacidad: 6, estado: 'activo', docente: null, horarioAtencion: '09:00-17:00', telefono: 'Ext. ' + (nomenclatura + 8) },
        { id: prefijo + 'of2', nombre: 'Secretaria', tipo: 'oficina', categoria: 3, edificio: edificio, piso: 0,
          x: 230, y: 170, ancho: 150, alto: 90, capacidad: 8, estado: 'activo', docente: null, horarioAtencion: '08:00-16:00', telefono: 'Ext. ' + (nomenclatura + 9) },
        { id: prefijo + 'l1', nombre: nombresLab[indiceLab], tipo: 'laboratorio', categoria: 2, edificio: edificio, piso: 0,
          subtipo: subtiposLab[indiceLab],
          x: 400, y: 170, ancho: 120, alto: 90, capacidad: 25, estado: 'activo', docente: DOCENTES[2], horarioAtencion: '08:00-18:00', telefono: 'Ext. ' + (nomenclatura + 3) }
      );

      /* HU-08: entrada principal y estacionamientos */
      espacios.push(
        { id: prefijo + 'entrada', nombre: 'Entrada Principal', tipo: 'entrada', piso: 0, edificio: edificio,
          x: 240, y: 484, ancho: 160, alto: 24, capacidad: 0, estado: 'activo', docente: null, horarioAtencion: '06:00-22:00' },
        { id: prefijo + 'est1', nombre: 'Estacionamiento Principal', tipo: 'estacionamiento', piso: 0, edificio: edificio,
          x: 600, y: 60, ancho: 170, alto: 190, capacidad: 40, estado: 'activo', docente: null, horarioAtencion: '06:00-22:00' },
        { id: prefijo + 'est2', nombre: 'Estacionamiento Visitantes', tipo: 'estacionamiento', piso: 0, edificio: edificio,
          x: 600, y: 270, ancho: 170, alto: 150, capacidad: 20, estado: 'activo', docente: null, horarioAtencion: '06:00-22:00' }
      );
      return espacios;
    }

    /* ── PISOS SUPERIORES ──────────────────────────── */

    /* Top floor: terraza + salon grande en vez de mas aulas */
    if (esTop) {
      espacios.push(
        { id: prefijo + 'terraza', nombre: 'Terraza', tipo: 'jardin', piso: numeroPiso, edificio: edificio,
          x: 60, y: 380, ancho: 460, alto: 80, capacidad: 0, estado: 'activo', docente: null },
        { id: prefijo + 'conf', nombre: 'Sala de Conferencias', tipo: 'salon', categoria: 8, edificio: edificio, piso: numeroPiso,
          x: 60, y: 200, ancho: 460, alto: 160, capacidad: 100, estado: 'activo', docente: null, horarioAtencion: '08:00-22:00', telefono: 'Ext. ' + (nomenclatura + 7) },
        { id: prefijo + 'ofd', nombre: 'Direccion de Carrera', tipo: 'oficina', categoria: 3, edificio: edificio, piso: numeroPiso,
          x: 60, y: 60, ancho: 220, alto: 120, capacidad: 8, estado: 'activo', docente: null, horarioAtencion: '09:00-17:00', telefono: 'Ext. ' + (nomenclatura + 8) },
        { id: prefijo + 'a1', nombre: 'Aula ' + (nomenclatura + 1), tipo: 'aula', categoria: 1, edificio: edificio, piso: numeroPiso,
          x: 300, y: 60, ancho: 220, alto: 120, capacidad: 40, estado: 'activo', docente: elegir(DOCENTES, rnd), horarioAtencion: '07:00-20:00', telefono: 'Ext. ' + (nomenclatura + 1) }
      );
      return espacios;
    }

    /* Piso normal: 3 aulas */
    var numAulas = 3;
    for (var a = 0; a < numAulas; a++) {
      var activo = rnd() > 0.08;
      espacios.push({
        id: prefijo + 'a' + (a + 1),
        nombre: 'Aula ' + (nomenclatura + a + 1) + ' · ' + nombresAula[(numeroPiso + a) % nombresAula.length],
        tipo: 'aula', categoria: 1, edificio: edificio, piso: numeroPiso,
        x: 60 + a * 160, y: 60, ancho: 150, alto: 90,
        capacidad: 30 + Math.floor(rnd() * 20),
        estado: activo ? 'activo' : 'inactivo',
        docente: elegir(DOCENTES, rnd),
        horarioAtencion: '07:00-20:00',
        telefono: 'Ext. ' + (nomenclatura + a + 1)
      });
    }

    /* Laboratorios (fila 2) — HU-19: cada uno con su subtipo */
    var numLabs = 2;
    for (var l = 0; l < numLabs; l++) {
      var indiceSub = (numeroPiso + l) % nombresLab.length;
      espacios.push({
        id: prefijo + 'l' + (l + 1),
        nombre: nombresLab[indiceSub],
        tipo: 'laboratorio', categoria: 2, edificio: edificio, piso: numeroPiso,
        subtipo: subtiposLab[indiceSub],
        x: 60 + l * 170, y: 170, ancho: 160, alto: 90,
        capacidad: 15 + Math.floor(rnd() * 15),
        estado: rnd() > 0.1 ? 'activo' : 'inactivo',
        docente: elegir(DOCENTES, rnd),
        horarioAtencion: '08:00-18:00',
        telefono: 'Ext. ' + (nomenclatura + 3 + l)
      });
    }

    /* Oficinas (fila 3) */
    var numOf = 2;
    for (var o = 0; o < numOf; o++) {
      espacios.push({
        id: prefijo + 'of' + (o + 1),
        nombre: nombresOf[(numeroPiso + o) % nombresOf.length],
        tipo: 'oficina', categoria: 3, edificio: edificio, piso: numeroPiso,
        x: 60 + o * 170, y: 280, ancho: 160, alto: 80,
        capacidad: 4 + Math.floor(rnd() * 8),
        estado: 'activo',
        docente: null,
        horarioAtencion: '09:00-17:00',
        telefono: 'Ext. ' + (nomenclatura + 5 + o)
      });
    }

    /* Salon o biblioteca en el hueco de la derecha (sin contar pasillo) */
    if (numeroPiso % 3 === 0) {
      espacios.push({
        id: prefijo + 'bib', nombre: 'Sala de Estudio', tipo: 'biblioteca', categoria: 4,
        edificio: edificio, piso: numeroPiso,
        x: 400, y: 280, ancho: 120, alto: 80, capacidad: 30, estado: 'activo', docente: null,
        horarioAtencion: '07:00-21:00', telefono: 'Ext. ' + (nomenclatura + 7)
      });
    } else {
      espacios.push({
        id: prefijo + 'sal', nombre: 'Salon Multiuso', tipo: 'salon', categoria: 8,
        edificio: edificio, piso: numeroPiso,
        x: 400, y: 280, ancho: 120, alto: 80, capacidad: 40, estado: 'activo', docente: null,
        horarioAtencion: '07:00-22:00', telefono: 'Ext. ' + (nomenclatura + 7)
      });
    }

    return espacios;
  }

  /* ── LISTADO GLOBAL (ambas torres, todos los pisos) ── */
  function construirTodosLosEspacios() {
    var acumulado = [];
    var edificios = UniMap.datos.edificios || [];
    for (var e = 0; e < edificios.length; e++) {
      var ed = edificios[e];
      for (var piso = 0; piso < ed.pisos; piso++) {
        var espaciosDelPiso = construirEspacios(ed.id, piso);
        for (var i = 0; i < espaciosDelPiso.length; i++) {
          acumulado.push(espaciosDelPiso[i]);
        }
      }
    }
    return acumulado;
  }

  function pisosDeEdificio(edificioId) {
    var edificios = UniMap.datos.edificios || [];
    for (var i = 0; i < edificios.length; i++) {
      if (edificios[i].id === edificioId) return edificios[i].pisos;
    }
    return 0;
  }

  function nombreEdificio(edificioId) {
    var edificios = UniMap.datos.edificios || [];
    for (var i = 0; i < edificios.length; i++) {
      if (edificios[i].id === edificioId) {
        var nombre = edificios[i].nombre;
        /* HU-15: las torres se muestran en el idioma activo */
        if (UniMap.i18n) {
          if (nombre === 'Torre Antigua') return UniMap.i18n.t('torre.antigua');
          if (nombre === 'Torre Innovacion') return UniMap.i18n.t('torre.innovacion');
        }
        return nombre;
      }
    }
    return '';
  }

  function nombrePiso(numeroPiso) {
    /* HU-15: la etiqueta del piso se traduce si i18n esta activo */
    if (UniMap.i18n) {
      return numeroPiso === 0
        ? UniMap.i18n.t('piso.pb')
        : UniMap.i18n.t('piso.piso') + ' ' + numeroPiso;
    }
    return numeroPiso === 0 ? 'Planta Baja' : 'Piso ' + numeroPiso;
  }

  UniMap.datos.construirEspacios = construirEspacios;
  UniMap.datos.construirTodosLosEspacios = construirTodosLosEspacios;
  UniMap.datos.pisosDeEdificio = pisosDeEdificio;
  UniMap.datos.nombreEdificio = nombreEdificio;
  UniMap.datos.nombrePiso = nombrePiso;

  /* Estado inicial del mapa: Torre Antigua, planta baja */
  estado.espacios = construirEspacios(1, 0);
  estado.todosLosEspacios = construirTodosLosEspacios();
})();
