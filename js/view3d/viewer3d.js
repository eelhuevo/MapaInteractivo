/* =========================================================
   view3d/viewer3d.js — visor tridimensional (Three.js)

   · carga los modelos de la carpeta /models (GLB y FBX)
   · luces, sombras, suelo, niebla y controles orbitales
   · marcadores 3D proyectados que respetan los filtros
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

  /* ── CATALOGO DE MODELOS ──────────────────────────── */
  var MODELOS = [
    { clave: 'edificio', nombre: 'Edificio', formato: 'GLB', url: 'models/edificio.glb' },
    { clave: 'habitacion', nombre: 'Habitacion', formato: 'GLB', url: 'models/habitacion.glb' },
    { clave: 'oficinas', nombre: 'Oficinas', formato: 'GLB', url: 'models/oficinas.glb' },
    { clave: 'planta-baja', nombre: 'Planta Baja Torre B', formato: 'FBX', url: 'models/PLANTA BAJA TOORE B.fbx' },
    { clave: 'torre-antigua', nombre: 'Torre Antigua (banos)', formato: 'GLB', url: 'models/TorreAntiguaBanos.glb' }
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
  var huella = null;                    // { ancho, fondo, altura }
  var cacheModelos = {};
  var marcadores = [];
  var espacioPendiente = null;
  var animacionCamara = null;
  var raycaster = null;

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
    var N = 40;         // divisiones de la malla
    var pasos = 12;     // segmentos por linea (para poder desvanecerlas)
    var MAYOR = [0.24, 0.29, 0.38];
    var MENOR = [0.36, 0.42, 0.52];
    var posiciones = [];
    var colores = [];

    function alfa(x, z) {
      var d = Math.sqrt(x * x + z * z) * 2;   // 0 en el centro, 1 en el borde
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
      mostrarAviso('No se pudo cargar Three.js. Revisa la carpeta /vendor/three.');
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
      mostrarAviso('Tu navegador no soporta WebGL, necesario para la vista 3D.');
      return false;
    }
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderizador.shadowMap.enabled = true;
    renderizador.shadowMap.type = THREE.PCFSoftShadowMap;

    /* En three.js r147 ColorManagement.legacyMode = true: los colores
       NO se convierten a espacio lineal. Si ademas se declara
       outputEncoding = sRGBEncoding, el renderizador vuelve a aclararlos
       y toda la escena queda quemada (todo blanco). Se deja la salida
       lineal para que los colores se muestren tal cual los ha definido
       el autor del modelo, igual que en Blender/Max. */
    renderizador.toneMapping = THREE.NoToneMapping;

    /* Luz de ambiente: aportada justa para que las sombras se lean */
    escena.add(new THREE.HemisphereLight(0xffffff, 0x6f7f99, 0.35));
    escena.add(new THREE.AmbientLight(0xffffff, 0.12));

    /* Sol con sombras */
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

    /* Luz de relleno */
    var relleno = new THREE.DirectionalLight(0xbfdbfe, 0.15);
    relleno.position.set(-80, 50, -70);
    escena.add(relleno);

    /* Suelo receptor de sombras + cuadricula.
       Tono medio: da contraste frente a los modelos, que suelen ser
       grises claros (#cccccc) y desaparecian sobre un fondo blanco.
       La mascara radial hace que el borde se desvanezca en lugar de
       terminar en un cuadro duro contra el fondo. */
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

    /* Controles orbitales */
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

  /* ── BUCLE DE RENDERIZADO ─────────────────────────── */
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

  /* Recorre solo los nodos visibles, para que una malla oculta no
     ensanche la caja del modelo ni proyecte sombra */
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

  /* Detecta la "plataforma" que algunos modelos traen consigo:
     una malla plana, casi negra y del tamano de toda la huella.
     Es material de relleno del autor original, no contenido. */
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

  function normalizar(objeto) {
    /* Base negra redundante (ciertas escenas traen un "Plane" enorme casi
       negro que ya cumple nuestro propio suelo): se oculta antes de medir,
       asi el modelo se encuadra sobre su contenido real */
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

    /* Algunos modelos (sobre todo el FBX) traen sus propias luces y
       camaras embebidas: queman la escena y no nos sirven, asi que
       se retiran y usamos unicamente la iluminacion del visor. */
    var aRetirar = [];
    var materialesVistos = [];

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

          /* Los materiales comparten referencias: no tocarlos dos veces */
          if (materialesVistos.indexOf(mat) !== -1) continue;
          materialesVistos.push(mat);

          /* Salida lineal: las texturas no se decodifican, para que se
             muestren tal y como las ha creado el autor del modelo */
          if (mat.map && THREE.LinearEncoding !== undefined) mat.map.encoding = THREE.LinearEncoding;
          if (mat.metalness !== undefined && mat.metalness > 0.6) mat.metalness = Math.min(mat.metalness, 0.35);

          /* Brillo especular del FBX: fundia la geometria en blanco */
          if (mat.isMeshPhongMaterial || mat.isMeshLambertMaterial) {
            if (mat.shininess > 20) mat.shininess = 20;
            if (mat.specular) mat.specular.multiplyScalar(0.3);
          }
          /* Materiales sin color definido salian negros */
          if (mat.color && mat.color.getHex() === 0) mat.color.setHex(0xbfc4cc);
        }
      }
    });

    for (var r = 0; r < aRetirar.length; r++) {
      if (aRetirar[r].parent) aRetirar[r].parent.remove(aRetirar[r]);
    }

    caja = cajaVisible(objeto);
    var t = caja.getSize(new THREE.Vector3());
    return { objeto: objeto, ancho: t.x, fondo: t.z, altura: t.y, caja: caja };
  }

  function cargarModelo(clave) {
    var modelo = null;
    for (var i = 0; i < MODELOS.length; i++) {
      if (MODELOS[i].clave === clave) { modelo = MODELOS[i]; break; }
    }
    if (!modelo) return;

    /* Si ya se esta descargando otro modelo, anotamos la peticion
       para lanzarla en cuanto termine la actual */
    if (cargando) {
      claveEnEspera = (clave !== claveActual) ? clave : null;
      return;
    }

    if (!crearEscena()) return;

    claveActual = clave;
    claveEnEspera = null;
    actualizarBotonModelo(modelo);
    ocultarAviso();

    if (cacheModelos[clave]) {
      instalar(cacheModelos[clave]);
      return;
    }

    cargando = true;
    mostrarCarga(0, 'Descargando ' + modelo.nombre + '...');

    var opciones = {
      onLoad: function (resultado) {
        var objeto = (resultado.scene !== undefined) ? resultado.scene : resultado;
        var info = normalizar(objeto);
        cacheModelos[clave] = info;
        cargando = false;
        ocultarCarga();
        instalar(info);
        procesarClaveEnEspera();
      },
      onProgress: function (evento) {
        if (evento.lengthComputable) {
          var pct = Math.round((evento.loaded / evento.total) * 100);
          mostrarCarga(pct, 'Descargando ' + modelo.nombre + ': ' + pct + '%');
        } else {
          mostrarCarga(60, 'Descargando ' + modelo.nombre + ': ' + Math.round(evento.loaded / 1048576) + ' MB');
        }
      },
      onError: function () {
        cargando = false;
        ocultarCarga();
        mostrarAviso('No se pudo cargar "' + modelo.nombre + '". Si abriste el proyecto con doble clic (file://), usa INICIAR.bat para servirlo por HTTP; si no, comprueba que el archivo este en la carpeta /models.');
        util.notificar('Error al cargar el modelo 3D');
        procesarClaveEnEspera();
      }
    };

    try {
      if (modelo.formato === 'FBX') {
        var loaderFBX = new THREE.FBXLoader();
        loaderFBX.load(urlSegura(modelo.url), opciones.onLoad, opciones.onProgress, opciones.onError);
      } else {
        var loaderGLTF = new THREE.GLTFLoader();
        loaderGLTF.load(urlSegura(modelo.url), opciones.onLoad, opciones.onProgress, opciones.onError);
      }
    } catch (e) {
      opciones.onError(e);
    }
  }

  /* Lanza la peticion de modelo que llego mientras cargaba otro */
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

    ajustarSuelo(info);
    encuadrarModelo(info);
    actualizarMarcadores();
  }

  function ajustarSuelo(info) {
    var extension = Math.max(info.ancho, info.fondo);
    var base = extension * 2.6;

    suelo.scale.set(base, base, 1);
    cuadricula.scale.set(base, 1, base);

    /* La luz direccional debe cubrir toda la escena */
    var distancia = extension * 1.6;
    luzDireccional.position.set(distancia, extension * 2.2, distancia * 0.7);
    luzDireccional.shadow.camera.left = -distancia;
    luzDireccional.shadow.camera.right = distancia;
    luzDireccional.shadow.camera.top = distancia;
    luzDireccional.shadow.camera.bottom = -distancia;
    luzDireccional.shadow.camera.far = extension * 8;
    luzDireccional.shadow.camera.updateProjectionMatrix();

    /* La niebla se calcula sobre la distancia de camara (que depende del
       lado mayor), asi nunca empana el propio modelo */
    var maximo = Math.max(info.ancho, info.fondo, info.altura);
    escena.fog.near = maximo * 2.6;
    escena.fog.far = maximo * 6;
  }

  function encuadrarModelo(info) {
    var caja = cajaVisible(modeloActual);
    var centro = caja.isEmpty() ? new THREE.Vector3(0, info.altura / 2, 0)
                                : caja.getCenter(new THREE.Vector3());
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
  function calcularPosicion(espacio) {
    if (!huella) return null;

    var cx2d = espacio.x + espacio.ancho / 2;
    var cy2d = espacio.y + espacio.alto / 2;

    var u = (cx2d - PLANO.x0) / (PLANO.x1 - PLANO.x0) - 0.5;
    var v = (cy2d - PLANO.y0) / (PLANO.y1 - PLANO.y0) - 0.5;

    var x = u * huella.ancho * 0.92;
    var z = v * huella.fondo * 0.92;

    /* Buscar la superficie real del modelo bajo ese punto */
    var alturaTope = huella.altura + 5;
    raycaster.set(new THREE.Vector3(x, alturaTope, z), new THREE.Vector3(0, -1, 0));
    raycaster.far = alturaTope * 2;

    var golpes = raycaster.intersectObjects(modeloActual.children, true);
    var y = 1;
    if (golpes.length) y = golpes[0].point.y + Math.max(0.6, huella.altura * 0.02);

    return new THREE.Vector3(x, y, z);
  }

  function actualizarMarcadores() {
    if (!inicializado || !activo) return;

    var capa = util.el('marcadores-3d');
    if (!capa) return;

    /* Limpiar marcadores anteriores */
    for (var i = 0; i < marcadores.length; i++) {
      if (marcadores[i].elemento && marcadores[i].elemento.parentNode) {
        marcadores[i].elemento.parentNode.removeChild(marcadores[i].elemento);
      }
    }
    marcadores = [];

    if (!modeloActual) {
      mostrarAviso('Elige un modelo 3D para situar los espacios del campus.');
      return;
    }

    ocultarAviso();

    var visibles = UniMap.filtros.espaciosInteractuales();
    var seleccionado = estado.espacioSeleccionado;

    for (var v = 0; v < visibles.length; v++) {
      var espacio = visibles[v];
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

    /* Enfocar un espacio pendiente (buscado antes de cargar) */
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
      cargarModelo(claveActual || 'edificio');
      return false;
    }

    var marcador = buscarMarcador(espacio.id);
    if (!marcador) {
      /* Reconstruye con el piso/filtros actuales y vuelve a buscar */
      actualizarMarcadores();
      marcador = buscarMarcador(espacio.id);
      if (!marcador) return false;  // el espacio esta filtrado en este momento
    }

    var destino = marcador.posicion;
    var maximo = Math.max(huella.ancho, huella.fondo, huella.altura);
    var distancia = maximo * 0.35;

    var direccion = camara.position.clone().sub(controles.target);
    direccion.y = Math.max(distancia * 0.6, direccion.y);
    direccion.normalize().multiplyScalar(distancia);

    animarCamara(destino.clone().add(direccion), destino, 750);

    seleccionarEspacio(espacio, marcador.posicion);
    return true;
  }

  function restablecerCamara() {
    if (!modeloActual || !huella) return;
    encuadrarModelo(huella);
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
    if (boton) boton.textContent = 'Modelo: ' + modelo.nombre;

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
      if (distancia > 6) return;  // fue un arrastre, no un clic

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
    var datos = { inicializado: inicializado, activo: activo, cargando: cargando, claveActual: claveActual };
    if (!inicializado) return datos;

    datos.camara = {
      posicion: camara.position.toArray().map(function (v) { return Math.round(v * 100) / 100; }),
      objetivo: controles.target.toArray().map(function (v) { return Math.round(v * 100) / 100; }),
      near: camara.near, far: camara.far, fov: camara.fov
    };
    datos.marcadores = marcadores.length;
    datos.huella = huella;

    if (!modeloActual) return datos;

    var caja = cajaVisible(modeloActual);
    var tam = caja.getSize(new THREE.Vector3());
    datos.caja = {
      min: caja.min.toArray().map(function (v) { return Math.round(v * 100) / 100; }),
      max: caja.max.toArray().map(function (v) { return Math.round(v * 100) / 100; }),
      tamano: tam.toArray().map(function (v) { return Math.round(v * 100) / 100; })
    };

    datos.mallasOcultas = 0;
    modeloActual.traverse(function (n) { if (n.isMesh && n.visible === false) datos.mallasOcultas++; });

    var resumen = { mallas: 0, lineas: 0, puntos: 0, grupos: 0, triangulos: 0, conTextura: 0, sinTextura: 0, materiales: {}, colores: {}, tipos: {} };

    modeloActual.traverse(function (nodo) {
      if (nodo.isMesh) {
        resumen.mallas++;
        var geo = nodo.geometry;
        if (geo && geo.index) resumen.triangulos += geo.index.count / 3;
        else if (geo && geo.attributes && geo.attributes.position) resumen.triangulos += geo.attributes.position.count / 3;

        var mats = Array.isArray(nodo.material) ? nodo.material : [nodo.material];
        for (var m = 0; m < mats.length; m++) {
          var mat = mats[m];
          if (!mat) continue;
          resumen.materiales[mat.type] = (resumen.materiales[mat.type] || 0) + 1;
          resumen.tipos[nodo.type] = (resumen.tipos[nodo.type] || 0) + 1;
          if (mat.map) resumen.conTextura++; else resumen.sinTextura++;
          if (mat.color) {
            var hex = '#' + mat.color.getHexString();
            resumen.colores[hex] = (resumen.colores[hex] || 0) + 1;
          }
        }
        if (nodo.visible === false) resumen.oclusas = (resumen.oclusas || 0) + 1;
      } else if (nodo.isLine || nodo.isLineSegments) {
        resumen.lineas++;
      } else if (nodo.isPoints) {
        resumen.puntos++;
      } else {
        resumen.grupos++;
        resumen.tipos[nodo.type] = (resumen.tipos[nodo.type] || 0) + 1;
      }
    });

    resumen.triangulos = Math.round(resumen.triangulos);
    datos.escena = resumen;

    /* Las 12 mallas de mayor superficie, con sus materiales */
    var grandes = [];
    modeloActual.traverse(function (nodo) {
      if (!nodo.isMesh) return;
      var b = new THREE.Box3().setFromObject(nodo);
      var s = b.getSize(new THREE.Vector3());
      var mat = Array.isArray(nodo.material) ? nodo.material[0] : nodo.material;
      grandes.push({
        lado: Math.max(s.x, s.y, s.z),
        tamano: [Math.round(s.x * 10) / 10, Math.round(s.y * 10) / 10, Math.round(s.z * 10) / 10],
        nombre: nodo.name || '(sin nombre)',
        color: mat && mat.color ? '#' + mat.color.getHexString() : null,
        metalness: mat ? mat.metalness : null,
        roughness: mat ? mat.roughness : null,
        opacity: mat ? mat.opacity : null,
        transparente: mat ? mat.transparent : null,
        dobleCara: mat ? (mat.side === THREE.DoubleSide) : null,
        textura: mat ? !!mat.map : null
      });
    });
    grandes.sort(function (a, b) { return b.lado - a.lado; });
    datos.grandes = grandes.slice(0, 12);
    return datos;
  }

  /* =========================================================
     CAPTURA DEL LIENZO 3D (uso de desarrollo)
     ========================================================= */
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

    if (!modeloActual) {
      cargarModelo(claveActual || 'edificio');
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
    restablecerCamara: restablecerCamara,
    inspeccionar: inspeccionar,
    capturar: capturar,
    mostrarModelo: function (v) { if (modeloActual) modeloActual.visible = v !== false; },
    mostrarSuelo: function (v) {
      if (suelo) suelo.visible = v !== false;
      if (cuadricula) cuadricula.visible = v !== false;
    },
    modelos: MODELOS
  };
})();
