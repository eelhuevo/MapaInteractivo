/* =========================================================
   view3d/viewer3d.js — visor tridimensional (Three.js)

   · carga automaticamente el modelo GLB de la planta tipo del
     piso seleccionado (ver data/edificios.js: MODELOS_PISOS)
   · vista "ambas torres": junta los dos modelos en escena
   · marcadores 3D por torre y piso
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

  /* ── CONFIGURACION DE LA PLANTA 3D ────────────────── */
  /* Ancho (unidades de escena) al que se normaliza cada planta
     tipo, para que las dos torres convivan en la misma escena */
  var ANCHO_MODELO_3D = 460;
  /* Altura a la que flotan los marcadores sobre el modelo */
  var alturaMarcaje = 20;

  /* ── ESTADO INTERNO ───────────────────────────────── */
  var inicializado = false;
  var activo = false;
  var escena = null, camara = null, renderizador = null, controles = null;
  var luzDireccional = null, suelo = null, cuadricula = null;
  var grupoPlanta = null;               // grupo que contiene todas las cajas de la planta actual
  var marcadores = [];
  var marcadorUbicacion3D = null;       // marcador HTML "Usted aqui" en 3D
  var espacioPendiente = null;
  var animacionCamara = null;
  var raycaster = null;
  var edificioActual = 1;               // 1 = TA, 2 = TI, 0 = ambas
  var pisoActual = 0;

  /* Arrastre en 3D (modo edicion) */
  var marcadorArrastrando = null;       // {espacio, elemento, posicion}
  var ubicacionArrastrando3D = false;
  var arrastreInicioPantalla = null;    // {x, y} en pantalla

  /* Estado de edicion de posiciones en 3D (igual que 2D) */
  var posicionesOriginales3D = {};      // idEspacio -> {x, y} snapshot al activar
  var pinesModificados3D = {};          // idEspacio -> {x, y} cambios pendientes

  /* =========================================================
     INICIALIZACION DE LA ESCENA
     ========================================================= */
  function iniciar() {
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
    var posiciones = [];
    var mayores = [];   // 1 si el vertice pertenece a una linea mayor

    function alfa(x, z) {
      var d = Math.sqrt(x * x + z * z) * 2;
      if (d <= 0.62) return 1;
      if (d >= 1) return 0;
      var t = (d - 0.62) / 0.38;
      return 1 - t * t * (3 - 2 * t);
    }

    function linea(x0, z0, x1, z1, esMayor) {
      for (var s = 0; s < pasos; s++) {
        var a = s / pasos;
        var b = (s + 1) / pasos;
        var ax = x0 + (x1 - x0) * a, az = z0 + (z1 - z0) * a;
        var bx = x0 + (x1 - x0) * b, bz = z0 + (z1 - z0) * b;
        posiciones.push(ax, 0, az, bx, 0, bz);
        mayores.push(esMayor ? 1 : 0, esMayor ? 1 : 0);
      }
    }

    for (var i = 0; i <= N; i++) {
      var p = -0.5 + i / N;
      var esMayor = (i % 5 === 0);
      linea(p, -0.5, p, 0.5, esMayor);
      linea(-0.5, p, 0.5, p, esMayor);
    }

    var geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
    geometria.setAttribute('color', new THREE.Float32BufferAttribute(
      new Float32Array(posiciones.length / 3 * 4), 4));
    geometria.userData.mayores = mayores;

    var cuad = new THREE.LineSegments(geometria, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false
    }));
    pintarColoresCuadricula(cuad, temaOscuro());
    return cuad;
  }

  /* Colorea la rejilla segun el tema: en oscuro, grises azulados
     claros sobre el fondo noche; en claro, lineas claras por encima
     del azul pizarra para que la reticula siga leyendose */
  function pintarColoresCuadricula(cuadricula, oscuro) {
    var MAYOR = oscuro ? [0.24, 0.29, 0.38] : [0.38, 0.44, 0.55];
    var MENOR = oscuro ? [0.36, 0.42, 0.52] : [0.52, 0.60, 0.71];
    var posicion = cuadricula.geometry.attributes.position;
    var colores = cuadricula.geometry.attributes.color;
    var mayores = cuadricula.geometry.userData.mayores || [];
    for (var k = 0; k < posicion.count; k++) {
      var rgb = mayores[k] ? MAYOR : MENOR;
      var x = posicion.getX(k);
      var z = posicion.getZ(k);
      var d = Math.sqrt(x * x + z * z) * 2;
      var a;
      if (d <= 0.62) {
        a = 1;
      } else if (d >= 1) {
        a = 0;
      } else {
        var t = (d - 0.62) / 0.38;
        a = 1 - t * t * (3 - 2 * t);
      }
      colores.setXYZW(k, rgb[0], rgb[1], rgb[2], a);
    }
    colores.needsUpdate = true;
  }

  /* Tema activo de la interfaz (true = oscuro) */
  function temaOscuro() {
    return !!(document.documentElement &&
      document.documentElement.getAttribute('data-theme') === 'dark');
  }

  /* Color de fondo de la escena segun el tema activo.
     En claro el fondo es un azul pizarra MEDIO: el modelo (blanco,
       ~193 de brillo con la iluminacion actual) se fundia con el
       gris claro de la interfaz; con el pizarra destaca bien */
  function colorFondoEscena() {
    return temaOscuro() ? 0x0b1220 : 0x94a3b8;
  }

  function crearEscena() {
    if (inicializado) return true;

    if (typeof THREE === 'undefined') {
      mostrarAviso(UniMap.i18n.t('v3.sinThree'));
      return false;
    }

    raycaster = new THREE.Raycaster();

    escena = new THREE.Scene();
    /* Fondo algo mas oscuro que el modelo (paredes blancas): si no,
       el contorno se funde con el fondo y todo parece "blanco solo".
       En tema oscuro el fondo es azul noche para que el modelo
       (claro) siga destacando */
    escena.background = new THREE.Color(colorFondoEscena());
    /* La camara arranca a ~1400 unidades de la planta, asi que la
       niebla inicial usa ya las mismas distancias que encuadrar()
       (2x y 6x la extension base de la escena, 800). Con valores
       cortos (260/700) el modelo entero quedaba fundido con el
       fondo y solo se veia al acercar mucho la camara */
    escena.fog = new THREE.Fog(colorFondoEscena(), 800 * 2, 800 * 6);
    document.addEventListener('tema:cambiado', function () {
      if (!escena) return;
      escena.background = new THREE.Color(colorFondoEscena());
      /* Solo se cambia el COLOR: las distancias las fija encuadrar()
         segun la escena. Recrear la niebla con distancias fijas la
         dejaba demasiado cerca y el modelo desaparecia (efecto
         neblina) hasta hacer mucho zoom */
      if (escena.fog) escena.fog.color.set(colorFondoEscena());
      if (cuadricula) pintarColoresCuadricula(cuadricula, temaOscuro());
    });

    camara = new THREE.PerspectiveCamera(45, 1, 0.1, 4000);
    camara.position.set(70, 60, 110);

    try {
      renderizador = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
    } catch (e) {
      mostrarAviso(UniMap.i18n.t('v3.sinWebgl'));
      return false;
    }
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (THREE.sRGBEncoding !== undefined) renderizador.outputEncoding = THREE.sRGBEncoding;
    renderizador.shadowMap.enabled = true;
    renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
    renderizador.toneMapping = THREE.NoToneMapping;

    /* Suma de luces deliberadamente <= ~1: si supera 1, las caras
       iluminadas de los materiales blancos se recortan y el modelo
       se ve uniformemente blanco, sin sombreado legible */
    escena.add(new THREE.HemisphereLight(0xffffff, 0x6f7f99, 0.32));
    escena.add(new THREE.AmbientLight(0xffffff, 0.08));

    luzDireccional = new THREE.DirectionalLight(0xffffff, 0.5);
    luzDireccional.position.set(90, 140, 60);
    luzDireccional.castShadow = true;
    luzDireccional.shadow.mapSize.width = 2048;
    luzDireccional.shadow.mapSize.height = 2048;
    luzDireccional.shadow.camera.near = 1;
    luzDireccional.shadow.camera.far = 600;
    luzDireccional.shadow.bias = -0.0004;
    luzDireccional.shadow.normalBias = 0.04;
    escena.add(luzDireccional);

    var relleno = new THREE.DirectionalLight(0xbfdbfe, 0.1);
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
  /* ── PLANTA 3D: MODELOS GLB POR TORRE Y PISO ──────── */
  function limpiarPlanta() {
    if (grupoPlanta && grupoPlanta.parent) {
      escena.remove(grupoPlanta);
    }
    grupoPlanta = null;
  }

  /* Centro lógico = mismo sistema que el mapa 2D.
   2D dibuja la planta centrada en (400, 300).
   Torre 2 en modo "ambas" se desplaza con OFFSET_TORRE_2. */
  function centroTorre(torre, edificioId) {
    var offset = (torre === 2 && edificioId === 0)
      ? (UniMap.datos.OFFSET_TORRE_2 || 0)
      : 0;
    return {
      x: 400 + offset,
      z: 300
    };
  }

  /* Carga el modelo GLB de la planta tipo del piso seleccionado
     (segun data/edificios.js) y lo coloca en la escena. En modo
     "ambas torres" carga y junta los dos modelos. */
  function renderizarPlanta(edificioId, piso) {
    limpiarPlanta();

    if (!crearEscena()) return;

    if (!UniMap.modelos || !UniMap.datos.modeloDePiso) {
      mostrarAviso(UniMap.i18n.t('v3.sinModelos'));
      return;
    }

    grupoPlanta = new THREE.Group();
    grupoPlanta.name = 'Planta ' + piso + ' - Edificio ' + edificioId;
    escena.add(grupoPlanta);

    /* Torres que aportan modelo en este piso */
    var torres = edificioId === 0 ? [1, 2] : [edificioId];
    var cargas = [];
    for (var t = 0; t < torres.length; t++) {
      var torre = torres[t];
      var pisoTorre = piso;
      if (edificioId === 0) {
        if (torre === 1 && UniMap.datos.obtenerPisoTA) pisoTorre = UniMap.datos.obtenerPisoTA();
        if (torre === 2 && UniMap.datos.obtenerPisoTI) pisoTorre = UniMap.datos.obtenerPisoTI();
      }
      if (!UniMap.datos.tienePiso(torre, pisoTorre)) continue;
      var definicion = UniMap.datos.modeloDePiso(torre, pisoTorre);
      if (!definicion) continue;
      cargas.push({ torre: torre, definicion: definicion, piso: pisoTorre });
    }

    if (!cargas.length) {
      ocultarCarga();
      encuadrar();
      actualizarMarcadores();
      return;
    }

    var restantes = cargas.length;
    var alturaMaxima = 0;
    var huboError = false;
    mostrarCarga(20, UniMap.i18n.t('v3.cargandoModelo'));

    for (var c = 0; c < cargas.length; c++) {
      cargarModeloDePiso(cargas[c].torre, cargas[c].definicion);
    }

    function cargarModeloDePiso(torre, definicion) {
      UniMap.modelos.clonar(definicion.archivo, function (err, grupo) {
        /* Si mientras cargaba se cambio de piso/torre, ignorar */
        if (!grupoPlanta) return;

        restantes--;
        if (err) {
          huboError = true;
        } else {
          var info = UniMap.modelos.preparar(grupo);
          /* Colores en lineal (salida sRGB) + castShadow/receiveShadow */
          if (UniMap.modelos.prepararRender) UniMap.modelos.prepararRender(grupo);
          var centro = centroTorre(torre, edificioId);
          var medidas = UniMap.modelos.normalizar(grupo, info, ANCHO_MODELO_3D, centro.x, centro.z);
          medidas.grupo.name = definicion.archivo;
          grupoPlanta.add(medidas.grupo);
          alturaMaxima = Math.max(alturaMaxima, medidas.altura);
        }

        mostrarCarga(Math.round((cargas.length - restantes) / cargas.length * 100),
          UniMap.i18n.t('v3.cargandoModelo'));

        if (restantes > 0) return;

        ocultarCarga();
        if (huboError) mostrarAviso(UniMap.i18n.t('v3.errorModelo'));
        alturaMarcaje = Math.max(12, Math.min(alturaMaxima + 4, 120));
        encuadrar();
        actualizarMarcadores();
      });
    }
  }

  /* Encuadra la cámara sobre la planta real (bounding box),
   no sobre un rectángulo teórico desfasado. */
  function encuadrar() {
    if (!camara || !controles) return;

    var caja = null;
    if (grupoPlanta && grupoPlanta.children.length) {
      caja = new THREE.Box3().setFromObject(grupoPlanta);
    }

    var minX, maxX, minZ, maxZ, altoTotal;

    if (caja && isFinite(caja.min.x) && isFinite(caja.max.x)) {
      minX = caja.min.x;
      maxX = caja.max.x;
      minZ = caja.min.z;
      maxZ = caja.max.z;
      altoTotal = Math.max(8, caja.max.y - caja.min.y);
    } else {
      /* Fallback si aún no hay modelo */
      var offsetTorre2 = (edificioActual === 0 ? (UniMap.datos.OFFSET_TORRE_2 || 0) : 0);
      minX = 0;
      maxX = 800 + offsetTorre2;
      minZ = 0;
      maxZ = 600;
      altoTotal = alturaMarcaje || 20;
    }

    var anchoTotal = Math.max(40, maxX - minX);
    var fondoTotal = Math.max(40, maxZ - minZ);
    var centroX = (minX + maxX) / 2;
    var centroZ = (minZ + maxZ) / 2;
    var extension = Math.max(anchoTotal, fondoTotal, 1);

    /* Suelo + cuadrícula centrados en el modelo */
    var base = extension * 2.4;
    if (suelo) {
      suelo.position.set(centroX, -0.02, centroZ);
      suelo.scale.set(base, base, 1);
    }
    if (cuadricula) {
      cuadricula.position.set(centroX, 0.01, centroZ);
      cuadricula.scale.set(base, 1, base);
    }

    /* Luz */
    var distanciaLuz = extension * 1.6;
    if (luzDireccional) {
      luzDireccional.position.set(
        centroX + distanciaLuz * 0.6,
        extension * 1.8,
        centroZ + distanciaLuz * 0.5
      );
      luzDireccional.target.position.set(centroX, 0, centroZ);
      if (luzDireccional.target.parent !== escena) escena.add(luzDireccional.target);
      luzDireccional.shadow.camera.left = -distanciaLuz;
      luzDireccional.shadow.camera.right = distanciaLuz;
      luzDireccional.shadow.camera.top = distanciaLuz;
      luzDireccional.shadow.camera.bottom = -distanciaLuz;
      luzDireccional.shadow.camera.far = extension * 10;
      luzDireccional.shadow.camera.updateProjectionMatrix();
    }

    if (escena.fog) {
      escena.fog.near = extension * 2.2;
      escena.fog.far = extension * 7;
    }

    /* Vista cercana al 2D: casi cenital, ligera perspectiva */
    var fov = camara.fov * Math.PI / 180;
    var maximo = Math.max(anchoTotal, fondoTotal, altoTotal);
    var distCam = (maximo / 2) / Math.tan(fov / 2) * 1.55;

    var targetY = altoTotal * 0.15;
    controles.target.set(centroX, targetY, centroZ);

    /* Cámara arriba-atrás: se parece al plano 2D */
    camara.position.set(
      centroX,
      targetY + distCam * 0.92,
      centroZ + distCam * 0.55
    );

    camara.near = Math.max(0.1, maximo / 400);
    camara.far = maximo * 50;
    camara.updateProjectionMatrix();

    controles.minDistance = maximo * 0.08;
    controles.maxDistance = maximo * 10;
    controles.update();
  }

  /* Sincronizar edificio y piso desde el estado global.
     Si la vista 3D no esta activa solo se invalida la planta pintada
     (se volvera a dibujar al activarla), para no trabajar en 2D. */
  function sincronizarEstado(forzar) {
    /* Ojo: 0 (ambas torres) es un valor valido, no se sustituye por 1 */
    var nuevoEdificio = (estado.edificioActual === undefined || estado.edificioActual === null)
      ? 1
      : estado.edificioActual;
    var nuevoPiso = estado.pisoActual || 0;
    var cambio = nuevoEdificio !== edificioActual || nuevoPiso !== pisoActual;

    if (!activo) {
      if (forzar || cambio || grupoPlanta) {
        edificioActual = nuevoEdificio;
        pisoActual = nuevoPiso;
        limpiarPlanta();
      }
      return;
    }

    /* Tambien hay que pintar si la escena aun no tiene planta cargada
       (primera activacion de la vista 3D) */
    if (forzar || !grupoPlanta || cambio) {
      edificioActual = nuevoEdificio;
      pisoActual = nuevoPiso;
      renderizarPlanta(edificioActual, pisoActual);
    }
  }

  /* =========================================================
     MARCADORES 3D PROYECTADOS
     ========================================================= */

  /* Posicion de un espacio sobre la planta 2D renderizada en 3D.
     estado.espacios ya trae las coordenadas finales (en modo "ambas
     torres" la torre 2 viene desplazada), asi que no se suma nada. */
  function calcularPosicion(espacio) {
    if (!grupoPlanta) return null;
    return new THREE.Vector3(
      espacio.x + espacio.ancho / 2,
      alturaMarcaje,
      espacio.y + espacio.alto / 2
    );
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

    if (!grupoPlanta || !grupoPlanta.children.length) {
      mostrarAviso(UniMap.i18n.t('v3.eligeModelo'));
      return;
    }

    ocultarAviso();

    var visibles = UniMap.filtros.espaciosInteractuales();
    var seleccionado = estado.espacioSeleccionado;

    /* ── Marcador "Usted aqui" en 3D ── */
    if (!marcadorUbicacion3D) {
      var elUbi = document.createElement('div');
      elUbi.className = 'marcador-3d marcador-ubicacion';
      elUbi.innerHTML = '<span class="punto"></span><span class="texto">Usted aqui</span>';
      elUbi.setAttribute('title', 'Usted aqui');
      capa.appendChild(elUbi);
      marcadorUbicacion3D = { elemento: elUbi };
      conectarMarcadorUbicacion(elUbi);
    }

    for (var v = 0; v < visibles.length; v++) {
      var espacio = visibles[v];

      /* Solo marcar espacios de la planta actual (edificio + piso) */
      if (edificioActual === 0) {
        var pisoEsperado = (espacio.edificio === 1)
          ? (UniMap.datos.obtenerPisoTA ? UniMap.datos.obtenerPisoTA() : pisoActual)
          : (UniMap.datos.obtenerPisoTI ? UniMap.datos.obtenerPisoTI() : pisoActual);
        if (espacio.piso !== pisoEsperado) continue;
      } else {
        if (espacio.edificio !== edificioActual) continue;
        if (espacio.piso !== pisoActual) continue;
      }
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

    /* ── Arrastre en modo edicion (solo admin) ── */
    elemento.addEventListener('pointerdown', function (e) {
      if (!modoEdicionPines3D()) return;
      e.stopPropagation();
      marcadorArrastrando = { espacio: espacio, elemento: elemento, posicion: posicion };
      arrastreInicioPantalla = { x: e.clientX, y: e.clientY };
      elemento.style.cursor = 'grabbing';
      contenedor.style.cursor = 'grabbing';
    });
  }

  function modoEdicionPines3D() {
    return (UniMap.mapa2D && UniMap.mapa2D.estaEnModoEdicion && UniMap.mapa2D.estaEnModoEdicion()
      && estado.usuarioActual && estado.usuarioActual.rol === 'admin');
  }

  /* ── Arrastre del marcador "Usted aqui" en 3D ── */
  function conectarMarcadorUbicacion(elemento) {
    elemento.addEventListener('pointerdown', function (e) {
      if (!modoEdicionPines3D()) return;
      e.stopPropagation();
      ubicacionArrastrando3D = true;
      arrastreInicioPantalla = { x: e.clientX, y: e.clientY };
      elemento.style.cursor = 'grabbing';
      contenedor.style.cursor = 'grabbing';
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

    /* Marcador "Usted aqui" en 3D */
    if (marcadorUbicacion3D && estado.ubicacionUsuario) {
      var posUbi = new THREE.Vector3(
        estado.ubicacionUsuario.x,
        alturaMarcaje,
        estado.ubicacionUsuario.y
      );
      var v = posUbi.clone().project(camara);
      var fuera = v.z > 1 || v.x < -1.15 || v.x > 1.15 || v.y < -1.15 || v.y > 1.15;
      if (fuera) {
        marcadorUbicacion3D.elemento.style.display = 'none';
      } else {
        marcadorUbicacion3D.elemento.style.display = 'flex';
        marcadorUbicacion3D.elemento.style.left = ((v.x * 0.5 + 0.5) * ancho) + 'px';
        marcadorUbicacion3D.elemento.style.top = ((-v.y * 0.5 + 0.5) * alto) + 'px';
      }
    }
  }

  /* ── RAYCAST: punto en el suelo desde coordenadas de pantalla ======
     Devuelve {x, y} en unidades del plano (equivalente a x, y del espacio) */
  function raycasterSuelo(pantallaX, pantallaY) {
    if (!camara || !raycaster) return null;

    var rect = contenedor.getBoundingClientRect();
    var nx = ((pantallaX - rect.left) / rect.width) * 2 - 1;
    var ny = -((pantallaY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(new THREE.Vector2(nx, ny), camara);

    /* Plano del suelo en Y = alturaMarcaje (misma altura que los marcadores) */
    var planoY = alturaMarcaje;
    var direccion = raycaster.ray.direction;
    var origen = raycaster.ray.origin;

    if (Math.abs(direccion.y) < 0.001) return null;

    var t = (planoY - origen.y) / direccion.y;
    if (t < 0) return null;

    var punto = new THREE.Vector3().copy(origen).add(direccion.multiplyScalar(t));
    return { x: punto.x, y: punto.z };
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

    if (!grupoPlanta) {
      espacioPendiente = espacio;
      sincronizarEstado();
      return false;
    }

    var marcador = buscarMarcador(espacio.id);
    if (!marcador) {
      actualizarMarcadores();
      marcador = buscarMarcador(espacio.id);
      if (!marcador) return false;
    }

    var destino = marcador.posicion;
    var maximo = Math.max(800, 600);
    var distancia = maximo * 0.35;

    var direccion = camara.position.clone().sub(controles.target);
    direccion.y = Math.max(distancia * 0.6, direccion.y);
    direccion.normalize().multiplyScalar(distancia);

    animarCamara(destino.clone().add(direccion), destino, 750);

    seleccionarEspacio(espacio, marcador.posicion);
    return true;
  }

  function restablecerCamara() {
    if (!inicializado || !activo) return;
    /* Reencuadrar la planta actual (si aun no hay modelos
       cargados, se vuelve a dibujar la escena entera) */
    if (grupoPlanta && grupoPlanta.children.length) encuadrar();
    else renderizarPlanta(edificioActual, pisoActual);
    UniMap.tooltip.ocultar();
  }

  /* =========================================================
     INTERFAZ DEL VISOR
     ========================================================= */
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

  /* ── MODO EDICION DE POSICIONES EN 3D (solo admin) ─────
     Igual que el 2D: snapshot al activar, restaurar al cancelar,
     guardar con notificaciones y avisos. ─────────────── */
  function activarEdicionPosiciones3D() {
    if (!estado.usuarioActual || estado.usuarioActual.rol !== 'admin') {
      util.notificar(UniMap.i18n ? UniMap.i18n.t('adm.sinPermisos') : 'Solo administrador');
      return;
    }
    /* Guardar snapshot de posiciones actuales antes de editar */
    var visibles = UniMap.filtros.espaciosInteractuales ? UniMap.filtros.espaciosInteractuales() : [];
    posicionesOriginales3D = {};
    for (var i = 0; i < visibles.length; i++) {
      var s = visibles[i];
      posicionesOriginales3D[s.id] = { x: s.x, y: s.y };
    }
    pinesModificados3D = {};
    var btnEditar = util.el('boton-editar-posiciones');
    var btnGuardar = util.el('boton-guardar-posiciones');
    if (btnEditar) {
      btnEditar.classList.add('activo');
      btnEditar.setAttribute('data-i18n-title', 'top.cancelarEdicion');
      btnEditar.title = UniMap.i18n ? UniMap.i18n.t('top.cancelarEdicion') : 'Cancelar edicion';
    }
    if (btnGuardar) btnGuardar.classList.remove('hidden');
    contenedor.style.cursor = 'crosshair';
    util.notificar('Modo edicion activado: arrastra los marcadores donde quieras, luego pulsa Guardar o Cancelar', 5000);
    actualizarMarcadores();
  }

  function desactivarEdicionPosiciones3D() {
    /* Restaurar posiciones originales al cancelar */
    if (Object.keys(posicionesOriginales3D).length > 0) {
      var visibles = UniMap.filtros.espaciosInteractuales ? UniMap.filtros.espaciosInteractuales() : [];
      for (var i = 0; i < visibles.length; i++) {
        var s = visibles[i];
        var orig = posicionesOriginales3D[s.id];
        if (orig) {
          s.x = orig.x;
          s.y = orig.y;
        }
      }
    }
    pinesModificados3D = {};
    posicionesOriginales3D = {};
    var btnEditar = util.el('boton-editar-posiciones');
    var btnGuardar = util.el('boton-guardar-posiciones');
    if (btnEditar) {
      btnEditar.classList.remove('activo');
      btnEditar.setAttribute('data-i18n-title', 'top.editarPosiciones');
      btnEditar.title = UniMap.i18n ? UniMap.i18n.t('top.editarPosiciones') : 'Editar posiciones';
    }
    if (btnGuardar) btnGuardar.classList.add('hidden');
    contenedor.style.cursor = '';
    actualizarMarcadores();
    if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
    /* Aplicar nuevo idioma si es necesario */
    if (UniMap.i18n) UniMap.i18n.aplicar();
  }

  /* Guarda los pines movidos en 3D y devuelve sus ids (map2d.js los
     sincroniza con el backend junto a los del plano 2D) */
  function guardarPosiciones3D() {
    var ids = Object.keys(pinesModificados3D);
    if (ids.length === 0) {
      /* Sin cambios en 3D: descartar el snapshot. Si no, al salir del modo
         edicion se "restauraban" las posiciones viejas sobre los pines que
         el 2D acababa de guardar y volvian a su sitio anterior */
      posicionesOriginales3D = {};
      return [];
    }
    for (var k = 0; k < ids.length; k++) {
      UniMap.personalizacion.guardarEdicion(ids[k], pinesModificados3D[ids[k]]);
    }
    pinesModificados3D = {};
    posicionesOriginales3D = {};
    desactivarEdicionPosiciones3D();
    actualizarMarcadores();
    if (UniMap.mapa2D) UniMap.mapa2D.dibujar();
    return ids;
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

    /* ── Arrastre global: mover marcadores 3D en modo edicion ── */
    document.addEventListener('pointermove', function (e) {
      if (marcadorArrastrando) {
        var dx = e.clientX - arrastreInicioPantalla.x;
        var dy = e.clientY - arrastreInicioPantalla.y;
        var el = marcadorArrastrando.elemento;
        var left = parseFloat(el.style.left || '0') + dx;
        var top = parseFloat(el.style.top || '0') + dy;
        el.style.left = left + 'px';
        el.style.top = top + 'px';
        arrastreInicioPantalla = { x: e.clientX, y: e.clientY };
        return;
      }
      if (ubicacionArrastrando3D && marcadorUbicacion3D) {
        var dx = e.clientX - arrastreInicioPantalla.x;
        var dy = e.clientY - arrastreInicioPantalla.y;
        var el = marcadorUbicacion3D.elemento;
        var left = parseFloat(el.style.left || '0') + dx;
        var top = parseFloat(el.style.top || '0') + dy;
        el.style.left = left + 'px';
        el.style.top = top + 'px';
        arrastreInicioPantalla = { x: e.clientX, y: e.clientY };
        return;
      }
    });

    document.addEventListener('pointerup', function (e) {
      /* ── Soltar marcador de espacio en modo edicion ── */
      if (marcadorArrastrando) {
        var el = marcadorArrastrando.elemento;
        var px = parseFloat(el.style.left || '0');
        var py = parseFloat(el.style.top || '0');
        var suelo = raycasterSuelo(px, py);
        if (suelo) {
          var esp = marcadorArrastrando.espacio;
          /* Misma validacion que en 2D: solo celdas transitables */
          var ajuste = (UniMap.mapa2D && UniMap.mapa2D.ajustarCentro)
            ? UniMap.mapa2D.ajustarCentro(esp.edificio, esp.piso, suelo.x, suelo.y)
            : { x: suelo.x, y: suelo.y };
          if (ajuste) {
            esp.x = Math.round(ajuste.x - esp.ancho / 2);
            esp.y = Math.round(ajuste.y - esp.alto / 2);
            pinesModificados3D[esp.id] = { x: esp.x, y: esp.y };
          }
        }
        marcadorArrastrando.elemento.style.cursor = '';
        marcadorArrastrando = null;
        arrastreInicioPantalla = null;
        contenedor.style.cursor = '';
        actualizarMarcadores();
        return;
      }

      /* ── Soltar marcador "Usted aqui" ── */
      if (ubicacionArrastrando3D && marcadorUbicacion3D) {
        var el = marcadorUbicacion3D.elemento;
        var px = parseFloat(el.style.left || '0');
        var py = parseFloat(el.style.top || '0');
        var suelo = raycasterSuelo(px, py);
        if (suelo) {
          estado.ubicacionUsuario = { x: suelo.x, y: suelo.y };
        }
        ubicacionArrastrando3D = false;
        el.style.cursor = '';
        arrastreInicioPantalla = null;
        contenedor.style.cursor = '';
        actualizarPosicionesMarcadores();
        return;
      }
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
    var datos = { inicializado: inicializado, activo: activo, edificioActual: edificioActual, pisoActual: pisoActual };
    if (!inicializado) return datos;

    datos.camara = {
      posicion: camara.position.toArray().map(function (v) { return Math.round(v * 100) / 100; }),
      objetivo: controles.target.toArray().map(function (v) { return Math.round(v * 100) / 100; })
    };
    datos.marcadores = marcadores.length;

    /* Diagnostico: caja real (mundo) de la planta cargada */
    if (grupoPlanta) {
      var caja = new THREE.Box3().setFromObject(grupoPlanta);
      datos.planta = {
        hijos: grupoPlanta.children.length,
        min: caja.min.toArray().map(function (v) { return Math.round(v); }),
        max: caja.max.toArray().map(function (v) { return Math.round(v); })
      };
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
    sincronizarEstado(true);

    /* Asegura encuadre cuando el layout ya tiene tamaño */
    requestAnimationFrame(function () {
      redimensionar();
      if (grupoPlanta && grupoPlanta.children.length) {
        encuadrar();
        actualizarMarcadores();
      }
    });

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
    restablecerCamara: restablecerCamara,
    sincronizarEstado: sincronizarEstado,
    /* Vuelve a pintar la planta actual (su contenido puede haber
       cambiado: filtros de torre, ediciones del administrador...) */
    repintar: function () { sincronizarEstado(true); },
    inspeccionar: inspeccionar,
    capturar: capturar,
    mostrarSuelo: function (v) {
      if (suelo) suelo.visible = v !== false;
      if (cuadricula) cuadricula.visible = v !== false;
    },
    /* Modo edicion de posiciones (igual que 2D) */
    activarEdicionPosiciones: activarEdicionPosiciones3D,
    desactivarEdicionPosiciones: desactivarEdicionPosiciones3D,
    guardarPosiciones: guardarPosiciones3D
  };
})();
