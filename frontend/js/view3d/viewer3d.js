/* =========================================================
   view3d/viewer3d.js — visor tridimensional (Three.js)

   · carga los modelos de la carpeta /models (GLB y FBX)
   · vista campus: ambas torres integradas en la escena
   · marcadores 3D por torre y piso (offset Y automatico)
   · seleccion, ficha y enfoque de camara
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var estado = UniMap.estado;

  var contenedor = util.el('visor-3d');
  var lienzo = util.el('lienzo-3d');

  /* Si la pagina no tiene visor (index.html) no hacemos nada */
  if (!contenedor || !lienzo) return;

  /* ── CATALOGO DE TORRES (escena campus integrada) ─── */
  var TORRES = [
    {
      edificio: 1, clave: 'antigua', nombre: 'Torre Antigua', pisos: 8,
      partes: [
        { url: 'models/torre-antigua-conexion.glb', formato: 'GLB', nombre: 'Conexion' },
        { url: 'models/torre-antigua-banos.glb', formato: 'GLB', nombre: 'Banos' },
        { url: 'models/torre-antigua-cursos.glb', formato: 'GLB', nombre: 'Cursos' }
      ],
      offsetEscena: { x: -55, z: 0 }
    },
    {
      edificio: 2, clave: 'innovacion', nombre: 'Torre Innovacion', pisos: 9,
      partes: [
        { url: 'models/torre-innovacion-plantilla.glb', formato: 'GLB', nombre: 'Plantilla' }
      ],
      offsetEscena: { x: 55, z: 0 }
    }
  ];

  /* ── CATALOGO INDIVIDUAL (inspeccion de piezas) ───── */
  var MODELOS = [
    { clave: 'campus', nombre: 'Campus (ambas torres)', formato: 'ESCENA', url: null },
    { clave: 'oficinas', nombre: 'Oficinas', formato: 'GLB', url: 'models/oficinas.glb' },
    { clave: 'planta-baja', nombre: 'Planta Baja Torre B', formato: 'FBX', url: 'models/planta-baja-torre-b.fbx' },
    { clave: 'torre-antigua-banos', nombre: 'Torre Antigua - Banos', formato: 'GLB', url: 'models/torre-antigua-banos.glb' },
    { clave: 'torre-antigua-conexion', nombre: 'Torre Antigua - Conexion', formato: 'GLB', url: 'models/torre-antigua-conexion.glb' },
    { clave: 'torre-antigua-cursos', nombre: 'Torre Antigua - Cursos', formato: 'GLB', url: 'models/torre-antigua-cursos.glb' },
    { clave: 'torre-innovacion-pisos', nombre: 'Torre Innovacion - Pisos 6 y 10', formato: 'GLB', url: 'models/torre-innovacion-pisos-6-10.glb' },
    { clave: 'torre-innovacion-plantilla', nombre: 'Torre Innovacion - Plantilla', formato: 'GLB', url: 'models/torre-innovacion-plantilla.glb' }
  ];

  var TAMANO_OBJETIVO = 100;          // unidades normalizadas
  var PLANO = { x0: 40, x1: 760, y0: 40, y1: 540 }; // limites del plano 2D

  /* ── ESTADO INTERNO ───────────────────────────────── */
  var inicializado = false;
  var activo = false;
  var cargando = false;
  var escena = null, camara = null, renderizador = null, controles = null;
  var luzDireccional = null, suelo = null, cuadricula = null;
  var modeloActual = null, claveActual = null, claveEnEspera = null;
  var huella = null;                    // { ancho, fondo, altura } del modelo individual
  var cacheModelos = {};
  var marcadores = [];
  var espacioPendiente = null;
  var animacionCamara = null;
  var raycaster = null;

  /* Campus: torres cargadas con su huella y posicion en escena */
  var campusGrupo = null;
  var torresCargadas = [];   // [{ edificio, grupo, huella, centro, pisos }]
  var campusListo = false;
  var campusCargando = false;

  /* =========================================================
     INICIALIZACION DE LA ESCENA
     ========================================================= */
  function iniciar() {
    conectarSelector();
    conectarControles();
    conectarInteraccionLienzo();
    window.addEventListener('resize', redimensionar);
  }

  /* =========================================================
     AYUDANTES DE ESCENA: MASCARA RADIAL Y CUADRICULA
     ========================================================= */
  function crearMascaraRadial() {
    var lienzoMascara = document.createElement('canvas');
    lienzoMascara.width = 256;
    lienzoMascara.height = 256;

    var ctx = lienzoMascara.getContext('2d');
    var gradiente = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradiente.addColorStop(0, '#ffffff');
    gradiente.addColorStop(0.5, '#ffffff');
    gradiente.addColorStop(0.78, '#b0b0b0');
    gradiente.addColorStop(1, '#000000');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, 256, 256);

    var textura = new THREE.CanvasTexture(lienzoMascara);
    textura.needsUpdate = true;
    return textura;
  }

  function crearCuadricula() {
    var N = 40;
    var pasos = 12;
    var MAYOR = [0.24, 0.29, 0.38];
    var MENOR = [0.36, 0.42, 0.52];
    var posiciones = [];
    var colores = [];

    function alfa(x, z) {
      var d = Math.sqrt(x * x + z * z) * 2;
      if (d <= 0.62) return 1;
      if (d >= 1) return 0;
      var t = (d - 0.62) / 0.38;
      return 1 - t * t * (3 - 2 * t);
    }

    function linea(x0, z0, x1, z1, rgb) {
      for (var s = 0; s < pasos; s++) {
        var a = s / pasos;
        var b = (s + 1) / pasos;
        var ax = x0 + (x1 - x0) * a, az = z0 + (z1 - z0) * a;
        var bx = x0 + (x1 - x0) * b, bz = z0 + (z1 - z0) * b;
        posiciones.push(ax, 0, az, bx, 0, bz);
        colores.push(rgb[0], rgb[1], rgb[2], alfa(ax, az));
        colores.push(rgb[0], rgb[1], rgb[2], alfa(bx, bz));
      }
    }

    for (var i = 0; i <= N; i++) {
      var p = -0.5 + i / N;
      var rgb = (i % 5 === 0) ? MAYOR : MENOR;
      linea(p, -0.5, p, 0.5, rgb);
      linea(-0.5, p, 0.5, p, rgb);
    }

    var geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
    geometria.setAttribute('color', new THREE.Float32BufferAttribute(colores, 4));

    return new THREE.LineSegments(geometria, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false
    }));
  }

  function crearEscena() {
    if (inicializado) return true;

    if (typeof THREE === 'undefined') {
      mostrarAviso(UniMap.i18n.t('v3.sinThree'));
      return false;
    }

    raycaster = new THREE.Raycaster();

    escena = new THREE.Scene();
    escena.background = new THREE.Color(0xeef2f7);
    escena.fog = new THREE.Fog(0xeef2f7, 260, 700);

    camara = new THREE.PerspectiveCamera(45, 1, 0.1, 4000);
    camara.position.set(70, 60, 110);

    try {
      renderizador = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
    } catch (e) {
      mostrarAviso(UniMap.i18n.t('v3.sinWebgl'));
      return false;
    }
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderizador.shadowMap.enabled = true;
    renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
    renderizador.toneMapping = THREE.NoToneMapping;

    escena.add(new THREE.HemisphereLight(0xffffff, 0x6f7f99, 0.35));
    escena.add(new THREE.AmbientLight(0xffffff, 0.12));

    luzDireccional = new THREE.DirectionalLight(0xffffff, 0.65);
    luzDireccional.position.set(90, 140, 60);
    luzDireccional.castShadow = true;
    luzDireccional.shadow.mapSize.width = 2048;
    luzDireccional.shadow.mapSize.height = 2048;
    luzDireccional.shadow.camera.near = 1;
    luzDireccional.shadow.camera.far = 600;
    luzDireccional.shadow.bias = -0.0004;
    luzDireccional.shadow.normalBias = 0.04;
    escena.add(luzDireccional);

    var relleno = new THREE.DirectionalLight(0xbfdbfe, 0.15);
    relleno.position.set(-80, 50, -70);
    escena.add(relleno);

    suelo = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x8797af,
        roughness: 0.95,
        metalness: 0,
        transparent: true,
        alphaMap: crearMascaraRadial()
      })
    );
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.y = -0.02;
    suelo.receiveShadow = true;
    escena.add(suelo);

    cuadricula = crearCuadricula();
    cuadricula.position.y = 0.01;
    escena.add(cuadricula);

    controles = new THREE.OrbitControls(camara, renderizador.domElement);
    controles.enableDamping = true;
    controles.dampingFactor = 0.07;
    controles.rotateSpeed = 0.75;
    controles.panSpeed = 0.8;
    controles.minPolarAngle = 0.05;
    controles.maxPolarAngle = Math.PI / 2 - 0.02;
    controles.autoRotateSpeed = 0.9;

    inicializado = true;
    redimensionar();
    bucleDeRenderizado();

    return true;
  }

  function bucleDeRenderizado() {
    requestAnimationFrame(bucleDeRenderizado);
    if (!activo || !inicializado) return;

    var ahora = performance.now();
    actualizarAnimacionCamara(ahora);

    controles.update();
    renderizador.render(escena, camara);
    actualizarPosicionesMarcadores();
  }

  function redimensionar() {
    if (!inicializado || !activo) return;
    var w = contenedor.clientWidth;
    var h = contenedor.clientHeight;
    if (!w || !h) return;
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    renderizador.setSize(w, h, false);
  }

  /* =========================================================
     CARGA Y NORMALIZACION DE MODELOS
     ========================================================= */
  function urlSegura(url) {
    return url.split('/').map(encodeURIComponent).join('/');
  }

  function recorrerVisibles(raiz, fn) {
    if (!raiz) return;
    raiz.updateWorldMatrix(true, true);
    (function paso(nodo) {
      if (nodo.visible === false) return;
      if (nodo.isMesh) fn(nodo);
      for (var i = 0; i < nodo.children.length; i++) paso(nodo.children[i]);
    })(raiz);
  }

  function cajaVisible(raiz) {
    var caja = new THREE.Box3();
    var parcial = new THREE.Box3();
    recorrerVisibles(raiz, function (nodo) {
      var geo = nodo.geometry;
      if (!geo) return;
      if (!geo.boundingBox) geo.computeBoundingBox();
      if (!geo.boundingBox) return;
      parcial.copy(geo.boundingBox).applyMatrix4(nodo.matrixWorld);
      caja.union(parcial);
    });
    return caja;
  }

  function luminancia(color) {
    if (!color) return 1;
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  }

  function retirarBaseInnecesaria(raiz) {
    var caja = cajaVisible(raiz);
    if (caja.isEmpty()) return 0;

    var t = caja.getSize(new THREE.Vector3());
    var anchoMax = Math.max(t.x, t.z);
    var aOcultar = [];

    recorrerVisibles(raiz, function (nodo) {
      var mats = Array.isArray(nodo.material) ? nodo.material : [nodo.material];
      var oscuro = mats.every(function (m) { return m && m.color && luminancia(m.color) <= 0.06; });
      if (!oscuro) return;
      if (!nodo.geometry) return;
      if (!nodo.geometry.boundingBox) nodo.geometry.computeBoundingBox();
      if (!nodo.geometry.boundingBox) return;

      var cajaMalla = new THREE.Box3()
        .copy(nodo.geometry.boundingBox)
        .applyMatrix4(nodo.matrixWorld);
      var s = cajaMalla.getSize(new THREE.Vector3());

      var plana = s.y <= anchoMax * 0.03;
      var cubreHuella = s.x >= t.x * 0.85 && s.z >= t.z * 0.85;
      var enLaBase = cajaMalla.min.y <= caja.min.y + anchoMax * 0.05;

      if (plana && cubreHuella && enLaBase) aOcultar.push(nodo);
    });

    for (var i = 0; i < aOcultar.length; i++) aOcultar[i].visible = false;
    return aOcultar.length;
  }

  function aplicarMateriales(objeto) {
    var materialesVistos = [];
    var aRetirar = [];

    objeto.traverse(function (nodo) {
      if (nodo !== objeto && (nodo.isLight || nodo.isCamera)) {
        aRetirar.push(nodo);
        return;
      }

      if (nodo.isMesh) {
        nodo.castShadow = true;
        nodo.receiveShadow = true;
        var materiales = Array.isArray(nodo.material) ? nodo.material : [nodo.material];
        for (var m = 0; m < materiales.length; m++) {
          var mat = materiales[m];
          if (!mat) continue;
          if (materialesVistos.indexOf(mat) !== -1) continue;
          materialesVistos.push(mat);

          if (mat.map && THREE.LinearEncoding !== undefined) mat.map.encoding = THREE.LinearEncoding;
          if (mat.metalness !== undefined && mat.metalness > 0.6) mat.metalness = Math.min(mat.metalness, 0.35);

          if (mat.isMeshPhongMaterial || mat.isMeshLambertMaterial) {
            if (mat.shininess > 20) mat.shininess = 20;
            if (mat.specular) mat.specular.multiplyScalar(0.3);
          }
          if (mat.color && mat.color.getHex() === 0) mat.color.setHex(0xbfc4cc);
        }
      }
    });

    for (var r = 0; r < aRetirar.length; r++) {
      if (aRetirar[r].parent) aRetirar[r].parent.remove(aRetirar[r]);
    }
  }

  /* Normaliza un objeto individual a TAMANO_OBJETIVO */
  function normalizar(objeto) {
    retirarBaseInnecesaria(objeto);

    var caja = cajaVisible(objeto);
    var tamaño = caja.getSize(new THREE.Vector3());
    var maximo = Math.max(tamaño.x, tamaño.y, tamaño.z) || 1;
    var escala = TAMANO_OBJETIVO / maximo;
    objeto.scale.setScalar(escala);

    caja = cajaVisible(objeto);
    var centro = caja.getCenter(new THREE.Vector3());
    objeto.position.x -= centro.x;
    objeto.position.z -= centro.z;
    objeto.position.y -= caja.min.y;

    aplicarMateriales(objeto);

    caja = cajaVisible(objeto);
    var t = caja.getSize(new THREE.Vector3());
    return { objeto: objeto, ancho: t.x, fondo: t.z, altura: t.y, caja: caja };
  }

  /* Normaliza con escala COMPARTIDA (para varias piezas de una torre) */
  function normalizarCompartido(objeto, escalaCompartida) {
    retirarBaseInnecesaria(objeto);
    objeto.scale.setScalar(escalaCompartida);

    var caja = cajaVisible(objeto);
    if (!caja.isEmpty()) {
      objeto.position.y -= caja.min.y;
    }

    aplicarMateriales(objeto);
    return objeto;
  }

  function descargarModelo(definicion) {
    return new Promise(function (resolver, rechazar) {
      try {
        if (definicion.formato === 'FBX') {
          var loaderFBX = new THREE.FBXLoader();
          loaderFBX.load(urlSegura(definicion.url),
            function (resultado) { resolver(resultado.scene !== undefined ? resultado.scene : resultado); },
            null,
            function (err) { rechazar(err); });
        } else {
          var loaderGLTF = new THREE.GLTFLoader();
          loaderGLTF.load(urlSegura(definicion.url),
            function (resultado) { resolver(resultado.scene !== undefined ? resultado.scene : resultado); },
            null,
            function (err) { rechazar(err); });
        }
      } catch (e) { rechazar(e); }
    });
  }

  /* ── CARGA DEL CAMPUS (ambas torres integradas) ───── */
  function cargarCampus() {
    if (campusListo) {
      instalarCampus();
      return;
    }
    if (campusCargando) return;
    if (!crearEscena()) return;

    campusCargando = true;
    claveActual = 'campus';
    actualizarBotonModelo({ clave: 'campus', nombre: 'Campus (ambas torres)' });
    ocultarAviso();
    mostrarCarga(0, 'Cargando campus...');

    /* Quitar modelo individual si estaba */
    if (modeloActual && modeloActual.parent) {
      escena.remove(modeloActual);
      modeloActual = null;
    }

    var totalPiezas = 0;
    for (var t = 0; t < TORRES.length; t++) totalPiezas += TORRES[t].partes.length;
    var descargadas = 0;
    var resultados = {};   // url -> objeto crudo

    var promesas = [];
    for (var i = 0; i < TORRES.length; i++) {
      (function (torre) {
        for (var p = 0; p < torre.partes.length; p++) {
          (function (parte) {
            var url = parte.url;
            if (cacheModelos[url]) {
              resultados[url] = cacheModelos[url].objetoCrudo;
              descargadas++;
              mostrarCarga(Math.round(descargadas / totalPiezas * 60), 'Cargando campus: ' + descargadas + '/' + totalPiezas);
              return;
            }
            var promesa = descargarModelo(parte).then(function (objeto) {
              resultados[url] = objeto;
              cacheModelos[url] = { objetoCrudo: objeto };
              descargadas++;
              mostrarCarga(Math.round(descargadas / totalPiezas * 60), 'Cargando campus: ' + descargadas + '/' + totalPiezas);
            });
            promesas.push(promesa);
          })(torre.partes[p]);
        }
      })(TORRES[i]);
    }

    Promise.all(promesas).then(function () {
      /* 1. Calcular escala compartida por torre */
      campusGrupo = new THREE.Group();
      torresCargadas = [];

      var maxAnchoTotal = 0;
      var maxFondoTotal = 0;
      var maxAltoTotal = 0;

      for (var ti = 0; ti < TORRES.length; ti++) {
        var defTorre = TORRES[ti];
        var grupoTorre = new THREE.Group();
        grupoTorre.name = defTorre.nombre;

        /* Escala compartida: la mayor dimension de cualquier pieza */
        var maxPieza = 0;
        var cajas = [];
        for (var pi = 0; pi < defTorre.partes.length; pi++) {
          var crudo = resultados[defTorre.partes[pi].url];
          if (!crudo) continue;
          /* Clonar para no destruir la cache */
          var clon = crudo.clone(true);
          retirarBaseInnecesaria(clon);
          var cajaP = cajaVisible(clon);
          if (cajaP.isEmpty()) continue;
          var sz = cajaP.getSize(new THREE.Vector3());
          maxPieza = Math.max(maxPieza, sz.x, sz.y, sz.z);
          cajas.push({ objeto: clon, caja: cajaP, tam: sz });
        }

        var escalaTorre = maxPieza > 0 ? TAMANO_OBJETIVO / maxPieza : 1;

        /* Aplicar escala compartida, centrar y apoyar cada pieza */
        for (var ci = 0; ci < cajas.length; ci++) {
          var item = cajas[ci];
          normalizarCompartido(item.objeto, escalaTorre);
          var cajaN = cajaVisible(item.objeto);
          if (!cajaN.isEmpty()) {
            var centroN = cajaN.getCenter(new THREE.Vector3());
            item.objeto.position.x -= centroN.x;
            item.objeto.position.z -= centroN.z;
            item.objeto.position.y -= cajaN.min.y;
          }
          grupoTorre.add(item.objeto);
        }

        /* Posicionar la torre en la escena */
        grupoTorre.position.x = defTorre.offsetEscena.x;
        grupoTorre.position.z = defTorre.offsetEscena.z;
        campusGrupo.add(grupoTorre);

        /* Huella de la torre en coordenadas de escena */
        campusGrupo.updateMatrixWorld(true);
        var cajaTorre = cajaVisible(grupoTorre);
        var tTorre = cajaTorre.isEmpty() ? { x: 40, y: 80, z: 40 } : cajaTorre.getSize(new THREE.Vector3());
        var centroTorre = cajaTorre.isEmpty()
          ? { x: defTorre.offsetEscena.x, y: 40, z: defTorre.offsetEscena.z }
          : cajaTorre.getCenter(new THREE.Vector3());

        torresCargadas.push({
          edificio: defTorre.edificio,
          clave: defTorre.clave,
          nombre: defTorre.nombre,
          pisos: defTorre.pisos,
          grupo: grupoTorre,
          huella: { ancho: tTorre.x, fondo: tTorre.z, altura: tTorre.y },
          centro: { x: centroTorre.x, y: 0, z: centroTorre.z }
        });

        maxAnchoTotal = Math.max(maxAnchoTotal, Math.abs(defTorre.offsetEscena.x) * 2 + tTorre.x);
        maxFondoTotal = Math.max(maxFondoTotal, tTorre.z);
        maxAltoTotal = Math.max(maxAltoTotal, tTorre.y);

        /* Guardar en cache las piezas ya normalizadas individualmente
           (para el selector de modelos individuales) */
        for (var pi2 = 0; pi2 < defTorre.partes.length; pi2++) {
          var urlP = defTorre.partes[pi2].url;
          if (resultados[urlP] && !cacheModelos[urlP].info) {
            /* El objeto crudo ya fue clonado para el campus;
               se re-descarga o se usa el clon para inspeccion.
               Aqui solo se marca como disponible. */
          }
        }
      }

      escena.add(campusGrupo);
      campusListo = true;
      campusCargando = false;
      cargando = false;
      ocultarCarga();

      /* Ajustar suelo, luces y camara al conjunto */
      var extension = Math.max(maxAnchoTotal, maxFondoTotal, maxAltoTotal * 0.6);
      ajustarSuelo({ ancho: maxAnchoTotal, fondo: maxFondoTotal, altura: maxAltoTotal });
      encuadrarCampus(maxAnchoTotal, maxFondoTotal, maxAltoTotal);

      huella = { ancho: maxAnchoTotal, fondo: maxFondoTotal, altura: maxAltoTotal };
      modeloActual = campusGrupo;

      actualizarMarcadores();
    }).catch(function (err) {
      campusCargando = false;
      cargando = false;
      ocultarCarga();
      mostrarAviso(UniMap.i18n.t('v3.avisoCampus'));
      util.notificar(UniMap.i18n.t('v3.errorCampus'));
      if (window.console) console.error(err);
    });
  }

  function instalarCampus() {
    if (modeloActual && modeloActual !== campusGrupo && modeloActual.parent) {
      escena.remove(modeloActual);
    }
    if (campusGrupo && !campusGrupo.parent) escena.add(campusGrupo);
    modeloActual = campusGrupo;

    var maxAncho = 0, maxFondo = 0, maxAlto = 0;
    for (var i = 0; i < torresCargadas.length; i++) {
      maxAncho = Math.max(maxAncho, Math.abs(torresCargadas[i].centro.x) * 2 + torresCargadas[i].huella.ancho);
      maxFondo = Math.max(maxFondo, torresCargadas[i].huella.fondo);
      maxAlto = Math.max(maxAlto, torresCargadas[i].huella.altura);
    }
    huella = { ancho: maxAncho, fondo: maxFondo, altura: maxAlto };
    ajustarSuelo(huella);
    encuadrarCampus(maxAncho, maxFondo, maxAlto);
    actualizarMarcadores();
  }

  function encuadrarCampus(ancho, fondo, alto) {
    var maximo = Math.max(ancho, fondo, alto);
    var centro = new THREE.Vector3(0, alto * 0.35, 0);

    var fov = camara.fov * Math.PI / 180;
    var distancia = (maximo / 2) / Math.tan(fov / 2) * 1.35;

    controles.target.copy(centro);
    camara.position.set(
      centro.x + distancia * 0.45,
      centro.y + distancia * 0.5,
      centro.z + distancia * 0.85
    );

    camara.near = maximo / 300;
    camara.far = maximo * 40;
    camara.updateProjectionMatrix();

    controles.minDistance = maximo * 0.1;
    controles.maxDistance = maximo * 8;
    controles.update();
  }

  /* ── CARGA DE MODELOS INDIVIDUALES ────────────────── */
  function cargarModelo(clave) {
    if (clave === 'campus') {
      claveActual = 'campus';
      claveEnEspera = null;
      cargarCampus();
      return;
    }

    var modelo = null;
    for (var i = 0; i < MODELOS.length; i++) {
      if (MODELOS[i].clave === clave) { modelo = MODELOS[i]; break; }
    }
    if (!modelo) return;

    if (cargando || campusCargando) {
      claveEnEspera = (clave !== claveActual) ? clave : null;
      return;
    }

    if (!crearEscena()) return;

    claveActual = clave;
    claveEnEspera = null;
    actualizarBotonModelo(modelo);
    ocultarAviso();

    /* Quitar campus si estaba */
    if (campusGrupo && campusGrupo.parent) escena.remove(campusGrupo);
    campusListo = false;  // forzar reinstalar si se vuelve al campus

    if (cacheModelos[clave] && cacheModelos[clave].info) {
      instalar(cacheModelos[clave].info);
      return;
    }

    cargando = true;
    mostrarCarga(0, 'Descargando ' + modelo.nombre + '...');

    descargarModelo(modelo).then(function (objeto) {
      var info = normalizar(objeto);
      cacheModelos[clave] = { info: info, objetoCrudo: objeto };
      cargando = false;
      ocultarCarga();
      instalar(info);
      procesarClaveEnEspera();
    }).catch(function () {
      cargando = false;
      ocultarCarga();
      mostrarAviso(UniMap.i18n.t('v3.avisoModelo', { n: modelo.nombre }));
      util.notificar(UniMap.i18n.t('v3.errorModelo'));
      procesarClaveEnEspera();
    });
  }

  function procesarClaveEnEspera() {
    var pendiente = claveEnEspera;
    claveEnEspera = null;
    if (pendiente && pendiente !== claveActual) cargarModelo(pendiente);
  }

  function instalar(info) {
    if (modeloActual && modeloActual.parent) {
      escena.remove(modeloActual);
    }
    modeloActual = info.objeto;
    escena.add(modeloActual);

    huella = { ancho: info.ancho, fondo: info.fondo, altura: info.altura };
    torresCargadas = [];

    ajustarSuelo(info);
    encuadrarModelo(info);
    actualizarMarcadores();
  }

  function ajustarSuelo(info) {
    var extension = Math.max(info.ancho, info.fondo);
    var base = extension * 2.6;

    suelo.scale.set(base, base, 1);
    cuadricula.scale.set(base, 1, base);

    var distancia = extension * 1.6;
    luzDireccional.position.set(distancia, extension * 2.2, distancia * 0.7);
    luzDireccional.shadow.camera.left = -distancia;
    luzDireccional.shadow.camera.right = distancia;
    luzDireccional.shadow.camera.top = distancia;
    luzDireccional.shadow.camera.bottom = -distancia;
    luzDireccional.shadow.camera.far = extension * 8;
    luzDireccional.shadow.camera.updateProjectionMatrix();

    var maximo = Math.max(info.ancho, info.fondo, info.altura);
    escena.fog.near = maximo * 2.6;
    escena.fog.far = maximo * 6;
  }

  function encuadrarModelo(info) {
    var caja = modeloActual ? cajaVisible(modeloActual) : null;
    var centro = (caja && !caja.isEmpty()) ? caja.getCenter(new THREE.Vector3())
                                           : new THREE.Vector3(0, info.altura / 2, 0);
    var maximo = Math.max(info.ancho, info.fondo, info.altura);

    var fov = camara.fov * Math.PI / 180;
    var distancia = (maximo / 2) / Math.tan(fov / 2) * 1.2;

    controles.target.copy(centro);
    camara.position.set(
      centro.x + distancia * 0.5,
      centro.y + distancia * 0.55,
      centro.z + distancia * 0.85
    );

    camara.near = maximo / 300;
    camara.far = maximo * 40;
    camara.updateProjectionMatrix();

    controles.minDistance = maximo * 0.12;
    controles.maxDistance = maximo * 7;
    controles.update();
  }

  /* =========================================================
     MARCADORES 3D PROYECTADOS
     ========================================================= */

  /* Busca la torre cargada correspondiente a un edificio */
  function torreDe(edificio) {
    for (var i = 0; i < torresCargadas.length; i++) {
      if (torresCargadas[i].edificio === edificio) return torresCargadas[i];
    }
    return null;
  }

  /* Posicion en modo campus: sobre la torre correcta y a la altura del piso */
  function calcularPosicionCampus(espacio) {
    var torre = torreDe(espacio.edificio);
    if (!torre) return null;

    var cx2d = espacio.x + espacio.ancho / 2;
    var cy2d = espacio.y + espacio.alto / 2;

    var u = (cx2d - PLANO.x0) / (PLANO.x1 - PLANO.x0) - 0.5;
    var v = (cy2d - PLANO.y0) / (PLANO.y1 - PLANO.y0) - 0.5;

    var x = torre.centro.x + u * torre.huella.ancho * 0.92;
    var z = torre.centro.z + v * torre.huella.fondo * 0.92;

    /* Altura del piso dentro de la torre */
    var alturaPiso = torre.huella.altura / torre.pisos;
    var yBase = espacio.piso * alturaPiso;
    var yTope = yBase + alturaPiso;

    /* Raycast acotado a la banda del piso actual */
    raycaster.set(new THREE.Vector3(x, yTope + 0.3, z), new THREE.Vector3(0, -1, 0));
    raycaster.far = alturaPiso + 0.6;

    var golpes = raycaster.intersectObjects(torre.grupo.children, true);
    var y = yBase + alturaPiso * 0.5;
    if (golpes.length) y = golpes[0].point.y + Math.max(0.4, alturaPiso * 0.08);

    return new THREE.Vector3(x, y, z);
  }

  /* Posicion en modelo individual (comportamiento original) */
  function calcularPosicionIndividual(espacio) {
    if (!huella || !modeloActual) return null;

    var cx2d = espacio.x + espacio.ancho / 2;
    var cy2d = espacio.y + espacio.alto / 2;

    var u = (cx2d - PLANO.x0) / (PLANO.x1 - PLANO.x0) - 0.5;
    var v = (cy2d - PLANO.y0) / (PLANO.y1 - PLANO.y0) - 0.5;

    var x = u * huella.ancho * 0.92;
    var z = v * huella.fondo * 0.92;

    var alturaTope = huella.altura + 5;
    raycaster.set(new THREE.Vector3(x, alturaTope, z), new THREE.Vector3(0, -1, 0));
    raycaster.far = alturaTope * 2;

    var golpes = raycaster.intersectObjects(modeloActual.children, true);
    var y = 1;
    if (golpes.length) y = golpes[0].point.y + Math.max(0.6, huella.altura * 0.02);

    return new THREE.Vector3(x, y, z);
  }

  function calcularPosicion(espacio) {
    if (claveActual === 'campus' && torresCargadas.length) {
      return calcularPosicionCampus(espacio);
    }
    return calcularPosicionIndividual(espacio);
  }

  function actualizarMarcadores() {
    if (!inicializado || !activo) return;

    var capa = util.el('marcadores-3d');
    if (!capa) return;

    for (var i = 0; i < marcadores.length; i++) {
      if (marcadores[i].elemento && marcadores[i].elemento.parentNode) {
        marcadores[i].elemento.parentNode.removeChild(marcadores[i].elemento);
      }
    }
    marcadores = [];

    if (!modeloActual) {
      mostrarAviso(UniMap.i18n.t('v3.eligeModelo'));
      return;
    }

    ocultarAviso();

    var visibles = UniMap.filtros.espaciosInteractuales();
    var seleccionado = estado.espacioSeleccionado;

    for (var v = 0; v < visibles.length; v++) {
      var espacio = visibles[v];

      /* En modo campus solo se marcan espacios de la torre cargada
         (si no hay torres, se marcan todos) */
      if (claveActual === 'campus' && torresCargadas.length && !torreDe(espacio.edificio)) continue;

      var posicion = calcularPosicion(espacio);
      if (!posicion) continue;

      var elemento = document.createElement('div');
      elemento.className = 'marcador-3d';
      if (espacio.estado === 'inactivo') elemento.className += ' inactivo';
      if (UniMap.favoritos.esFavorito(espacio.id)) elemento.className += ' es-favorito';
      if (seleccionado && seleccionado.id === espacio.id) elemento.className += ' seleccionado';

      elemento.innerHTML = '<span class="punto"></span><span class="texto">' + util.escapar(espacio.nombre) + '</span>';
      elemento.setAttribute('data-id', espacio.id);
      elemento.setAttribute('title', espacio.nombre);
      conectarMarcador(elemento, espacio, posicion);

      capa.appendChild(elemento);
      marcadores.push({ espacio: espacio, posicion: posicion, elemento: elemento });
    }

    actualizarPosicionesMarcadores();

    if (espacioPendiente) {
      var pendiente = espacioPendiente;
      espacioPendiente = null;
      enfocarEspacio(pendiente);
    }
  }

  function conectarMarcador(elemento, espacio, posicion) {
    elemento.addEventListener('click', function (e) {
      e.stopPropagation();
      seleccionarEspacio(espacio, posicion);
    });

    elemento.addEventListener('mouseenter', function () {
      estado.espacioResaltado = espacio;
      if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
    });

    elemento.addEventListener('mouseleave', function () {
      estado.espacioResaltado = null;
      if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
    });
  }

  function seleccionarEspacio(espacio, posicion) {
    estado.espacioSeleccionado = espacio;

    for (var i = 0; i < marcadores.length; i++) {
      marcadores[i].elemento.classList.toggle('seleccionado', marcadores[i].espacio.id === espacio.id);
    }

    if (UniMap.mapa2D) UniMap.mapa2D.dibujar();

    var rect = contenedor.getBoundingClientRect();
    var vector = posicion.clone().project(camara);
    var px = rect.left + (vector.x * 0.5 + 0.5) * rect.width;
    var py = rect.top + (-vector.y * 0.5 + 0.5) * rect.height;

    UniMap.tooltip.mostrar(espacio, px, py);
  }

  function actualizarPosicionesMarcadores() {
    if (!marcadores.length) return;

    var ancho = contenedor.clientWidth;
    var alto = contenedor.clientHeight;
    var vector = new THREE.Vector3();

    for (var i = 0; i < marcadores.length; i++) {
      var m = marcadores[i];
      vector.copy(m.posicion).project(camara);

      var fuera = vector.z > 1 ||
        vector.x < -1.15 || vector.x > 1.15 ||
        vector.y < -1.15 || vector.y > 1.15;

      if (fuera) {
        m.elemento.style.display = 'none';
        continue;
      }

      m.elemento.style.display = 'flex';
      m.elemento.style.left = ((vector.x * 0.5 + 0.5) * ancho) + 'px';
      m.elemento.style.top = ((-vector.y * 0.5 + 0.5) * alto) + 'px';
    }
  }

  function buscarMarcador(idEspacio) {
    for (var i = 0; i < marcadores.length; i++) {
      if (marcadores[i].espacio.id === idEspacio) return marcadores[i];
    }
    return null;
  }

  /* =========================================================
     CAMARA
     ========================================================= */
  function animarCamara(hastaCamara, hastaObjetivo, duracion) {
    animacionCamara = {
      desdeCamara: camara.position.clone(),
      hastaCamara: hastaCamara.clone(),
      desdeObjetivo: controles.target.clone(),
      hastaObjetivo: hastaObjetivo.clone(),
      inicio: performance.now(),
      duracion: duracion || 750
    };
  }

  function actualizarAnimacionCamara(ahora) {
    if (!animacionCamara) return;
    var t = Math.min((ahora - animacionCamara.inicio) / animacionCamara.duracion, 1);
    var suave = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camara.position.lerpVectors(animacionCamara.desdeCamara, animacionCamara.hastaCamara, suave);
    controles.target.lerpVectors(animacionCamara.desdeObjetivo, animacionCamara.hastaObjetivo, suave);

    if (t >= 1) animacionCamara = null;
  }

  function enfocarEspacio(espacio) {
    if (!inicializado || !activo) {
      espacioPendiente = espacio;
      return false;
    }

    if (!modeloActual) {
      espacioPendiente = espacio;
      cargarModelo(claveActual || 'campus');
      return false;
    }

    /* Si es campus y la torre aun no esta cargada, cargar campus */
    if (claveActual === 'campus' && !campusListo) {
      espacioPendiente = espacio;
      cargarCampus();
      return false;
    }

    var marcador = buscarMarcador(espacio.id);
    if (!marcador) {
      actualizarMarcadores();
      marcador = buscarMarcador(espacio.id);
      if (!marcador) return false;
    }

    var destino = marcador.posicion;
    var maximo = huella ? Math.max(huella.ancho, huella.fondo, huella.altura) : 100;
    var distancia = maximo * 0.35;

    var direccion = camara.position.clone().sub(controles.target);
    direccion.y = Math.max(distancia * 0.6, direccion.y);
    direccion.normalize().multiplyScalar(distancia);

    animarCamara(destino.clone().add(direccion), destino, 750);

    seleccionarEspacio(espacio, marcador.posicion);
    return true;
  }

  function restablecerCamara() {
    if (claveActual === 'campus' && campusListo) {
      var maxAncho = 0, maxFondo = 0, maxAlto = 0;
      for (var i = 0; i < torresCargadas.length; i++) {
        maxAncho = Math.max(maxAncho, Math.abs(torresCargadas[i].centro.x) * 2 + torresCargadas[i].huella.ancho);
        maxFondo = Math.max(maxFondo, torresCargadas[i].huella.fondo);
        maxAlto = Math.max(maxAlto, torresCargadas[i].huella.altura);
      }
      encuadrarCampus(maxAncho, maxFondo, maxAlto);
    } else if (modeloActual && huella) {
      encuadrarModelo(huella);
    }
    UniMap.tooltip.ocultar();
  }

  /* =========================================================
     INTERFAZ DEL VISOR
     ========================================================= */
  function conectarSelector() {
    var boton = util.el('boton-modelo');
    var lista = util.el('lista-modelos');
    if (!boton || !lista) return;

    var html = '';
    for (var i = 0; i < MODELOS.length; i++) {
      html += '<li data-clave="' + MODELOS[i].clave + '">' +
        '<span>' + util.escapar(MODELOS[i].nombre) + '</span>' +
        '<span class="tipo-modelo">' + MODELOS[i].formato + '</span></li>';
    }
    lista.innerHTML = html;

    boton.addEventListener('click', function (e) {
      e.stopPropagation();
      lista.classList.toggle('hidden');
    });

    lista.addEventListener('click', function (e) {
      var item = e.target.closest ? e.target.closest('li') : null;
      if (!item) return;
      lista.classList.add('hidden');
      cargarModelo(item.getAttribute('data-clave'));
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.selector-modelo')) {
        lista.classList.add('hidden');
      }
    });
  }

  function actualizarBotonModelo(modelo) {
    var boton = util.el('boton-modelo');
    if (boton) boton.textContent = UniMap.i18n.t('v3.modelo', { n: modelo.nombre });

    var lista = util.el('lista-modelos');
    if (lista) {
      var items = lista.querySelectorAll('li');
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('activo', items[i].getAttribute('data-clave') === modelo.clave);
      }
    }
  }

  function conectarControles() {
    var reiniciar = util.el('camara-reiniciar');
    var rotacion = util.el('rotacion-auto');

    if (reiniciar) reiniciar.addEventListener('click', restablecerCamara);

    if (rotacion) rotacion.addEventListener('click', function () {
      if (!inicializado) return;
      controles.autoRotate = !controles.autoRotate;
      rotacion.classList.toggle('active', controles.autoRotate);
      util.notificar(controles.autoRotate ? 'Rotacion automatica activada' : 'Rotacion automatica desactivada');
    });
  }

  function conectarInteraccionLienzo() {
    var inicio = null;

    lienzo.addEventListener('pointerdown', function (e) {
      inicio = { x: e.clientX, y: e.clientY };
    });

    lienzo.addEventListener('pointerup', function (e) {
      if (!inicio) return;
      var distancia = Math.abs(e.clientX - inicio.x) + Math.abs(e.clientY - inicio.y);
      inicio = null;
      if (distancia > 6) return;

      estado.espacioSeleccionado = null;
      estado.espacioResaltado = null;
      UniMap.tooltip.ocultar();
      actualizarClasesMarcadores();
      if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
    });
  }

  function actualizarClasesMarcadores() {
    for (var i = 0; i < marcadores.length; i++) {
      marcadores[i].elemento.classList.toggle(
        'seleccionado',
        estado.espacioSeleccionado && estado.espacioSeleccionado.id === marcadores[i].espacio.id
      );
    }
  }

  /* ── CAPAS DE CARGA Y AVISOS ──────────────────────── */
  function mostrarCarga(porcentaje, texto) {
    var capa = util.el('carga-3d');
    var barra = util.el('barra-carga-3d');
    var etiqueta = util.el('texto-carga-3d');
    if (capa) capa.classList.remove('hidden');
    if (barra) barra.style.width = porcentaje + '%';
    if (etiqueta && texto) etiqueta.textContent = texto;
  }

  function ocultarCarga() {
    var capa = util.el('carga-3d');
    if (capa) capa.classList.add('hidden');
  }

  function mostrarAviso(texto) {
    var aviso = util.el('aviso-3d');
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.classList.remove('hidden');
  }

  function ocultarAviso() {
    var aviso = util.el('aviso-3d');
    if (aviso) aviso.classList.add('hidden');
  }

  /* =========================================================
     DIAGNOSTICO DE LA ESCENA (uso de desarrollo)
     ========================================================= */
  function inspeccionar() {
    var datos = { inicializado: inicializado, activo: activo, cargando: cargando, claveActual: claveActual, campusListo: campusListo, torres: torresCargadas.length };
    if (!inicializado) return datos;

    datos.camara = {
      posicion: camara.position.toArray().map(function (v) { return Math.round(v * 100) / 100; }),
      objetivo: controles.target.toArray().map(function (v) { return Math.round(v * 100) / 100; })
    };
    datos.marcadores = marcadores.length;
    datos.huella = huella;

    for (var i = 0; i < torresCargadas.length; i++) {
      var t = torresCargadas[i];
      datos['torre_' + t.clave] = { huella: t.huella, centro: t.centro, pisos: t.pisos };
    }

    return datos;
  }

  function capturar(calidad) {
    if (!inicializado) return null;

    var w = contenedor.clientWidth || 800;
    var h = contenedor.clientHeight || 500;
    var ancho = Math.min(760, w);
    var alto = Math.round(ancho * (h / w));

    renderizador.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    renderizador.render(escena, camara);

    var url = renderizador.domElement.toDataURL('image/jpeg', calidad === undefined ? 0.72 : calidad);

    renderizador.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();

    return url;
  }

  /* =========================================================
     ACTIVAR / DESACTIVAR VISTA 3D
     ========================================================= */
  function activar() {
    activo = true;
    contenedor.classList.remove('hidden');

    if (!crearEscena()) return;

    redimensionar();

    /* Por defecto se carga el campus integrado */
    if (claveActual === 'campus' || !claveActual) {
      if (campusListo) instalarCampus();
      else cargarCampus();
    } else if (!modeloActual) {
      cargarModelo(claveActual);
    } else {
      actualizarMarcadores();
    }

    if (espacioPendiente) {
      var pendiente = espacioPendiente;
      espacioPendiente = null;
      enfocarEspacio(pendiente);
    }
  }

  function desactivar() {
    activo = false;
    contenedor.classList.add('hidden');
    UniMap.tooltip.ocultar();
  }

  UniMap.vista3D = {
    iniciar: iniciar,
    activar: activar,
    desactivar: desactivar,
    actualizarMarcadores: actualizarMarcadores,
    enfocarEspacio: enfocarEspacio,
    cargarModelo: cargarModelo,
    cargarCampus: cargarCampus,
    restablecerCamara: restablecerCamara,
    inspeccionar: inspeccionar,
    capturar: capturar,
    mostrarModelo: function (v) { if (modeloActual) modeloActual.visible = v !== false; },
    mostrarSuelo: function (v) {
      if (suelo) suelo.visible = v !== false;
      if (cuadricula) cuadricula.visible = v !== false;
    },
    modelos: MODELOS,
    torres: TORRES
  };
})();
