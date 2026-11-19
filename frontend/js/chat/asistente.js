/* =========================================================
   chat/asistente.js — Asistente virtual de UniMap (ML en el navegador)
   · Clasificador de intenciones: Naive Bayes multinomial con
     suavizado de Laplace, entrenado al cargar la pagina con los
     ejemplos de abajo (sin librerias ni servidores externos).
   · Extraccion de entidades: busca espacios y docentes reales del
     campus (UniMap.estado.todosLosEspacios / UniMap.datos.docentes)
     por coincidencia de palabras.
   · Acciones: "Ver en el mapa" (UniMap.ui.irAEspacio) y
     "Trazar ruta" (UniMap.ruta.trazar).
   Para mejorarlo basta con agregar frases a ENTRENAMIENTO.
   ========================================================= */
(function () {
  'use strict';
  var UniMap = window.UniMap;
  if (!UniMap) return;

  /* ── DATOS DE ENTRENAMIENTO ─────────────────────────── */
  var ENTRENAMIENTO = {
    saludo: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'que tal', 'saludos', 'holi', 'buenas'],
    despedida: ['adios', 'chau', 'hasta luego', 'nos vemos', 'bye', 'hasta pronto', 'me voy'],
    gracias: ['gracias', 'muchas gracias', 'te agradezco', 'genial gracias', 'perfecto gracias', 'ok gracias', 'mil gracias'],
    ayuda: ['ayuda', 'que puedes hacer', 'como funcionas', 'que sabes hacer', 'en que me ayudas', 'ayudame', 'para que sirves', 'comandos', 'opciones'],
    identidad: ['quien eres', 'como te llamas', 'cual es tu nombre', 'eres un robot', 'eres una inteligencia artificial', 'que eres'],
    ubicar: ['donde esta', 'donde queda', 'donde encuentro', 'ubicacion de', 'en que piso esta', 'en que torre esta', 'busco el', 'busco la', 'muestrame', 'ubicame', 'localiza', 'en donde esta', 'donde puedo encontrar', 'llevame a ver'],
    ruta: ['como llego a', 'como llegar a', 'ruta a', 'ruta hacia', 'llevame a', 'quiero ir a', 'como voy a', 'camino a', 'indicame como llegar', 'trazame la ruta', 'guiame a', 'direcciones a', 'como se va a'],
    docente: ['donde esta la oficina del docente', 'busco al profesor', 'donde atiende el docente', 'oficina del ingeniero', 'quien es el docente', 'busco a la licenciada', 'donde esta el profe', 'oficina del profesor', 'docente'],
    horario: ['horario de', 'que horario tiene', 'cuando atiende', 'a que hora atiende', 'a que hora abre', 'a que hora cierra', 'horarios de atencion', 'cuando tiene clases', 'horario del docente'],
    abierto: ['esta abierto', 'esta abierta', 'esta cerrado', 'esta cerrada', 'puedo ir ahora', 'atiende ahora', 'abierto ahora', 'hay atencion hoy'],
    listar: ['que laboratorios hay', 'lista de aulas', 'que oficinas hay', 'cuantos laboratorios hay', 'que auditorios hay', 'donde hay comedor', 'donde puedo comer', 'hay biblioteca', 'donde estan los banos', 'donde hay un ascensor', 'que canchas hay', 'lista los', 'cuales son los', 'muestrame todos los', 'hay area deportiva']
  };

  var STOP = ('el la los las un una unos unas de del al a en y o que es esta estan queda quedan donde como llego llegar ir voy ' +
    'quiero me mi tu te se por para con sobre hay tiene hora horario atiende atencion ruta camino puedo puede ' +
    'cual cuales quien busco buscar muestrame mostrar llevame ubicacion piso torre ahora hoy favor porfa por favor ' +
    'oficina del docente profesor profe ingeniero ing lic licenciada licenciado dr dra doctor doctora ' +
    'abierto abierta cerrado cerrada lista todos todas').split(' ');
  var STOPSET = {};
  STOP.forEach(function (w) { STOPSET[w] = true; });

  function normalizar(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function tokens(s) { var n = normalizar(s); return n ? n.split(' ') : []; }
  function stem(w) {
    if (w.length > 4 && /es$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function rasgos(s) {
    var t = tokens(s).map(stem), r = t.slice(), i;
    for (i = 0; i < t.length - 1; i++) r.push(t[i] + '_' + t[i + 1]);   /* bigramas */
    return r;
  }

  /* ── NAIVE BAYES ────────────────────────────────────── */
  var modelo = { clases: {}, vocab: {}, nVocab: 0, total: 0 };
  function entrenar() {
    Object.keys(ENTRENAMIENTO).forEach(function (c) {
      var cl = modelo.clases[c] = { docs: 0, palabras: 0, cuenta: {} };
      ENTRENAMIENTO[c].forEach(function (frase) {
        cl.docs++; modelo.total++;
        rasgos(frase).forEach(function (w) {
          cl.cuenta[w] = (cl.cuenta[w] || 0) + 1; cl.palabras++;
          if (!modelo.vocab[w]) { modelo.vocab[w] = 1; modelo.nVocab++; }
        });
      });
    });
  }
  function clasificar(texto) {
    var f = rasgos(texto), conocidos = f.filter(function (w) { return modelo.vocab[w]; });
    if (!conocidos.length) return { intencion: null, confianza: 0 };
    var logs = {}, max = -Infinity, c;
    for (c in modelo.clases) {
      var cl = modelo.clases[c], lp = Math.log(cl.docs / modelo.total);
      conocidos.forEach(function (w) {
        lp += Math.log(((cl.cuenta[w] || 0) + 1) / (cl.palabras + modelo.nVocab));
      });
      logs[c] = lp; if (lp > max) max = lp;
    }
    var suma = 0, mejor = null;
    for (c in logs) { logs[c] = Math.exp(logs[c] - max); suma += logs[c]; }
    var pm = 0;
    for (c in logs) { var p = logs[c] / suma; if (p > pm) { pm = p; mejor = c; } }
    return { intencion: mejor, confianza: pm };
  }

  /* ── ENTIDADES (espacios y docentes reales) ─────────── */
  function espacios() { return (UniMap.estado && UniMap.estado.todosLosEspacios) || []; }
  function docentes() { return (UniMap.datos && UniMap.datos.docentes) || []; }

  function puntuar(consulta, nombre) {
    var q = tokens(consulta).filter(function (w) { return !STOPSET[w]; });
    var n = tokens(nombre).filter(function (w) { return !STOPSET[w]; });
    if (!q.length || !n.length) return 0;
    var aciertos = 0;
    q.forEach(function (w) {
      for (var i = 0; i < n.length; i++) {
        if (n[i] === w || (w.length >= 4 && (n[i].indexOf(w) === 0 || w.indexOf(n[i]) === 0 && n[i].length >= 4))) { aciertos++; break; }
      }
    });
    if (!aciertos) return 0;
    return (aciertos / q.length) * 0.6 + (aciertos / n.length) * 0.4;
  }
  function mejoresEspacios(consulta, max) {
    return espacios().map(function (e) { return { e: e, s: puntuar(consulta, e.nombre) }; })
      .filter(function (x) { return x.s >= 0.45; })
      .sort(function (a, b) { return b.s - a.s; }).slice(0, max || 3).map(function (x) { return x.e; });
  }
  function mejorDocente(consulta) {
    var mejor = null, ms = 0;
    docentes().forEach(function (d) {
      var s = puntuar(consulta, d.nombre);
      if (s > ms) { ms = s; mejor = d; }
    });
    return ms >= 0.4 ? mejor : null;
  }
  function espacioDeDocente(d) {
    var lista = espacios();
    for (var i = 0; i < lista.length; i++) if (lista[i].docente === d.id) return lista[i];
    return null;
  }
  var TIPOS = [
    ['laboratorio', /laborator|lab\b/], ['aula', /\baula/], ['salon', /\bsalon/], ['oficina', /oficina/],
    ['biblioteca', /biblioteca/], ['auditorio', /auditori/], ['comedor', /comedor|cafeteria|comer/],
    ['deportivo', /deporti|cancha|gimnasio/]
  ];
  function tipoMencionado(texto) {
    var n = normalizar(texto);
    for (var i = 0; i < TIPOS.length; i++) if (TIPOS[i][1].test(n)) return TIPOS[i][0];
    return null;
  }
  function porNombre(regex) {
    return espacios().filter(function (e) { return regex.test(normalizar(e.nombre)); });
  }

  /* ── HORARIOS ───────────────────────────────────────── */
  function abiertoAhora(texto) {
    var m = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/.exec(texto || '');
    if (!m) return null;
    var ahora = new Date(), min = ahora.getHours() * 60 + ahora.getMinutes();
    return min >= (+m[1] * 60 + +m[2]) && min < (+m[3] * 60 + +m[4]);
  }
  var DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  function horarioDocente(d) {
    var hoy = (new Date().getDay() + 6) % 7, h = d.horario || {}, t = h[hoy] || [];
    var s = hoy > 5 ? 'Hoy es domingo, no hay clases.' : (t.length ? 'Hoy (' + DIAS[hoy] + '): ' + t.join(', ') : 'Hoy (' + DIAS[hoy] + ') no tiene turnos registrados.');
    var otros = [];
    for (var i = 0; i < 6; i++) if (i !== hoy && (h[i] || []).length) otros.push(DIAS[i].substr(0, 3) + ' ' + h[i].join(', '));
    return s + (otros.length ? '\nOtros dias: ' + otros.join(' · ') : '');
  }

  /* ── RESPUESTAS ─────────────────────────────────────── */
  function lugar(e) {
    var torre = e.edificio === 1 ? 'Torre Antigua' : (e.edificio === 2 ? 'Torre Innovación' : 'el campus');
    return torre + ', piso ' + e.piso;
  }
  function acciones(e, ruta) {
    var a = [{ txt: '📍 Ver en el mapa', fn: function () { UniMap.ui.irAEspacio(e.id); } }];
    if (ruta !== false && UniMap.ruta) a.push({ txt: '🧭 Trazar ruta', fn: function () { UniMap.ui.irAEspacio(e.id); UniMap.ruta.trazar(e); } });
    return a;
  }
  function elegirDocenteOEspacio(texto) {
    var d = mejorDocente(texto), e = mejoresEspacios(texto, 3);
    return { d: d, e: e };
  }

  var AYUDA = 'Puedo ayudarte a:\n• Ubicar aulas, laboratorios y oficinas\n• Trazar la ruta para llegar\n• Buscar docentes y su oficina\n• Decirte horarios y si algo está abierto\n• Listar tipos de espacios (laboratorios, comedor, etc.)';

  function responder(texto) {
    var cls = clasificar(texto), intencion = cls.intencion, ent = elegirDocenteOEspacio(texto);
    var tipo = tipoMencionado(texto), n = normalizar(texto);

    /* Reglas que refuerzan al modelo cuando hay entidades claras */
    if ((!intencion || cls.confianza < 0.5) && (ent.d || ent.e.length)) intencion = 'ubicar';
    if (!intencion || cls.confianza < 0.4) {
      if (/\b(ascensor|elevador)\b/.test(n) || /\bban[oi]/.test(n) || tipo) intencion = 'listar';
    }
    if (intencion === 'ubicar' && !ent.d && !ent.e.length && tipo) intencion = 'listar';
    if (intencion === 'docente' && !ent.d && ent.e.length) intencion = 'ubicar';
    if (intencion === 'listar' && ent.d) intencion = 'docente';
    if (intencion === 'listar' && ent.e.length && /\d/.test(n)) intencion = 'ubicar';

    if (!espacios().length && ['ubicar', 'ruta', 'docente', 'horario', 'abierto', 'listar'].indexOf(intencion) > -1) {
      return { texto: 'Todavía estoy cargando los datos del campus. Si el backend está apagado, inícialo con INICIAR-TODO.bat y recarga la página.' };
    }

    switch (intencion) {
      case 'saludo': return { texto: '¡Hola! 👋 Soy Uni, tu asistente del campus. ¿Qué lugar o docente buscas?', chips: ['¿Dónde está la biblioteca?', 'Laboratorios', 'Ayuda'] };
      case 'despedida': return { texto: '¡Hasta luego! Aquí estaré si necesitas orientarte. 👋' };
      case 'gracias': return { texto: '¡Con gusto! ¿Algo más en lo que te ayude?' };
      case 'ayuda': return { texto: AYUDA, chips: ['¿Dónde está la biblioteca?', 'Lista de laboratorios', '¿Cómo llego al comedor?'] };
      case 'identidad': return { texto: 'Soy Uni, el asistente virtual de UniMap. Uso un modelo de aprendizaje automático (Naive Bayes) para entender tus preguntas y consulto los datos reales del campus.' };

      case 'listar': {
        var lista = [];
        if (/\b(ascensor|elevador)/.test(n)) lista = porNombre(/ascensor|elevador/);
        else if (/\bban[oi]/.test(n)) lista = porNombre(/ban[oi]|sshh|servicio/);
        else if (tipo) lista = espacios().filter(function (e) { return e.tipo === tipo; });
        if (!lista.length) return { texto: 'No encontré espacios de ese tipo en el mapa. Prueba con: laboratorios, aulas, oficinas, biblioteca, auditorio, comedor o áreas deportivas.' };
        var muestra = lista.slice(0, 5);
        return {
          texto: 'Encontré ' + lista.length + ' resultado(s)' + (lista.length > 5 ? ' (te muestro 5)' : '') + ':\n' + muestra.map(function (e) { return '• ' + e.nombre + ' — ' + lugar(e); }).join('\n'),
          botones: muestra.map(function (e) { return { txt: '📍 ' + e.nombre, fn: function () { UniMap.ui.irAEspacio(e.id); } }; })
        };
      }

      case 'docente':
      case 'horario':
      case 'abierto':
      case 'ubicar':
      case 'ruta': {
        var d = ent.d, e = ent.e[0] || null, dEsp = d ? espacioDeDocente(d) : null;
        if (d && (intencion === 'docente' || intencion === 'ubicar' || intencion === 'horario' || intencion === 'ruta' || !e)) {
          var t = '👤 ' + d.nombre + (d.departamento ? ' (' + d.departamento + ')' : '');
          if (dEsp) t += '\nOficina: ' + dEsp.nombre + ' — ' + lugar(dEsp);
          else if (d.nombreEspacioOficina) t += '\nOficina: ' + d.nombreEspacioOficina;
          if (intencion === 'horario' || intencion === 'abierto') t += '\n' + horarioDocente(d);
          return { texto: t, botones: dEsp ? acciones(dEsp) : null };
        }
        if (!e) {
          return { texto: 'No encontré ese lugar o docente. Prueba con el nombre como aparece en el mapa (por ejemplo "Laboratorio de Redes" o "Aula 301").', chips: ['Lista de laboratorios', 'Ayuda'] };
        }
        var r = '📌 ' + e.nombre + '\n' + lugar(e);
        if (e.horarioAtencion) {
          r += '\nHorario: ' + e.horarioAtencion;
          var ab = abiertoAhora(e.horarioAtencion);
          if (ab !== null && (intencion === 'abierto' || intencion === 'horario')) r += ab ? '\n✅ Está abierto ahora.' : '\n⛔ Ahora está cerrado.';
        } else if (intencion === 'abierto' || intencion === 'horario') r += '\nNo tengo horario registrado para este espacio.';
        if (e.capacidad) r += '\nCapacidad: ' + e.capacidad + ' personas';
        if (ent.e.length > 1) r += '\n\nTambién podrías referirte a: ' + ent.e.slice(1).map(function (x) { return x.nombre; }).join(', ');
        var bots = acciones(e);
        if (intencion === 'ruta') { bots.reverse(); }
        return { texto: r, botones: bots };
      }
      default:
        return { texto: 'No estoy seguro de haber entendido 🤔. Puedes preguntarme por un lugar, un docente o un horario.', chips: ['Ayuda', 'Lista de laboratorios'] };
    }
  }

  /* ── AVATAR (SVG) ───────────────────────────────────── */
  function avatarSVG(id) {
    return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs><linearGradient id="ug' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60A5FA"/><stop offset="1" stop-color="#1E40AF"/></linearGradient></defs>' +
      '<line x1="32" y1="6" x2="32" y2="14" stroke="#1E3A8A" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="5" r="3.5" fill="#FBBF24"/>' +
      '<rect x="10" y="14" width="44" height="40" rx="16" fill="url(#ug' + id + ')"/>' +
      '<rect x="16" y="22" width="32" height="22" rx="10" fill="#EFF6FF"/>' +
      '<g class="uni-ojos"><ellipse cx="25" cy="33" rx="3.4" ry="4.4" fill="#1E3A8A"/><ellipse cx="39" cy="33" rx="3.4" ry="4.4" fill="#1E3A8A"/>' +
      '<circle cx="26.2" cy="31.6" r="1.1" fill="#fff"/><circle cx="40.2" cy="31.6" r="1.1" fill="#fff"/></g>' +
      '<path class="uni-boca" d="M26 40 Q32 45 38 40" fill="none" stroke="#1E3A8A" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="19" cy="40" r="2.4" fill="#FCA5A5" opacity=".7"/><circle cx="45" cy="40" r="2.4" fill="#FCA5A5" opacity=".7"/>' +
      '<rect x="6" y="28" width="5" height="12" rx="2.5" fill="#1E3A8A"/><rect x="53" y="28" width="5" height="12" rx="2.5" fill="#1E3A8A"/></svg>';
  }

  /* ── INTERFAZ ───────────────────────────────────────── */
  var raiz, panel, lista, campo, boton, escribiendoEl, abierto = false;

  function el(tag, cls, html) { var x = document.createElement(tag); if (cls) x.className = cls; if (html != null) x.innerHTML = html; return x; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bajar() { lista.scrollTop = lista.scrollHeight; }

  function burbuja(texto, quien) {
    var fila = el('div', 'uni-fila uni-' + quien);
    if (quien === 'bot') fila.appendChild(el('div', 'uni-mini', avatarSVG('m' + Date.now() % 1e6)));
    fila.appendChild(el('div', 'uni-burbuja', esc(texto).replace(/\n/g, '<br>')));
    lista.appendChild(fila); bajar();
    return fila;
  }
  function agregarAcciones(fila, resp) {
    var cont = el('div', 'uni-acciones');
    (resp.botones || []).forEach(function (b) {
      var x = el('button', 'uni-accion', esc(b.txt)); x.type = 'button';
      x.addEventListener('click', function () { try { b.fn(); } catch (e) { /* ignorar */ } if (window.innerWidth < 640) alternar(false); });
      cont.appendChild(x);
    });
    (resp.chips || []).forEach(function (c) {
      var x = el('button', 'uni-chip', esc(c)); x.type = 'button';
      x.addEventListener('click', function () { enviar(c); });
      cont.appendChild(x);
    });
    if (cont.children.length) { fila.querySelector('.uni-burbuja').appendChild(cont); bajar(); }
  }
  function hablando(on) { raiz.classList.toggle('uni-hablando', on); }

  function enviar(texto) {
    texto = String(texto || '').trim();
    if (!texto) return;
    burbuja(texto, 'user'); campo.value = '';
    if (escribiendoEl) escribiendoEl.remove();
    escribiendoEl = el('div', 'uni-fila uni-bot', '<div class="uni-mini">' + avatarSVG('t') + '</div><div class="uni-burbuja uni-puntos"><i></i><i></i><i></i></div>');
    lista.appendChild(escribiendoEl); bajar(); hablando(true);
    var resp;
    try { resp = responder(texto); } catch (err) { resp = { texto: 'Ups, algo falló al procesar tu pregunta.' }; }
    setTimeout(function () {
      if (escribiendoEl) { escribiendoEl.remove(); escribiendoEl = null; }
      var fila = burbuja(resp.texto, 'bot'); agregarAcciones(fila, resp); hablando(false);
    }, 450 + Math.min(600, resp.texto.length * 4));
  }

    function alternar(forzar) {
    abierto = typeof forzar === 'boolean' ? forzar : !abierto;
    raiz.classList.toggle('uni-abierto', abierto);
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    if (abierto) {
      if (!lista.children.length) {
        var f = burbuja('¡Hola! Soy Uni 🤖, tu asistente del campus. Pregúntame dónde queda un aula, cómo llegar o el horario de un docente.', 'bot');
        agregarAcciones(f, { chips: ['¿Dónde está la biblioteca?', 'Lista de laboratorios', '¿Qué puedes hacer?'] });
      }
      setTimeout(function () { try { campo.focus(); } catch (e) {} }, 150);
    }
  }

  function iniciar() {
    if (raiz) return;
    entrenar();
    raiz = el('div', 'uni-chat');
    raiz.innerHTML =
      '<section class="uni-panel" role="dialog" aria-label="Asistente virtual Uni">' +
        '<header class="uni-cab"><div class="uni-av">' + avatarSVG('h') + '</div>' +
        '<div class="uni-tit"><strong>Uni</strong><span>Asistente del campus · IA</span></div>' +
        '<button type="button" class="uni-cerrar" aria-label="Cerrar asistente">✕</button></header>' +
        '<div class="uni-lista" aria-live="polite"></div>' +
        '<form class="uni-form" autocomplete="off"><input type="text" class="uni-campo" placeholder="Escribe tu pregunta..." maxlength="200" aria-label="Mensaje">' +
        '<button type="submit" class="uni-enviar" aria-label="Enviar">➤</button></form>' +
      '</section>' +
      '<button type="button" class="uni-boton" aria-label="Abrir asistente virtual" aria-expanded="false" title="Asistente virtual">' + avatarSVG('b') + '<span class="uni-badge">Pregúntame</span></button>';
    document.body.appendChild(raiz);
    panel = raiz.querySelector('.uni-panel'); lista = raiz.querySelector('.uni-lista');
    campo = raiz.querySelector('.uni-campo'); boton = raiz.querySelector('.uni-boton');
    boton.addEventListener('click', function () { alternar(); });
    raiz.querySelector('.uni-cerrar').addEventListener('click', function () { alternar(false); });
    raiz.querySelector('.uni-form').addEventListener('submit', function (e) { e.preventDefault(); enviar(campo.value); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && abierto) alternar(false); });
    setTimeout(function () { var b = raiz.querySelector('.uni-badge'); if (b) b.classList.add('uni-oculto'); }, 9000);
  }

    UniMap.asistente = {
    iniciar: iniciar,
    responder: responder,
    clasificar: clasificar,
    abrir: function () { alternar(true); },
    cerrar: function () { alternar(false); },
    alternar: function (forzar) { alternar(forzar); },
    estaAbierto: function () { return abierto; }
  };if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
