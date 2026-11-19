/* =========================================================
   ar/camara.js — "AR con camara" (alternativa que funciona en
   cualquier celular con camara, sin ARCore ni Scene Viewer)

   · Muestra la camara trasera de fondo (getUserMedia)
   · Dibuja el modelo 3D encima con Three.js y mueve la vista
     con el giroscopio (DeviceOrientation), asi el modelo queda
     "fijo" en el espacio frente a ti
   · Arrastrar = girar el modelo · control = tamano · boton =
     volver a ponerlo frente a la camara
   Requiere HTTPS (o localhost) para poder usar la camara.
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var CARPETA = 'models/';

  if (UniMap.i18n && UniMap.i18n.extender) {
    UniMap.i18n.extender({
      'arc.boton': '📷 AR con cámara', 'arc.cerrar': 'Cerrar', 'arc.reubicar': 'Poner frente a mí',
      'arc.tamano': 'Tamaño', 'arc.ayuda': 'Mueve el celular para mirar alrededor. Arrastra para girar el modelo.',
      'arc.cargando': 'Cargando modelo…', 'arc.iniciando': 'Abriendo la cámara…',
      'arc.httpsReq': 'La cámara solo se puede usar con HTTPS (o desde localhost en la misma PC). Abre la app con un enlace https:// (por ejemplo con ngrok o GitHub Pages).',
      'arc.permiso': 'Permiso de cámara denegado. Permítelo en el candado de la barra de direcciones y vuelve a intentar.',
      'arc.sinCamara': 'No se encontró ninguna cámara en este dispositivo.',
      'arc.error': 'No se pudo abrir la cámara: ',
      'arc.noGlb': 'Este modelo no es GLB; elige otro.'
    }, {
      'arc.boton': '📷 Camera AR', 'arc.cerrar': 'Close', 'arc.reubicar': 'Place in front of me',
      'arc.tamano': 'Size', 'arc.ayuda': 'Move your phone to look around. Drag to rotate the model.',
      'arc.cargando': 'Loading model…', 'arc.iniciando': 'Opening the camera…',
      'arc.httpsReq': 'The camera only works over HTTPS (or localhost on the same PC). Open the app with an https:// link (e.g. ngrok or GitHub Pages).',
      'arc.permiso': 'Camera permission denied. Allow it from the lock icon in the address bar and try again.',
      'arc.sinCamara': 'No camera found on this device.',
      'arc.error': 'Could not open the camera: ',
      'arc.noGlb': 'This model is not a GLB; choose another one.'
    });
  }
  function T(k) { return UniMap.i18n.t(k); }

  var raiz, video, lienzo, msg, rango;
  var renderizador, escena, camara, modelo, pivote, flujo, animando = false;
  var tieneGiro = false, orient = { alpha: 0, beta: 0, gamma: 0 }, alpha0 = null;
  var tamanoM = 1.5, dimMax = 1;
  var arrastre = null;
  var q1 = null, ejeZ = null, eul = null, qTmp = null;

  function construir() {
    raiz = document.createElement('div');
    raiz.id = 'ar-camara'; raiz.className = 'ar-camara hidden';
    raiz.innerHTML =
      '<video playsinline muted autoplay></video><canvas></canvas>' +
      '<div class="arc-top"><button type="button" class="arc-x" aria-label="cerrar">×</button></div>' +
      '<div class="arc-msg"></div>' +
      '<div class="arc-bajo"><label><span class="arc-lbl"></span>' +
      '<input type="range" min="0.2" max="20" step="0.1" value="1.5"></label>' +
      '<button type="button" class="arc-re"></button></div>';
    document.body.appendChild(raiz);
    video = raiz.querySelector('video'); lienzo = raiz.querySelector('canvas');
    msg = raiz.querySelector('.arc-msg'); rango = raiz.querySelector('input');
    raiz.querySelector('.arc-x').addEventListener('click', cerrar);
    raiz.querySelector('.arc-re').addEventListener('click', ubicarFrente);
    rango.addEventListener('input', function () { tamanoM = parseFloat(rango.value); aplicarTamano(); });
    lienzo.addEventListener('pointerdown', function (e) { arrastre = { x: e.clientX }; lienzo.setPointerCapture(e.pointerId); });
    lienzo.addEventListener('pointermove', function (e) {
      if (!arrastre || !pivote) return;
      pivote.rotation.y += (e.clientX - arrastre.x) * 0.01; arrastre.x = e.clientX;
    });
    lienzo.addEventListener('pointerup', function () { arrastre = null; });
    window.addEventListener('resize', redimensionar);
  }

  function textos() {
    raiz.querySelector('.arc-lbl').textContent = T('arc.tamano');
    raiz.querySelector('.arc-re').textContent = T('arc.reubicar');
    msg.textContent = T('arc.ayuda');
  }

  function error(texto) { msg.textContent = texto; msg.classList.add('arc-error'); }

  function redimensionar() {
    if (!renderizador || raiz.classList.contains('hidden')) return;
    var w = raiz.clientWidth, h = raiz.clientHeight;
    renderizador.setSize(w, h, false);
    camara.aspect = w / h; camara.updateProjectionMatrix();
  }

  function aplicarTamano() {
    if (!pivote) return;
    var k = tamanoM / dimMax;
    pivote.scale.set(k, k, k);
  }

  function ubicarFrente() {
    if (!pivote) return;
    var dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camara.quaternion);
    dir.y = 0;
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
    dir.normalize();
    var dist = Math.max(2.2, tamanoM * 0.9);
    pivote.position.set(dir.x * dist, tieneGiro ? -1.4 : -0.6, dir.z * dist);
  }

  function orientacion() {
    if (!tieneGiro) return;
    var D = Math.PI / 180;
    var a = (orient.alpha || 0) * D, b = (orient.beta || 0) * D, g = (orient.gamma || 0) * D;
    var o = (window.orientation || 0) * D;
    eul.set(b, a, -g, 'YXZ');
    camara.quaternion.setFromEuler(eul);
    camara.quaternion.multiply(q1);
    camara.quaternion.multiply(qTmp.setFromAxisAngle(ejeZ, -o));
  }

  function alOrientar(e) {
    if (e.alpha == null && e.beta == null) return;
    tieneGiro = true; orient.alpha = e.alpha; orient.beta = e.beta; orient.gamma = e.gamma;
  }

  function bucle() {
    if (!animando) return;
    orientacion();
    renderizador.render(escena, camara);
    requestAnimationFrame(bucle);
  }

  function pedirGiro() {
    /* iOS exige permiso explicito, dentro del gesto del usuario */
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      return DeviceOrientationEvent.requestPermission().catch(function () { return 'denied'; });
    }
    return Promise.resolve('granted');
  }

  function abrir(archivo) {
    if (!/\.glb$/i.test(archivo || '')) { util.notificar(T('arc.noGlb'), 3500); return; }
    if (!raiz) construir();
    textos();
    msg.classList.remove('arc-error');
    raiz.classList.remove('hidden');
    document.body.classList.add('ar-abierto');
    msg.textContent = T('arc.iniciando');

    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return error(T('arc.httpsReq'));
    }
    /* El permiso del giroscopio se pide primero (gesto del usuario) */
    pedirGiro().then(function (r) {
      if (r === 'granted') window.addEventListener('deviceorientation', alOrientar, true);
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    }).then(function (stream) {
      flujo = stream; video.srcObject = stream; video.play().catch(function () {});
      iniciarEscena(archivo);
    }).catch(function (e) {
      var n = e && e.name;
      if (n === 'NotAllowedError' || n === 'SecurityError') error(T('arc.permiso'));
      else if (n === 'NotFoundError' || n === 'OverconstrainedError') error(T('arc.sinCamara'));
      else error(T('arc.error') + (e && e.message ? e.message : n));
    });
  }

  function iniciarEscena(archivo) {
    msg.textContent = T('arc.cargando');
    q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    ejeZ = new THREE.Vector3(0, 0, 1); eul = new THREE.Euler(); qTmp = new THREE.Quaternion();

    if (!renderizador) {
      renderizador = new THREE.WebGLRenderer({ canvas: lienzo, alpha: true, antialias: true });
      renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      if (THREE.sRGBEncoding !== undefined) renderizador.outputEncoding = THREE.sRGBEncoding;
      renderizador.setClearColor(0x000000, 0);
    }
    escena = new THREE.Scene();
    camara = new THREE.PerspectiveCamera(60, 1, 0.05, 200);
    escena.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.0));
    var sol = new THREE.DirectionalLight(0xffffff, 0.9); sol.position.set(2, 5, 3); escena.add(sol);

    UniMap.modelos.clonar(archivo, function (err, grupo) {
      if (err) return error(String(err.message || err));
      var info = UniMap.modelos.preparar(grupo);
      if (UniMap.modelos.prepararRender) UniMap.modelos.prepararRender(grupo);
      var caja = info.caja, centro = new THREE.Vector3();
      caja.getCenter(centro);
      /* origen en el centro de la base para que gire sobre si mismo */
      var interior = new THREE.Group();
      grupo.position.set(-centro.x, -caja.min.y, -centro.z);
      interior.add(grupo);
      pivote = new THREE.Group(); pivote.add(interior);
      dimMax = Math.max(info.ancho, info.fondo, 0.01);
      escena.add(pivote);
      aplicarTamano();
      redimensionar();
      ubicarFrente();
      animando = true; bucle();
      msg.textContent = T('arc.ayuda');
      setTimeout(function () { msg.classList.add('arc-oculto'); }, 5000);
    });
    redimensionar();
  }

  function cerrar() {
    animando = false;
    window.removeEventListener('deviceorientation', alOrientar, true);
    tieneGiro = false;
    if (flujo) { flujo.getTracks().forEach(function (t) { t.stop(); }); flujo = null; }
    if (video) video.srcObject = null;
    if (escena) { escena.traverse(function (o) { if (o.geometry && o.geometry.dispose && false) o.geometry.dispose(); }); }
    pivote = null;
    if (raiz) { raiz.classList.add('hidden'); msg.classList.remove('arc-oculto'); }
    document.body.classList.remove('ar-abierto');
  }

  UniMap.arCamara = { abrir: abrir, cerrar: cerrar };
})();
