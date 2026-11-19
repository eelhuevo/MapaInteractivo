/* =========================================================
   core/api.js — puente REST con el backend Laravel
   · guarda el token de sesion (Sanctum) y hace las peticiones
   · traduce los espacios del frontend (torre/piso plano) al
     modelo del backend (idEdificio/idPiso/idTipoEspacio/lat-lng)
   · sincroniza altas, ediciones y bajas del panel de administracion
     con POST/PUT/DELETE /api/admin/espacios
   · si el backend no responde, encola el cambio en localStorage
     y lo reintenta solo cuando vuelve a haber conexion
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;

  var LLAVE_TOKEN = 'unimap_token_api';
  var LLAVE_MAPA = 'unimap_mapa_api';        /* id local -> idEspacio backend */
  var LLAVE_PENDIENTES = 'unimap_pendientes_api';
  var LLAVE_CANDADO = 'unimap_candado_api';

  /* frontend 'deportivo' -> backend 'areaDeportiva' */
  var TIPO_MAPA = { deportivo: 'areaDeportiva' };
  /* backend 'areaDeportiva' -> frontend 'deportivo' (el resto pasa tal cual,
     en minusculas y sin acentos, que es como el frontend los nombra) */
  var TIPO_INVERSO = { areadeportiva: 'deportivo' };
  var DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

  /* El plano 2D es esquematico (800x600): cada unidad se traduce a
     una fraccion de grado alrededor del edificio para que PostGIS
     reciba un punto distinto por espacio (~130 m de radio maximo). */
  var ESCALA_PLANO = 0.000003;

  /* ── CONFIGURACION / TOKEN ─────────────────────────── */
  function activa() { return !!(UniMap.config && UniMap.config.activa); }
  function base() { return (UniMap.config && UniMap.config.apiBase) || 'http://localhost:8000/api'; }
  function token() { return util.almacen.leer(LLAVE_TOKEN, null); }
  function guardarToken(t) { util.almacen.escribir(LLAVE_TOKEN, t); }
  function quitarToken() { util.almacen.quitar(LLAVE_TOKEN); }

  /* ── PETICIONES ────────────────────────────────────── */
  /* Espera maxima por respuesta: si el backend no contesta en este
     plazo (arranque lento, BD remota colgada) se corta la peticion y
     se resuelve como estado 0 (sin backend), en vez de dejar la
     pagina esperando para siempre. */
  var TIMEOUT_PETICION = 20000;

  /* GETs publicos: sus rutas no exigen token en routes/api.php y su
     respuesta NO depende del usuario (EspacioMapaResource y los
     controladores de docentes/edificios/catalogos no leen el sesion),
     asi que ahi omitimos Authorization aunque haya sesion.
     Motivo: el navegador lanza un preflight OPTIONS ante cualquier
     cabecera no permitida, y cada OPTIONS es una peticion extra que
     en "artisan serve" (un solo hilo) arranca Laravel completo.
     Quitarlo: la mitad de peticiones y la cache de respuesta
     compartida. Ojo: /espacios/{id} (ficha) y /edificios/{id} NO
     entran aqui; la ficha si usa el usuario (esFavorito). */
  var GETS_SIN_TOKEN = [
    /^\/catalogos\/[^?]+$/,
    /^\/edificios$/,
    /^\/edificios\/\d+\/pisos$/,
    /^\/espacios$/,
    /^\/docentes$/
  ];
  function necesitaToken(metodo, ruta) {
    if (String(metodo).toUpperCase() !== 'GET') return true;
    var sinConsulta = String(ruta).split('?')[0];
    for (var i = 0; i < GETS_SIN_TOKEN.length; i++) {
      if (GETS_SIN_TOKEN[i].test(sinConsulta)) return false;
    }
    return true;
  }

  /* Nunca rechaza: resuelve { ok, estado, json } (estado 0 = sin red) */
  function solicitar(metodo, ruta, cuerpo, cabecerasExtra) {
    var cabeceras = { 'Accept': 'application/json' };
    var tk = token();
    if (tk && necesitaToken(metodo, ruta)) cabeceras['Authorization'] = 'Bearer ' + tk;
    if (cabecerasExtra) {
      for (var c in cabecerasExtra) {
        if (cabecerasExtra.hasOwnProperty(c)) cabeceras[c] = cabecerasExtra[c];
      }
    }

    var opciones = { method: metodo, headers: cabeceras };
    if (cuerpo !== undefined && cuerpo !== null) {
      cabeceras['Content-Type'] = 'application/json';
      opciones.body = JSON.stringify(cuerpo);
    }

    var reloj = null;
    if (typeof AbortController === 'function') {
      var control = new AbortController();
      opciones.signal = control.signal;
      reloj = setTimeout(function () { control.abort(); }, TIMEOUT_PETICION);
    }

    return fetch(base() + ruta, opciones).then(function (respuesta) {
      if (reloj) clearTimeout(reloj);
      return respuesta.json().catch(function () { return {}; }).then(function (json) {
        return { ok: respuesta.ok, estado: respuesta.status, json: json };
      });
    }).catch(function () {
      if (reloj) clearTimeout(reloj);
      return { ok: false, estado: 0, json: null };
    });
  }

  /* ── REINTENTOS (el backend puede estar arrancando) ── */
  /* Si una carga falla porque el backend aun no responde (estado 0:
     conexion rechazada o tiempo agotado), se repite con esperas
     crecientes. Cubre el arranque de INICIAR-BACKEND.bat: la pagina
     puede abrirse antes de que "artisan serve" este listo y, sin esto,
     habria que recargar a mano. */
  var ESPERAS_REINTENTO = [700, 1200, 2000, 3000, 4000];

  function esperar(ms) {
    return new Promise(function (resolver) { setTimeout(resolver, ms); });
  }

  /* cargar() debe resolver { ok, sinRed }: se repite mientras sinRed
     sea true y queden esperas. */
  function conReintentos(cargar) {
    function intento(indice) {
      return cargar().then(function (resultado) {
        if (resultado.sinRed && indice < ESPERAS_REINTENTO.length) {
          return esperar(ESPERAS_REINTENTO[indice]).then(function () {
            return intento(indice + 1);
          });
        }
        return resultado;
      });
    }
    return intento(0);
  }

  /* ── CATALOGOS (cache en memoria) ──────────────────── */
  var cache = { tipos: null, edificios: null, pisos: {}, remotos: null };
  var cacheDocentes = null;

  function normalizar(txt) {
    return String(txt === null || txt === undefined ? '' : txt)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /* Los catalogos devuelven:
     - la lista, si el backend respondio bien
     - false,  si el backend respondio con error (token vencido, 500...)
     - null,   si el backend no respondio (apagado o sin red)          */
  function tiposEspacio() {
    if (cache.tipos) return Promise.resolve(cache.tipos);
    return solicitar('GET', '/catalogos/tipos-espacio').then(function (r) {
      if (r.estado === 0) return null;
      if (!r.ok) return false;
      cache.tipos = (r.json && r.json.tiposEspacio) || [];
      return cache.tipos;
    });
  }

  function edificios() {
    if (cache.edificios) return Promise.resolve(cache.edificios);
    return solicitar('GET', '/edificios').then(function (r) {
      if (r.estado === 0) return null;
      if (!r.ok) return false;
      cache.edificios = (r.json && r.json.edificios) || [];
      return cache.edificios;
    });
  }

  function pisosDe(idEdificio) {
    if (cache.pisos[idEdificio]) return Promise.resolve(cache.pisos[idEdificio]);
    return solicitar('GET', '/edificios/' + idEdificio + '/pisos').then(function (r) {
      if (r.estado === 0) return null;
      if (!r.ok) return false;
      cache.pisos[idEdificio] = (r.json && r.json.pisos) || [];
      return cache.pisos[idEdificio];
    });
  }

  /* ── ESPACIOS DEL BACKEND (fuente de verdad) ───────── */
  /* El backend guarda lat/lng reales; el plano es esquematico 800x600,
     asi que se invierte la formula de coordenadas() alrededor del
     edificio para recuperar la posicion en el plano */
  function posicionEnPlano(punto, edificio) {
    var lat = edificio && edificio.latitud !== null && edificio.latitud !== undefined
      ? Number(edificio.latitud) : -16.541;
    var lng = edificio && edificio.longitud !== null && edificio.longitud !== undefined
      ? Number(edificio.longitud) : -68.085;
    var x = 400 + (Number(punto.longitud) - lng) / ESCALA_PLANO;
    var y = 300 - (Number(punto.latitud) - lat) / ESCALA_PLANO;
    return {
      x: Math.round(Math.max(15, Math.min(785, x))),
      y: Math.round(Math.max(15, Math.min(585, y)))
    };
  }

  function horarioTexto(horarios) {
    if (!horarios || !horarios.length) return '';
    var h = horarios[0];
    for (var i = 0; i < horarios.length; i++) {
      if (horarios[i].diaSemana === 'lunes') { h = horarios[i]; break; }
    }
    return String(h.horaApertura || '').substr(0, 5) + '-' + String(h.horaCierre || '').substr(0, 5);
  }

  /* El backend solo tiene los pisos sembrados; el frontend usa la
     numeracion real de cada torre (TA 4..17, TI 0,4,6..11). Se
     traduce al piso real mas cercano para que el espacio aparezca
     en una planta existente del plano */
  function pisoReal(numeroPiso, numeroTorre) {
    var edificiosFront = (UniMap.datos && UniMap.datos.edificios) || [];
    var pisos = [];
    var i;
    for (i = 0; i < edificiosFront.length; i++) {
      if (edificiosFront[i].id === numeroTorre) pisos = edificiosFront[i].pisos || [];
    }
    if (!pisos.length) return Number(numeroPiso) || 0;
    var n = Number(numeroPiso);
    var mejor = pisos[0];
    for (i = 1; i < pisos.length; i++) {
      if (Math.abs(pisos[i] - n) < Math.abs(mejor - n)) mejor = pisos[i];
    }
    return mejor;
  }

  /* Un espacio del backend -> la forma que usa el frontend */
  function convertirRemoto(esp, listaEdificios) {
    if (!esp || !esp.idEspacio) return null;
    var codigo = esp.edificio ? String(esp.edificio.codigoEdificio || '').toUpperCase() : '';
    var numeroTorre = codigo === 'B' ? 2 : 1;
    var edificioBase = mapearEdificio(numeroTorre, listaEdificios) || null;

    var x = 400;
    var y = 300;
    if (esp.latitud !== null && esp.latitud !== undefined &&
        esp.longitud !== null && esp.longitud !== undefined) {
      var pos = posicionEnPlano(esp, edificioBase);
      x = pos.x;
      y = pos.y;
    }

    var tipo = 'oficina';
    if (esp.tipoEspacio && esp.tipoEspacio.nombreTipoEspacio) {
      var nombreTipo = normalizar(esp.tipoEspacio.nombreTipoEspacio);
      tipo = TIPO_INVERSO[nombreTipo] || nombreTipo;
    }

    return {
      id: 'b' + esp.idEspacio,
      idBackend: esp.idEspacio,
      nombre: esp.nombreEspacio,
      tipo: tipo,
      categoria: null,     /* los ids de categoria del backend no coinciden
                              con los numeritos del frontend: se ignora */
      subtipo: (esp.laboratorio && esp.laboratorio.tipoLaboratorio)
        ? normalizar(esp.laboratorio.tipoLaboratorio.nombreTipoLaboratorio) : null,
      edificio: numeroTorre,
      piso: pisoReal(esp.piso ? Number(esp.piso.numeroPiso) : 0, numeroTorre),
      x: x, y: y, ancho: 170, alto: 60,
      capacidad: (esp.aula && esp.aula.capacidadAula) || 0,
      estado: esp.estaActivo === false ? 'inactivo' : 'activo',
      docente: null,
      horarioAtencion: horarioTexto(esp.horarios),
      telefono: esp.contactoEspacio || ''
    };
  }

  /* Pide todos los espacios del backend (activos e inactivos) y los
     deja en cache con la forma del frontend. Usa la cache del servidor
     (600 s): las escrituras del panel admin invalidan esa cache en el
     backend (middleware cache.invalidar), asi que no hace falta pedir
     la lista sin cache en cada carga (antes eso costaba ~3 s de BD
     remota siempre). Si el backend aun no responde, reintenta solo.
     Resuelve true si quedaron cargados; false si no hay backend */
  function cargarEspaciosRemotos() {
    if (!activa()) return Promise.resolve(false);
    return conReintentos(function () {
      return Promise.all([
        solicitar('GET', '/espacios?incluirInactivos=1'),
        edificios()
      ]).then(function (res) {
        var respuesta = res[0];
        var listaEdificios = res[1];
        /* Sin respuesta (backend apagado o arrancando): reintentar */
        if (respuesta.estado === 0 || listaEdificios === null) {
          return { ok: false, sinRed: true };
        }
        if (!listaEdificios || !listaEdificios.length) return { ok: false, sinRed: false };
        /* GET /api/espacios es una resource collection de Laravel: viene
           envuelta en {data:[...]}. Se acepta tambien un array plano, por
           si cambia la forma del backend. Ojo: sin resolver esto el plano
           quedaba vacio y salia el aviso "mapa.sinBackend" aunque el
           backend respondiera 200. */
        var cuerpo = respuesta.json;
        var lista = Array.isArray(cuerpo) ? cuerpo
          : (cuerpo && Array.isArray(cuerpo.data) ? cuerpo.data : null);
        if (!respuesta.ok || !lista) {
          cache.remotos = null;
          return { ok: false, sinRed: false };
        }
        var convertidos = [];
        for (var i = 0; i < lista.length; i++) {
          var original = lista[i];
          /* Solo los edificios A y B: el frontend conoce dos torres
             (la C y la biblioteca del seeder no tienen plano) */
          var cod = original && original.edificio
            ? String(original.edificio.codigoEdificio || '').toUpperCase() : '';
          if (cod !== 'A' && cod !== 'B') continue;
          var esp = convertirRemoto(original, listaEdificios);
          if (esp) convertidos.push(esp);
        }
        cache.remotos = convertidos;
        /* Traer tambien los docentes (una sola vez) y vincularlos */
        cargarDocentes();
        return { ok: true, sinRed: false };
      });
    }).then(function (resultado) { return resultado.ok; });
  }

  function espaciosRemotos() { return cache.remotos; }
  function remotosListos() { return cache.remotos !== null; }

  /* ── DOCENTES (panel de horarios, HU consulta de docentes) ──
     La lista vive en el backend (GET /api/docentes, sembrada por
     DocenteSeeder): aqui se traduce a la forma que usan la web
     (busqueda, tooltip y el panel de horarios de mapa.html). */
  function convertirDocente(d) {
    var horario = {};
    var turnos = (d && d.horarios) || [];
    var i;
    for (i = 0; i < turnos.length; i++) {
      var indice = DIAS_SEMANA.indexOf(String(turnos[i].diaSemana || '').toLowerCase());
      if (indice === -1) continue;
      if (!horario[indice]) horario[indice] = [];
      horario[indice].push(
        String(turnos[i].horaInicio || '').substr(0, 5) + '-' +
        String(turnos[i].horaFin || '').substr(0, 5)
      );
    }

    var nombre = (d.nombreCompleto || '').trim();
    if (!nombre && d.nombre) {
      nombre = [d.nombre, d.apellidoPaterno, d.apellidoMaterno]
        .filter(function (p) { return p; }).join(' ');
    }

    return {
      id: 'd' + d.idDocente,
      idDocente: d.idDocente,
      nombre: nombre,
      departamento: d.departamentoDocente || '',
      correo: d.correoUsuario || '',
      idEspacioOficina: d.idEspacioOficina || null,
      nombreEspacioOficina: d.nombreEspacioOficina || '',
      horario: horario
    };
  }

  /* Vincula a cada docente con su espacio del plano (la oficina o el
     aula donde atiende, idEspacioOficina): es el enlace que usan la
     busqueda, el tooltip y el panel de horarios para saltar al sitio. */
  function vincularDocentes() {
    var remotos = cache.remotos;
    if (!cacheDocentes || !remotos) return;

    var i, j;
    for (i = 0; i < remotos.length; i++) remotos[i].docente = null;
    for (i = 0; i < cacheDocentes.length; i++) {
      var docente = cacheDocentes[i];
      if (!docente.idEspacioOficina) continue;
      for (j = 0; j < remotos.length; j++) {
        if (String(remotos[j].idBackend) === String(docente.idEspacioOficina)) {
          remotos[j].docente = docente.id;
          break;
        }
      }
    }
  }

  /* Pide la lista de docentes al backend (una sola vez por sesion).
     Con el backend apagado no hay datos: el panel queda vacio, igual
     que el plano (cero docentes inventados en el navegador). */
  function cargarDocentes() {
    if (!activa()) return Promise.resolve(false);
    if (cacheDocentes) return Promise.resolve(true);

    return conReintentos(function () {
      return solicitar('GET', '/docentes').then(function (r) {
        if (r.estado === 0) return { ok: false, sinRed: true };
        if (!r.ok || !r.json || !Array.isArray(r.json.docentes)) {
          return { ok: false, sinRed: false };
        }

        cacheDocentes = r.json.docentes.map(convertirDocente);
        /* busqueda, tooltip y el panel de horarios leen UniMap.datos.docentes */
        UniMap.datos.docentes = cacheDocentes;
        vincularDocentes();

        /* Si el plano ya estaba pintado, refrescarlo con el vinculo
           docente <-> espacio recien establecido */
        if (remotosListos() && UniMap.personalizacion && UniMap.personalizacion.reconstruir) {
          UniMap.personalizacion.reconstruir();
        }
        return { ok: true, sinRed: false };
      });
    }).then(function (resultado) { return resultado.ok; });
  }

  function docentes() { return cacheDocentes || []; }

  /* ── TRADUCCION frontend -> backend ────────────────── */
  function mapearTipo(tipoFront, listaTipos) {
    if (!listaTipos.length) return null;
    var buscado = normalizar(TIPO_MAPA[tipoFront] || tipoFront);
    var i;
    for (i = 0; i < listaTipos.length; i++) {
      if (normalizar(listaTipos[i].nombreTipoEspacio) === buscado) return listaTipos[i].idTipoEspacio;
    }
    /* coincidencia parcial: 'deportivo' dentro de 'areaDeportiva' */
    for (i = 0; i < listaTipos.length; i++) {
      var nombre = normalizar(listaTipos[i].nombreTipoEspacio);
      if (nombre.indexOf(buscado) !== -1 || buscado.indexOf(nombre) !== -1) {
        return listaTipos[i].idTipoEspacio;
      }
    }
    return listaTipos[0].idTipoEspacio;
  }

  /* Torre 1 (Torre Antigua) -> Edificio A, Torre 2 (Torre Innovacion)
     -> Edificio B; si los codigos no estan, se usa el orden alfabetico */
  function mapearEdificio(numeroTorre, listaEdificios) {
    if (!listaEdificios.length) return null;
    var codigo = Number(numeroTorre) === 2 ? 'B' : 'A';
    var i;
    for (i = 0; i < listaEdificios.length; i++) {
      var cod = String(listaEdificios[i].codigoEdificio || '').toUpperCase();
      if (cod === codigo) return listaEdificios[i];
    }
    var orden = listaEdificios.slice().sort(function (a, b) {
      return String(a.nombreEdificio).localeCompare(String(b.nombreEdificio));
    });
    return orden[Number(numeroTorre) === 2 ? 1 : 0] || orden[0];
  }

  /* El backend solo tiene los pisos sembrados (1..N); si el piso del
     frontend no existe se usa el mas cercano para no romper la
     validacion exists:pisos,idPiso */
  function mapearPiso(numeroPisoFront, listaPisos) {
    if (!listaPisos.length) return null;
    var i;
    for (i = 0; i < listaPisos.length; i++) {
      if (Number(listaPisos[i].numeroPiso) === Number(numeroPisoFront)) return listaPisos[i];
    }
    var mejor = listaPisos[0];
    var distancia = Math.abs(Number(mejor.numeroPiso) - Number(numeroPisoFront));
    for (i = 1; i < listaPisos.length; i++) {
      var d = Math.abs(Number(listaPisos[i].numeroPiso) - Number(numeroPisoFront));
      if (d < distancia) { distancia = d; mejor = listaPisos[i]; }
    }
    return mejor;
  }

  /* '07:00-21:00' -> [{diaSemana, horaApertura, horaCierre}...]  */
  function horariosDe(horarioAtencion) {
    if (!horarioAtencion) return [];   /* sin horario: limpia los del backend */
    var m = /^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/.exec(horarioAtencion);
    if (!m) return null;               /* formato desconocido: no tocar horarios */
    function rellena(h) { return h.length === 1 ? '0' + h : h; }
    var apertura = rellena(m[1]) + ':' + m[2];
    var cierre = rellena(m[3]) + ':' + m[4];
    var lista = [];
    for (var i = 0; i < DIAS_SEMANA.length; i++) {
      lista.push({ diaSemana: DIAS_SEMANA[i], horaApertura: apertura, horaCierre: cierre });
    }
    return lista;
  }

  function coordenadas(espacio, edificio) {
    var lat = edificio && edificio.latitud !== null && edificio.latitud !== undefined
      ? Number(edificio.latitud) : -16.541;
    var lng = edificio && edificio.longitud !== null && edificio.longitud !== undefined
      ? Number(edificio.longitud) : -68.085;
    var x = espacio.x !== undefined && espacio.x !== null ? Number(espacio.x) : 400;
    var y = espacio.y !== undefined && espacio.y !== null ? Number(espacio.y) : 300;
    return {
      latitud: Number((lat + (300 - y) * ESCALA_PLANO).toFixed(6)),
      longitud: Number((lng + (x - 400) * ESCALA_PLANO).toFixed(6))
    };
  }

  function construirPayload(espacio, esAlta) {
    return Promise.all([tiposEspacio(), edificios()]).then(function (datos) {
      if (datos[0] === null || datos[1] === null) return { sinBackend: true };
      if (datos[0] === false || datos[1] === false) return { sinSesion: true };
      var listaTipos = datos[0];
      var listaEdificios = datos[1];
      var edificio = mapearEdificio(espacio.edificio, listaEdificios);
      if (!edificio || !listaTipos.length) return null;

      return pisosDe(edificio.idEdificio).then(function (listaPisos) {
        if (listaPisos === null) return { sinBackend: true };
        if (listaPisos === false) return { sinSesion: true };
        var piso = mapearPiso(espacio.piso, listaPisos);
        var tipo = mapearTipo(espacio.tipo, listaTipos);
        if (!piso || !tipo) return null;

        var punto = coordenadas(espacio, edificio);
        var payload = {
          idEdificio: edificio.idEdificio,
          idPiso: piso.idPiso,
          idTipoEspacio: tipo,
          nombreEspacio: espacio.nombre,
          contactoEspacio: espacio.telefono || null,
          latitud: punto.latitud,
          longitud: punto.longitud,
          estaActivo: espacio.estado !== 'inactivo'
        };

        var horarios = horariosDe(espacio.horarioAtencion);
        if (horarios !== null) payload.horarios = horarios;

        if (esAlta) {
          payload.descripcionEspacio = edificio.nombreEdificio + ' - ' + piso.nombrePiso;
        }
        return payload;
      });
    });
  }

  /* ── MAPA local id -> idEspacio backend ────────────── */
  function mapa() { return util.almacen.leer(LLAVE_MAPA, {}); }
  /* El id visible de un espacio del backend ya es 'b{id}': si no hay
     relacion explicita se toma el numero de ese prefijo */
  function idDeBackend(idLocal) {
    var m = mapa();
    if (m[idLocal]) return m[idLocal];
    var can = /^b(\d+)$/.exec(String(idLocal || ''));
    return can ? can[1] : null;
  }
  function idLocalDe(idBackend) {
    if (idBackend === null || idBackend === undefined) return null;
    var m = mapa();
    for (var k in m) if (m.hasOwnProperty(k) && String(m[k]) === String(idBackend)) return k;
    /* Sin relacion explicita el id local canonico es 'b{id}' */
    return 'b' + idBackend;
  }
  function guardarRelacion(idLocal, idBackend) {
    var m = mapa();
    if (idBackend) m[idLocal] = idBackend;
    else delete m[idLocal];
    util.almacen.escribir(LLAVE_MAPA, m);
  }

  function buscarEspacioLocal(idLocal) {
    var lista = (UniMap.estado && UniMap.estado.todosLosEspacios) || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === idLocal) return lista[i];
    return null;
  }

  /* ── COLA DE PENDIENTES (backend apagado) ──────────── */
  function pendientes() { return util.almacen.leer(LLAVE_PENDIENTES, []); }

  function encolar(operacion) {
    var lista = pendientes();
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].accion === operacion.accion && lista[i].idLocal === operacion.idLocal) return;
    }
    lista.push({ accion: operacion.accion, idLocal: operacion.idLocal, fecha: Date.now() });
    util.almacen.escribir(LLAVE_PENDIENTES, lista.slice(-30));
  }

  function quitarPendiente(operacion) {
    var lista = pendientes().filter(function (op) {
      return !(op.accion === operacion.accion && op.idLocal === operacion.idLocal);
    });
    util.almacen.escribir(LLAVE_PENDIENTES, lista);
  }

  /* Reintenta la cola; candado de 10 s para evitar dobles procesos */
  function procesarPendientes() {
    if (!activa() || !token()) return Promise.resolve(0);
    var lista = pendientes();
    if (!lista.length) return Promise.resolve(0);

    var ahora = Date.now();
    var ultimo = util.almacen.leer(LLAVE_CANDADO, 0);
    if (ahora - ultimo < 10000) return Promise.resolve(0);
    util.almacen.escribir(LLAVE_CANDADO, ahora);

    var hechos = 0;
    var cadena = Promise.resolve();
    lista.forEach(function (op) {
      cadena = cadena.then(function () {
        var promesa = op.accion === 'eliminar'
          ? sincronizarBaja(op.idLocal)
          : sincronizarEspacio(op.idLocal);
        return promesa.then(function (r) {
          /* ok o espacio ya inexistente localmente: fuera de la cola */
          if (r.ok || r.motivo === 'desconocido') { quitarPendiente(op); hechos++; }
        });
      });
    });
    return cadena.then(function () { return hechos; });
  }

  /* ── SINCRONIZACION DE ESPACIOS ────────────────────── */
  /* Resuelve { ok, motivo }:
     ok | pendiente (se encolo) | sin-sesion | sin-backend | traduccion | api */
  function sincronizarEspacio(idLocal) {
    if (!activa()) return Promise.resolve({ ok: false, motivo: 'sin-backend' });
    if (!token()) return Promise.resolve({ ok: false, motivo: 'sin-sesion' });

    var espacio = buscarEspacioLocal(idLocal);
    if (!espacio) return Promise.resolve({ ok: false, motivo: 'desconocido' });

    var idBackend = idDeBackend(idLocal);
    var esAlta = !idBackend;
    return construirPayload(espacio, esAlta).then(function (payload) {
      /* Backend apagado o sin red: encolar para reintentar despues */
      if (payload && payload.sinBackend) {
        encolar({ accion: esAlta ? 'crear' : 'actualizar', idLocal: idLocal });
        return { ok: false, motivo: 'pendiente' };
      }
      if (payload && payload.sinSesion) return { ok: false, motivo: 'sin-sesion' };
      if (!payload) return { ok: false, motivo: 'traduccion' };

      var ruta = esAlta ? '/admin/espacios' : '/admin/espacios/' + idBackend;
      return solicitar(esAlta ? 'POST' : 'PUT', ruta, payload).then(function (r) {
        if (r.ok) {
          if (esAlta && r.json && r.json.espacio && r.json.espacio.idEspacio) {
            guardarRelacion(idLocal, r.json.espacio.idEspacio);
          }
          return { ok: true };
        }
        /* 404: el registro ya no existe en el backend -> volver a crear */
        if (r.estado === 404 && idBackend) {
          guardarRelacion(idLocal, null);
          return sincronizarEspacio(idLocal);
        }
        if (r.estado === 0) {
          encolar({ accion: esAlta ? 'crear' : 'actualizar', idLocal: idLocal });
          return { ok: false, motivo: 'pendiente' };
        }
        if (r.estado === 401 || r.estado === 403) return { ok: false, motivo: 'sin-sesion' };
        return { ok: false, motivo: 'api', estado: r.estado, mensaje: r.json && r.json.mensaje };
      });
    });
  }

  function sincronizarBaja(idLocal) {
    if (!activa()) return Promise.resolve({ ok: false, motivo: 'sin-backend' });
    if (!token()) return Promise.resolve({ ok: false, motivo: 'sin-sesion' });

    var idBackend = idDeBackend(idLocal);
    if (!idBackend) return Promise.resolve({ ok: true, motivo: 'sin-registro' });

    return solicitar('DELETE', '/admin/espacios/' + idBackend).then(function (r) {
      if (r.ok || r.estado === 404) {
        guardarRelacion(idLocal, null);
        return { ok: true };
      }
      if (r.estado === 0) {
        encolar({ accion: 'eliminar', idLocal: idLocal });
        return { ok: false, motivo: 'pendiente' };
      }
      if (r.estado === 401 || r.estado === 403) return { ok: false, motivo: 'sin-sesion' };
      return { ok: false, motivo: 'api', estado: r.estado, mensaje: r.json && r.json.mensaje };
    });
  }

  /* ── AUTENTICACION ─────────────────────────────────── */
  function iniciarSesion(correo, contrasena) {
    return solicitar('POST', '/auth/login', {
      correoUsuario: correo,
      contrasena: contrasena
    }).then(function (r) {
      if (r.ok && r.json && r.json.tokenAcceso) {
        guardarToken(r.json.tokenAcceso);
        return { ok: true, usuario: r.json.usuario };
      }
      return { ok: false, estado: r.estado, mensaje: r.json && r.json.mensaje };
    });
  }

  function registrarse(datos) {
    var cuerpo = {
      nombreUsuario: datos.nombre,
      correoUsuario: datos.correo,
      contrasena: datos.contrasena
    };
    /* Los apellidos van separados (3FN); si el formulario los mando
       en un solo campo el backend los divide solo */
    if (datos.apellidoPaterno) cuerpo.apellidoPaternoUsuario = datos.apellidoPaterno;
    if (datos.apellidoMaterno) cuerpo.apellidoMaternoUsuario = datos.apellidoMaterno;
    return solicitar('POST', '/auth/registro', cuerpo).then(function (r) {
      if (r.ok && r.json && r.json.tokenAcceso) {
        guardarToken(r.json.tokenAcceso);
        return { ok: true, usuario: r.json.usuario };
      }
      return { ok: false, estado: r.estado, mensaje: r.json && r.json.mensaje };
    });
  }

  function cerrarSesionBackend() {
    var tk = token();
    if (!tk) return;
    solicitar('POST', '/auth/logout').then(function () { quitarToken(); });
    quitarToken(); /* de inmediato: aunque falle, la sesion local se cierra */
  }

  /* ── REINTENTO AUTOMATICO AL CARGAR LA pagina ─────── */
  if (activa() && token() && pendientes().length) {
    setTimeout(function () { procesarPendientes(); }, 4000);
  }

  UniMap.api = {
    activa: activa,
    token: token,
    guardarToken: guardarToken,
    quitarToken: quitarToken,
    solicitar: solicitar,
    sincronizarEspacio: sincronizarEspacio,
    sincronizarBaja: sincronizarBaja,
    procesarPendientes: procesarPendientes,
    pendientes: pendientes,
    encolar: encolar,
    idDeBackend: idDeBackend,
    idLocalDe: idLocalDe,
    guardarRelacion: guardarRelacion,
    cargarEspaciosRemotos: cargarEspaciosRemotos,
    espaciosRemotos: espaciosRemotos,
    remotosListos: remotosListos,
    cargarDocentes: cargarDocentes,
    docentes: docentes,
    iniciarSesion: iniciarSesion,
    registrarse: registrarse,
    cerrarSesionBackend: cerrarSesionBackend
  };
})();
