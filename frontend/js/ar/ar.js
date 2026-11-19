/* =========================================================
   ar/ar.js — Realidad aumentada de los disenos 3D

   · Boton "AR" en la barra superior y en el visor 3D.
   · Abre un visor con <model-viewer> (vendor/three/model-viewer.min.js,
     carga perezosa) que permite:
       - girar/zoom del modelo en pantalla
       - "Ver en AR": coloca el modelo sobre el piso con la camara
         del celular (Android: WebXR / Scene Viewer · iOS: Quick Look,
         el USDZ se genera solo a partir del GLB)
   · Lista de modelos: la planta del piso que se esta viendo y
     el resto de plantas, oficinas y la maqueta del edificio.
   · Tamano: "Maqueta" (se reduce para verlo sobre una mesa) o
     "Real" (escala 1:1 para recorrerlo).

   Requisito de AR en el celular: abrir el sitio por HTTPS
   (en la PC solo se puede previsualizar en 3D).
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var estado = UniMap.estado;
  var datos = UniMap.datos;

  var CARPETA = 'models/';
  var SCRIPT = 'vendor/three/model-viewer.min.js';

  /* Modelos GLB disponibles (el FBX de la planta baja no sirve para AR) */
  var MODELOS_EXTRA = [
    { archivo: 'edificio.glb', clave: 'ar.maqueta' },
    { archivo: 'oficinas.glb', clave: 'ar.oficinas' }
  ];
  var NOMBRES_PLANTA = {
    'TorreAntiguaBanos.glb': 'ar.taBanos',
    'TorreAntiguaConexion.glb': 'ar.taConexion',
    'TorreAntiguaCursos.glb': 'ar.taCursos',
    'TorreInnovacionCasilleros.glb': 'ar.tiCasilleros',
    'TorreInnovacionConexion.glb': 'ar.tiConexion'
  };

  if (UniMap.i18n && UniMap.i18n.extender) {
    UniMap.i18n.extender({
      'ar.boton': 'AR', 'ar.titulo': 'Realidad aumentada', 'ar.modelo': 'Modelo',
      'ar.verAr': 'Ver en AR', 'ar.cerrar': 'Cerrar', 'ar.maqueta': 'Maqueta del edificio',
      'ar.oficinas': 'Oficinas', 'ar.taBanos': 'Torre Antigua · pisos con baños',
      'ar.taConexion': 'Torre Antigua · pisos de conexión', 'ar.taCursos': 'Torre Antigua · pisos de cursos',
      'ar.tiCasilleros': 'Torre Innovación · pisos con casilleros', 'ar.tiConexion': 'Torre Innovación · pisos de conexión',
      'ar.tamano': 'Tamaño', 'ar.tamMaqueta': 'Maqueta (sobre una mesa)', 'ar.tamReal': 'Real (1:1)',
      'ar.cargando': 'Cargando modelo 3D…',
      'ar.pisoActual': 'Piso actual',
      'ar.sinAr': 'Este dispositivo no soporta AR. Abre la app desde un celular (Android o iPhone) por HTTPS para verlo en tu espacio.',
      'ar.consejo': 'Apunta la cámara al suelo, mueve el celular despacio y toca para colocar el modelo.',
      'ar.noGlb': 'La planta baja de la Torre Innovación aún no tiene modelo GLB para AR; se muestra otro modelo.'
    }, {
      'ar.boton': 'AR', 'ar.titulo': 'Augmented reality', 'ar.modelo': 'Model',
      'ar.verAr': 'View in AR', 'ar.cerrar': 'Close', 'ar.maqueta': 'Building scale model',
      'ar.oficinas': 'Offices', 'ar.taBanos': 'Old Tower · restroom floors',
      'ar.taConexion': 'Old Tower · connection floors', 'ar.taCursos': 'Old Tower · classroom floors',
      'ar.tiCasilleros': 'Innovation Tower · locker floors', 'ar.tiConexion': 'Innovation Tower · connection floors',
      'ar.tamano': 'Size', 'ar.tamMaqueta': 'Tabletop model', 'ar.tamReal': 'Real size (1:1)',
      'ar.cargando': 'Loading 3D model…',
      'ar.pisoActual': 'Current floor',
      'ar.sinAr': 'This device does not support AR. Open the app on a phone (Android or iPhone) over HTTPS to see it in your space.',
      'ar.consejo': 'Point the camera at the floor, move slowly and tap to place the model.',
      'ar.noGlb': 'The Innovation Tower ground floor has no GLB model for AR yet; another model is shown.'
    });
  }
  function T(k) { return UniMap.i18n.t(k); }

  var modal = null, visor = null, selector = null, cargado = false, cargando = null;
  var tamano = 'maqueta';

  function cargarLibreria() {
    if (cargado || window.customElements.get('model-viewer')) { cargado = true; return Promise.resolve(); }
    if (cargando) return cargando;
    cargando = new Promise(function (ok, err) {
      var s = document.createElement('script');
      s.type = 'module'; s.src = SCRIPT;
      s.onload = function () { window.customElements.whenDefined('model-viewer').then(function () { cargado = true; ok(); }); };
      s.onerror = function () { cargando = null; err(new Error('model-viewer')); };
      document.head.appendChild(s);
    });
    return cargando;
  }

  /* Plantas disponibles + el modelo del piso actual primero */
  function listaModelos() {
    var lista = [], vistos = {};
    var actual = datos.modeloDePiso ? datos.modeloDePiso(
      estado.edificioActual === 0 ? 1 : estado.edificioActual, estado.pisoActual) : null;
    var avisoFbx = false;
    if (actual && /\.glb$/i.test(actual.archivo)) {
      lista.push({ archivo: actual.archivo, nombre: T('ar.pisoActual') + ' · ' + T(NOMBRES_PLANTA[actual.archivo] || 'ar.maqueta') });
      vistos[actual.archivo] = true;
    } else if (actual) avisoFbx = true;
    Object.keys(NOMBRES_PLANTA).forEach(function (a) {
      if (!vistos[a]) { lista.push({ archivo: a, nombre: T(NOMBRES_PLANTA[a]) }); vistos[a] = true; }
    });
    MODELOS_EXTRA.forEach(function (m) { lista.push({ archivo: m.archivo, nombre: T(m.clave) }); });
    lista.avisoFbx = avisoFbx;
    return lista;
  }

  function construirModal() {
    modal = document.createElement('div');
    modal.id = 'modal-ar';
    modal.className = 'modal-ar hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<div class="ar-caja">' +
        '<header><strong id="ar-titulo"></strong><button class="ar-x" id="ar-cerrar" type="button">×</button></header>' +
        '<div class="ar-controles">' +
          '<label><span id="ar-lbl-modelo"></span><select id="ar-modelo"></select></label>' +
          '<label><span id="ar-lbl-tam"></span><select id="ar-tam"><option value="maqueta"></option><option value="real"></option></select></label>' +
        '</div>' +
        '<button type="button" class="ar-btn-camara" id="ar-btn-camara"></button>' +
        '<p class="ar-diag hidden" id="ar-diag"></p>' +
        '<div class="ar-escena" id="ar-escena"><div class="ar-carga" id="ar-carga"></div></div>' +
        '<p class="ar-nota" id="ar-nota"></p>' +
      '</div>';
    document.body.appendChild(modal);
    selector = modal.querySelector('#ar-modelo');
    modal.querySelector('#ar-cerrar').addEventListener('click', cerrar);
    modal.addEventListener('click', function (e) { if (e.target === modal) cerrar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) cerrar(); });
    selector.addEventListener('change', function () { mostrar(selector.value); });
    modal.querySelector('#ar-btn-camara').addEventListener('click', function () {
      if (UniMap.arCamara) UniMap.arCamara.abrir(selector.value);
    });
    modal.querySelector('#ar-tam').addEventListener('change', function (e) { tamano = e.target.value; aplicarTamano(); });
  }

  function textos() {
    modal.querySelector('#ar-titulo').textContent = T('ar.titulo');
    modal.querySelector('#ar-lbl-modelo').textContent = T('ar.modelo');
    modal.querySelector('#ar-lbl-tam').textContent = T('ar.tamano');
    var t = modal.querySelector('#ar-tam').options;
    t[0].textContent = T('ar.tamMaqueta'); t[1].textContent = T('ar.tamReal');
    modal.querySelector('#ar-tam').value = tamano;
    modal.querySelector('#ar-cerrar').setAttribute('aria-label', T('ar.cerrar'));
    modal.querySelector('#ar-carga').textContent = T('ar.cargando');
    modal.querySelector('#ar-btn-camara').textContent = T('arc.boton');
    var d = modal.querySelector('#ar-diag');
    if (!window.isSecureContext) { d.textContent = T('arc.httpsReq'); d.classList.remove('hidden'); }
    else d.classList.add('hidden');
  }

  /* El tamano solo se aplica al entrar en AR (en pantalla el modelo
     se ve completo); al salir se restablece. */
  var enSesionAr = false, temporizador = null;
  function escalaAr() {
    if (!visor || !visor.loaded) return;
    try {
      var d = visor.getDimensions();
      var mayor = Math.max(d.x, d.z, 0.001);
      var k = tamano === 'real' ? 1 : Math.min(1, 1.0 / mayor);
      visor.scale = k + ' ' + k + ' ' + k;
    } catch (e) { /* aun sin modelo */ }
  }
  function restablecerEscala() {
    if (visor) visor.scale = '1 1 1';
  }
  function aplicarTamano() { /* se aplica al pulsar "Ver en AR" */ }

  function mostrar(archivo) {
    var cont = modal.querySelector('#ar-escena');
    var carga = modal.querySelector('#ar-carga');
    var nota = modal.querySelector('#ar-nota');
    carga.classList.remove('hidden');
    if (visor && visor.parentNode) visor.parentNode.removeChild(visor);
    visor = document.createElement('model-viewer');
    visor.setAttribute('src', CARPETA + archivo);
    visor.setAttribute('alt', 'Modelo 3D del campus');
    visor.setAttribute('ar', '');
    visor.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
    visor.setAttribute('ar-placement', 'floor');
    visor.setAttribute('ar-scale', 'auto');
    visor.setAttribute('camera-controls', '');
    visor.setAttribute('touch-action', 'pan-y');
    visor.setAttribute('auto-rotate', '');
    visor.setAttribute('shadow-intensity', '1');
    visor.setAttribute('exposure', '1');
    visor.setAttribute('interaction-prompt', 'none');
    visor.className = 'ar-visor';
    var btn = document.createElement('button');
    btn.setAttribute('slot', 'ar-button');
    btn.className = 'ar-boton-ar';
    btn.type = 'button';
    btn.textContent = '📱 ' + T('ar.verAr');
    visor.appendChild(btn);
    btn.addEventListener('click', function () {
      escalaAr();
      clearTimeout(temporizador);
      temporizador = setTimeout(function () { if (!enSesionAr) restablecerEscala(); }, 4000);
    }, true);
    visor.addEventListener('load', function () { carga.classList.add('hidden'); });
    visor.addEventListener('error', function () { carga.textContent = '⚠ ' + archivo; });
    visor.addEventListener('ar-status', function (e) {
      var st = e.detail.status;
      enSesionAr = (st === 'session-started' || st === 'object-placed');
      if (st === 'failed') { nota.textContent = T('ar.sinAr'); restablecerEscala(); }
      if (st === 'not-presenting') restablecerEscala();
    });
    cont.appendChild(visor);
    nota.textContent = T('ar.consejo');
    /* ¿Soporta AR? Si no, avisar */
    setTimeout(function () { if (visor && visor.canActivateAR === false) nota.textContent = T('ar.sinAr'); }, 1500);
  }

  function abrir(archivoPreferido) {
    if (!modal) construirModal();
    textos();
    var lista = listaModelos();
    selector.innerHTML = '';
    lista.forEach(function (m) {
      var o = document.createElement('option'); o.value = m.archivo; o.textContent = m.nombre; selector.appendChild(o);
    });
    if (archivoPreferido) selector.value = archivoPreferido;
    modal.classList.remove('hidden');
    document.body.classList.add('ar-abierto');
    if (lista.avisoFbx) util.notificar(T('ar.noGlb'), 4500);
    cargarLibreria().then(function () { mostrar(selector.value); })
      .catch(function () { modal.querySelector('#ar-carga').textContent = '⚠ model-viewer'; });
  }

  function cerrar() {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.classList.remove('ar-abierto');
    if (visor && visor.parentNode) { visor.parentNode.removeChild(visor); visor = null; }
  }

  function iniciar() {
    var barra = util.el('boton-ubicacion');
    var tpl = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7.5 12 12.5l8.7-5M12 22V12.5"/></svg><span class="btn-label">' + T('ar.boton') + '</span>';
    if (barra && barra.parentNode) {
      var b = document.createElement('button');
      b.id = 'boton-ar'; b.className = 'btn-icon'; b.type = 'button';
      b.title = T('ar.titulo'); b.setAttribute('aria-label', T('ar.titulo'));
      b.innerHTML = tpl;
      barra.parentNode.insertBefore(b, barra.nextSibling);
      b.addEventListener('click', function () { abrir(); });
    }
    var ctl = document.querySelector('.controles-3d');
    if (ctl) {
      var c = document.createElement('button');
      c.id = 'ar-desde-3d'; c.className = 'btn-zoom'; c.type = 'button'; c.title = T('ar.titulo');
      c.innerHTML = '<span style="font-size:11px;font-weight:800">AR</span>';
      c.addEventListener('click', function () { abrir(); });
      ctl.appendChild(c);
    }
    document.addEventListener('idioma:cambiado', function () {
      var bb = util.el('boton-ar');
      if (bb) { bb.title = T('ar.titulo'); var l = bb.querySelector('.btn-label'); if (l) l.textContent = T('ar.boton'); }
      if (modal && !modal.classList.contains('hidden')) textos();
    });
  }

  UniMap.ar = { iniciar: iniciar, abrir: abrir, cerrar: cerrar, _listaModelos: listaModelos };
})();
