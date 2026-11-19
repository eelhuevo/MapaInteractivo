/* =========================================================
   modelos.js — modelos 3D de las plantas tipo (GLB y FBX)

   Un solo punto de verdad para los modelos de los pisos:
   · cargar / clonar modelos (cacheados; GLB con GLTFLoader,
     FBX con FBXLoader)
   · preparar: oculta piezas dispersas y calcula la caja real
   · normalizar: escala y coloca la planta en la escena 3D
   · dibujarPlano: redibuja el modelo como un plano 2D (no es
     una foto del 3D: se proyecta cada pieza sobre el plano y
     se pintan sus contornos como en un plano de arquitecto)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;

  var CARPETA = 'models/';
  var cacheModelos = {};     // archivo -> objeto 3D (origen cacheado)
  var cargasEnCurso = {};    // archivo -> [callbacks]
  var cachePlanos = {};      // 'ed-piso' -> canvas 2D del plano
  var pendientesPlanos = {}; // 'ed-piso' -> [callbacks]

  /* Paletas del plano redibujado (según tema).
     El fondo es transparente: el plano se dibuja directamente
     sobre el fondo del mapa, sin caja blanca ni marco. */
  var PALETA_CLARA = {
    suelo: '#ffffff',
    sueloBorde: '#cbd5e1',
    muro: '#78859a',
    muroBorde: '#3f4c60',
    mueble: '#cbd5e1',
    muebleBorde: '#94a3b8'
  };

  var PALETA_OSCURA = {
    suelo: '#18233a',
    sueloBorde: '#33415c',
    muro: '#8b98ad',
    muroBorde: '#aab6c8',
    mueble: '#3a4a66',
    muebleBorde: '#5a6a88'
  };

  function paleta() {
    var oscuro = document.documentElement &&
      document.documentElement.getAttribute('data-theme') === 'dark';
    return oscuro ? PALETA_OSCURA : PALETA_CLARA;
  }

  /* ── CARGA Y CLONACION ──────────────────────────────── */
  function cargar(archivo, cb) {
    if (cacheModelos[archivo]) return cb(null, cacheModelos[archivo]);
    if (typeof THREE === 'undefined') return cb(new Error('Three.js no disponible'));

    if (cargasEnCurso[archivo]) {
      cargasEnCurso[archivo].push(cb);
      return;
    }
    cargasEnCurso[archivo] = [cb];

    function listo(objeto) {
      var pendientes = cargasEnCurso[archivo] || [];
      cargasEnCurso[archivo] = null;
      cacheModelos[archivo] = objeto;
      for (var i = 0; i < pendientes.length; i++) pendientes[i](null, objeto);
    }

    function fallo(error) {
      var pendientes = cargasEnCurso[archivo] || [];
      cargasEnCurso[archivo] = null;
      for (var i = 0; i < pendientes.length; i++) {
        pendientes[i](error || new Error('No se pudo cargar ' + archivo));
      }
    }

    if (/\.fbx$/i.test(archivo)) {
      if (typeof THREE.FBXLoader === 'undefined') return fallo(new Error('FBXLoader no disponible'));
      new THREE.FBXLoader().load(CARPETA + archivo, listo, undefined, fallo);
    } else {
      if (typeof THREE.GLTFLoader === 'undefined') return fallo(new Error('GLTFLoader no disponible'));
      new THREE.GLTFLoader().load(CARPETA + archivo + '?t=' + Date.now(), function (gltf) {
        listo(gltf.scene);
      }, undefined, fallo);
    }
  }

  /* Copia independiente del modelo (para poder mostrar la misma
     planta tipo en varios sitios a la vez sin tocar el original) */
  function clonar(archivo, cb) {
    cargar(archivo, function (err, objeto) {
      if (err) return cb(err);
      cb(null, objeto.clone(true));
    });
  }

  /* ── PREPARACION: PIEZAS DISPERSAS Y CAJA REAL ─────── */
  /* Los modelos traen algunas piezas sueltas muy lejos del
     resto. Se ocultan y se calcula la caja real de la planta
     para poder escalarla/encuadrarla. */
  function preparar(grupo) {
    grupo.updateMatrixWorld(true);

    var centros = [];   // { malla, x, y, z, caja }
    grupo.traverse(function (objeto) {
      if (!objeto.isMesh || !objeto.geometry) return;
      var caja = new THREE.Box3().setFromObject(objeto);
      if (!isFinite(caja.min.x) || caja.isEmpty()) return;
      centros.push({
        malla: objeto,
        x: (caja.min.x + caja.max.x) / 2,
        y: (caja.min.y + caja.max.y) / 2,
        z: (caja.min.z + caja.max.z) / 2,
        caja: caja
      });
    });

    /* Materiales "metalicos" sin mapa de entorno: en three.js se
       ven casi negros, asi que se limita la metalicidad para que
       el modelo se lea bien en la vista 3D */
    grupo.traverse(function (objeto) {
      if (!objeto.isMesh || !objeto.material) return;
      var mats = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
      for (var m = 0; m < mats.length; m++) {
        var mat = mats[m];
        if (mat.metalness !== undefined && mat.metalness > 0.15) {
          mat.metalness = 0.15;
          if (mat.roughness !== undefined && mat.roughness < 0.6) mat.roughness = 0.6;
        }
      }
    });

    /* Cerillas de Tukey por eje (vallas 3*IQR): lo que quede
       muy lejos del grupo principal se considera disperso */
    var limites = {};
    ['x', 'y', 'z'].forEach(function (eje) {
      var vals = centros.map(function (c) { return c[eje]; }).sort(function (a, b) { return a - b; });
      if (!vals.length) return;
      var q1 = vals[Math.floor(vals.length * 0.25)];
      var q3 = vals[Math.floor(vals.length * 0.75)];
      var iqr = q3 - q1;
      limites[eje] = { bajo: q1 - 3 * iqr, alto: q3 + 3 * iqr };
    });

    for (var i = 0; i < centros.length; i++) {
      var c = centros[i];
      var fuera =
        (limites.x && (c.x < limites.x.bajo || c.x > limites.x.alto)) ||
        (limites.y && (c.y < limites.y.bajo || c.y > limites.y.alto)) ||
        (limites.z && (c.z < limites.z.bajo || c.z > limites.z.alto));
      if (fuera) c.malla.visible = false;
    }

    /* Caja real con las piezas dispersas ya ocultas */
    var caja = new THREE.Box3();
    for (var j = 0; j < centros.length; j++) {
      if (!centros[j].malla.visible) continue;
      caja.union(centros[j].caja);
    }
    if (caja.isEmpty() && centros.length) {
      caja = new THREE.Box3();
      for (var k = 0; k < centros.length; k++) caja.union(centros[k].caja);
    }

    return {
      caja: caja,
      minX: caja.min.x, maxX: caja.max.x,
      minY: caja.min.y, maxY: caja.max.y,
      minZ: caja.min.z, maxZ: caja.max.z,
      ancho: caja.max.x - caja.min.x,
      fondo: caja.max.z - caja.min.z,
      altura: caja.max.y - caja.min.y,
      centroX: (caja.min.x + caja.max.x) / 2,
      centroZ: (caja.min.z + caja.max.z) / 2,
      piezas: centros.length
    };
  }

  /* Escala la planta para que mida `anchoObjetivo` de ancho y la
     coloca con el centro de su huella en (destinoX, destinoZ),
     apoyada en el suelo (y = 0). La escala/rotacion propia del
     modelo se respeta: se envuelve en un contenedor y se actua
     sobre el, no sobre la raiz del modelo. Devuelve el contenedor
     y las medidas ya escaladas. */
  function normalizar(grupo, info, anchoObjetivo, destinoX, destinoZ) {
    var escala = anchoObjetivo / Math.max(info.ancho, 1e-6);
    var contenedor = new THREE.Group();
    contenedor.add(grupo);
    contenedor.scale.setScalar(escala);
    contenedor.position.set(
      destinoX - info.centroX * escala,
      -info.minY * escala,
      destinoZ - info.centroZ * escala
    );
    return {
      grupo: contenedor,
      escala: escala,
      ancho: info.ancho * escala,
      fondo: info.fondo * escala,
      altura: info.altura * escala
    };
  }

  /* ═══ PLANO 2D REDIBUJADO DEL MODELO ═══════════════════
     El modelo 3D se convierte en un plano 2D de verdad: cada
     pieza se proyecta sobre el plano XZ y se pintan sus
     contornos (suelo claro, mobiliario en gris, muros en
     gris oscuro), como en un plano de arquitecto. */

  function envolver(puntos) {
    /* Cierre convexo (monotone chain) sobre X/Z */
    var pts = puntos.slice().sort(function (a, b) {
      return a[0] === b[0] ? a[1] - b[1] : a[0] - b[0];
    });
    function cr(o, a, b) {
      return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }
    var abajo = [], arriba = [], i;
    for (i = 0; i < pts.length; i++) {
      while (abajo.length >= 2 && cr(abajo[abajo.length - 2], abajo[abajo.length - 1], pts[i]) <= 0) abajo.pop();
      abajo.push(pts[i]);
    }
    for (i = pts.length - 1; i >= 0; i--) {
      while (arriba.length >= 2 && cr(arriba[arriba.length - 2], arriba[arriba.length - 1], pts[i]) <= 0) arriba.pop();
      arriba.push(pts[i]);
    }
    abajo.pop();
    arriba.pop();
    var cierre = abajo.concat(arriba);
    return cierre.length >= 3 ? cierre : puntos.slice(0, 3);
  }

  function aclarar(color) {
    if (!color) return paleta().mueble;
    var r = Math.round(color.r * 255 + (255 - color.r * 255) * 0.55);
    var g = Math.round(color.g * 255 + (255 - color.g * 255) * 0.55);
    var b = Math.round(color.b * 255 + (255 - color.b * 255) * 0.55);
    /* Si el material es casi blanco o casi negro, se usa el gris
       neutro del plano para que el dibujo no quede plano */
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn < 12) {
      var base = (r + g + b) / 3;
      if (base > 235 || base < 40) return paleta().mueble;
    }
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function piezasDelModelo(grupo) {
    grupo.updateMatrixWorld(true);

    var v = new THREE.Vector3();
    var piezas = [];

    grupo.traverse(function (objeto) {
      if (!objeto.isMesh || !objeto.visible || !objeto.geometry) return;
      var pos = objeto.geometry.attributes.position;
      if (!pos) return;

      /* En modelos muy densos se muestrea para no rehacer el
         contorno sobre decenas de miles de vertices */
      var paso = pos.count > 2500 ? Math.ceil(pos.count / 2500) : 1;
      var puntos = [];
      var maxY = -Infinity, minY = Infinity;

      for (var i = 0; i < pos.count; i += paso) {
        v.fromBufferAttribute(pos, i).applyMatrix4(objeto.matrixWorld);
        if (v.y > maxY) maxY = v.y;
        if (v.y < minY) minY = v.y;
        puntos.push([v.x, v.z]);
      }
      if (puntos.length < 3 || maxY === -Infinity) return;

      var contorno = envolver(puntos);
      var area = 0;
      for (var k = 0; k < contorno.length; k++) {
        var a = contorno[k];
        var b = contorno[(k + 1) % contorno.length];
        area += a[0] * b[1] - b[0] * a[1];
      }
      area = Math.abs(area) / 2;
      if (area < 1e-9) return;

      var mats = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
      piezas.push({
        contorno: contorno,
        area: area,
        altura: maxY - minY,
        color: (mats[0] && mats[0].color) ? mats[0].color : null
      });
    });

    return piezas;
  }

  /* Nivel de dibujo de una pieza: 0 suelo, 1 mobiliario, 2 muro */
  function nivelPieza(pieza, info, areaPlancha) {
    if (pieza.area > areaPlancha * 0.15 && pieza.altura < info.altura * 0.2) return 0;
    /* Antes 0.45: en TI muchas paredes son más bajas y no se detectaban */
    if (pieza.altura > info.altura * 0.28) return 2;
    return 1;
  }

  function pintarPlano(grupo, info, cb) {
    var LARGO = 1100;                       /* px del lado mayor */
    var aspecto = Math.max(info.ancho, 1e-6) / Math.max(info.fondo, 1e-6);
    var w = aspecto >= 1 ? LARGO : Math.round(LARGO * aspecto);
    var h = aspecto >= 1 ? Math.round(LARGO / aspecto) : LARGO;

    var lienzo = document.createElement('canvas');
    lienzo.width = w;
    lienzo.height = h;
    var ctx = lienzo.getContext('2d');

    /* Sin fondo: el lienzo queda transparente y el plano se
       integra con el fondo del mapa (sin caja blanca) */
    var PAL = paleta();

    /* Proyeccion XZ -> lienzo (X derecha, Z abajo), con margen */
    var margen = 16;
    var escala = Math.min(
      (w - 2 * margen) / Math.max(info.ancho, 1e-6),
      (h - 2 * margen) / Math.max(info.fondo, 1e-6)
    );
    var desplX = (w - info.ancho * escala) / 2 - info.minX * escala;
    var desplZ = (h - info.fondo * escala) / 2 - info.minZ * escala;

    var piezas = piezasDelModelo(grupo);
    var areaPlancha = Math.max(info.ancho, 1e-6) * Math.max(info.fondo, 1e-6);

    /* Suelo primero, luego mobiliario y muros encima */
    piezas.sort(function (a, b) {
      return nivelPieza(a, info, areaPlancha) - nivelPieza(b, info, areaPlancha);
    });

    for (var p = 0; p < piezas.length; p++) {
      var pieza = piezas[p];
      var nivel = nivelPieza(pieza, info, areaPlancha);

      ctx.beginPath();
      ctx.moveTo(pieza.contorno[0][0] * escala + desplX, pieza.contorno[0][1] * escala + desplZ);
      for (var k = 1; k < pieza.contorno.length; k++) {
        ctx.lineTo(pieza.contorno[k][0] * escala + desplX, pieza.contorno[k][1] * escala + desplZ);
      }
      ctx.closePath();

      if (nivel === 0) {
        ctx.fillStyle = PAL.suelo;
        ctx.strokeStyle = PAL.sueloBorde;
        ctx.lineWidth = 1.5;
      } else if (nivel === 2) {
        ctx.fillStyle = PAL.muro;
        ctx.strokeStyle = PAL.muroBorde;
        ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = aclarar(pieza.color);
        ctx.strokeStyle = PAL.muebleBorde;
        ctx.lineWidth = 0.8;
      }
      ctx.fill();
      /* El suelo tambien se traza: al no haber caja blanca
         detras, su contorno define la planta sobre el mapa */
      ctx.stroke();
    }

    cb(null, lienzo);
  }

  /* ═══ PREPARACION PARA RENDER 3D ══════════════════════
     Tres puntos que hacian que los modelos se vieran "todo
     blanco" o planos:

     1) Luces embebidas: modelos como la planta baja FBX traen
        sus propias luces (PointLight de intensidad 250-1500) que
        al clonarse a la escena reventaban la iluminacion. Se
        eliminan y se usa solo la luz de la escena.
     2) Colores: el renderizador saca la imagen en sRGB, pero ni
        GLTFLoader ni FBXLoader convierten el color base del
        material a espacio lineal. Sin esa conversion, al volver a
        codificar a sRGB todos los colores se aclaran (los grises
        acaban pareciendo blanco) y se pierde el contraste.
     3) Sombras: mientras no se active castShadow en las mallas,
        la luz direccional no proyecta ninguna sombra y el modelo
        queda plano, sin profundidad.

     Los materiales se clonan antes de convertirlos: los originales
     se comparten con el plano 2D, que debe seguir leyendo sus
     colores tal cual estan en el archivo. */
  function prepararRender(grupo) {
    /* Algunos modelos (p. ej. la planta baja FBX) traen sus propias
       luces embebidas, con intensidades enormes (hasta 1500): al
       clonarse a la escena reventaban la iluminacion y el modelo se
       veia blanco. Se eliminan y se usa solo la luz de la escena */
    var luces = [];
    grupo.traverse(function (objeto) {
      if (objeto.isLight) luces.push(objeto);
    });
    for (var l = 0; l < luces.length; l++) {
      if (luces[l].parent) luces[l].parent.remove(luces[l]);
    }

    /* Memoizacion original -> copia convertida (materiales compartidos) */
    var originales = [];
    var copias = [];

    function copiaConvertida(mat) {
      if (!mat) return mat;
      if (mat.userData && mat.userData.__colorLineal) return mat;
      var idx = originales.indexOf(mat);
      if (idx !== -1) return copias[idx];

      var copia = mat.clone();
      copia.userData = copia.userData || {};
      copia.userData.__colorLineal = true;
      if (copia.color) copia.color.convertSRGBToLinear();
      if (copia.emissive) copia.emissive.convertSRGBToLinear();
      /* Exportaciones FBX con "EmissiveFactor" > 1 (hay piezas con
         factor 8 y emisivo blanco): reventaban la imagen a blanco
         puro. Se limita a 1, que ya es un brillo alto */
      if (copia.emissiveIntensity !== undefined && copia.emissiveIntensity > 1) {
        copia.emissiveIntensity = 1;
      }

      originales.push(mat);
      copias.push(copia);
      return copia;
    }

    grupo.traverse(function (objeto) {
      if (!objeto.isMesh) return;
      objeto.castShadow = true;
      objeto.receiveShadow = true;
      if (!objeto.material) return;

      if (Array.isArray(objeto.material)) {
        for (var i = 0; i < objeto.material.length; i++) {
          objeto.material[i] = copiaConvertida(objeto.material[i]);
        }
      } else {
        objeto.material = copiaConvertida(objeto.material);
      }
    });
  }

  /* Pide el plano 2D redibujado de un piso; cb(err, canvas) */
  function pedirPlano(edificio, piso, cb) {
    var clave = edificio + '-' + piso;
    if (cachePlanos[clave]) return cb(null, cachePlanos[clave]);

    if (pendientesPlanos[clave]) {
      pendientesPlanos[clave].push(cb);
      return;
    }
    pendientesPlanos[clave] = [cb];

    var definicion = UniMap.datos.modeloDePiso ? UniMap.datos.modeloDePiso(edificio, piso) : null;
    if (!definicion) return terminar(new Error('Sin modelo para el piso ' + piso));

    clonar(definicion.archivo, function (err, grupo) {
      if (err) return terminar(err);
      var info = preparar(grupo);
      pintarPlano(grupo, info, function (errPlano, lienzo) {
        if (errPlano) return terminar(errPlano);
        cachePlanos[clave] = lienzo;
        terminar(null, lienzo);
      });
    });

    function terminar(err, lienzo) {
      var lista = pendientesPlanos[clave] || [];
      pendientesPlanos[clave] = null;
      for (var i = 0; i < lista.length; i++) lista[i](err, lienzo);
    }
  }

  /* Canvas del plano si ya esta listo (null si aun no) */
  function planoListo(edificio, piso) {
    return cachePlanos[edificio + '-' + piso] || null;
  }

  /* Vacia la cache de planos (al cambiar el tema se pintaron
     con la paleta anterior); el siguiente pedido los repinta */
  function invalidarPlanos() {
    cachePlanos = {};
  }
  /* ═══ MÁSCARA DE NAVEGACIÓN (rutas) ═══════════════════
     TA: materiales con nombre pared/wall.
     TI: mismas piezas “muro” que usa el plano 2D (altura). */
  var CELDA_NAV = 4;
  var ANCHO_MAPA = 800;
  var ALTO_MAPA = 600;
  var cacheMascaras = {};
  var pendientesMascaras = {};
  var RE_MURO = /pared|wall|muro|paint|plaster|yeso|ladrillo|brick|drywall|gypsum|revoque/i;
  var RE_COLUMNA = /hormigon|concrete|column|columna|pilar/i;

  function esMuroPorNombre(objeto) {
    var mats = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
    var i, n;
    for (i = 0; i < mats.length; i++) {
      n = ((mats[i] && mats[i].name) || '') + ' ' + (objeto.name || '');
      if (RE_MURO.test(n) || RE_COLUMNA.test(n)) return true;
    }
    return false;
  }

  function rasterizarTriangulos(o, aPlano, marcar, puntosMuro, v) {
    var pos = o.geometry.attributes.position;
    var idx = o.geometry.index;
    if (!pos) return;
    var pts = [];
    var i;
    for (i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      pts.push(aPlano(v.x, v.z));
    }
    var n = idx ? idx.count : pos.count;
    for (var t = 0; t + 2 < n; t += 3) {
      var a = pts[idx ? idx.getX(t) : t];
      var b = pts[idx ? idx.getX(t + 1) : t + 1];
      var c = pts[idx ? idx.getX(t + 2) : t + 2];
      if (!a || !b || !c) continue;
      puntosMuro.push(a, b, c);
      var larga = Math.max(
        Math.hypot(a[0] - b[0], a[1] - b[1]),
        Math.hypot(b[0] - c[0], b[1] - c[1]),
        Math.hypot(a[0] - c[0], a[1] - c[1])
      );
      var paso = Math.max(1, Math.ceil(larga / (CELDA_NAV / 2)));
      for (var i1 = 0; i1 <= paso; i1++) {
        for (var j1 = 0; j1 + i1 <= paso; j1++) {
          var u = i1 / paso;
          var q = j1 / paso;
          var r = 1 - u - q;
          marcar(a[0] * r + b[0] * u + c[0] * q, a[1] * r + b[1] * u + c[1] * q);
        }
      }
    }
  }

  /* Rellena borde de un contorno 2D (pared proyectada) */
  function rasterizarContorno(contorno, aPlanoModelo, marcar, puntosMuro) {
    if (!contorno || contorno.length < 2) return;
    var i, a, b, larga, paso, t, x, y;
    for (i = 0; i < contorno.length; i++) {
      a = aPlanoModelo(contorno[i][0], contorno[i][1]);
      b = aPlanoModelo(
        contorno[(i + 1) % contorno.length][0],
        contorno[(i + 1) % contorno.length][1]
      );
      puntosMuro.push(a, b);
      larga = Math.hypot(a[0] - b[0], a[1] - b[1]);
      paso = Math.max(1, Math.ceil(larga / (CELDA_NAV / 2)));
      for (t = 0; t <= paso; t++) {
        x = a[0] + (b[0] - a[0]) * (t / paso);
        y = a[1] + (b[1] - a[1]) * (t / paso);
        marcar(x, y);
        /* grosor de muro ~ 1 celda */
        marcar(x + CELDA_NAV * 0.4, y);
        marcar(x - CELDA_NAV * 0.4, y);
        marcar(x, y + CELDA_NAV * 0.4);
        marcar(x, y - CELDA_NAV * 0.4);
      }
    }
  }

  function construirMascara(grupo, info) {
    var LARGO = 1100;
    var margen = 16;
    var aspecto = Math.max(info.ancho, 1e-6) / Math.max(info.fondo, 1e-6);
    var w = aspecto >= 1 ? LARGO : Math.round(LARGO * aspecto);
    var h = aspecto >= 1 ? Math.round(LARGO / aspecto) : LARGO;
    var escala = Math.min((w - 2 * margen) / info.ancho, (h - 2 * margen) / info.fondo);
    var desplX = (w - info.ancho * escala) / 2 - info.minX * escala;
    var desplZ = (h - info.fondo * escala) / 2 - info.minZ * escala;
    var s2 = Math.min(530 / w, 470 / h);
    var ox = 135 + (530 - w * s2) / 2;
    var oy = 65 + (470 - h * s2) / 2;

    function aPlano(x, z) {
      return [ox + (x * escala + desplX) * s2, oy + (z * escala + desplZ) * s2];
    }

    var cols = Math.ceil(ANCHO_MAPA / CELDA_NAV);
    var filas = Math.ceil(ALTO_MAPA / CELDA_NAV);
    var data = new Uint8Array(cols * filas);
    var puntosMuro = [];
    var hayMuros = false;
    var v = new THREE.Vector3();

    function marcar(x, y) {
      var c = Math.floor(x / CELDA_NAV);
      var f = Math.floor(y / CELDA_NAV);
      if (c >= 0 && f >= 0 && c < cols && f < filas) data[f * cols + c] = 1;
    }

    grupo.updateMatrixWorld(true);

    /* 1) TA / modelos con nombre de material */
    grupo.traverse(function (o) {
      if (!o.isMesh || !o.visible || !o.geometry) return;
      if (!esMuroPorNombre(o)) return;
      hayMuros = true;
      rasterizarTriangulos(o, aPlano, marcar, puntosMuro, v);
    });

    /* 2) TI: piezas altas O contornos alargados (paredes sin nombre) */
    if (!hayMuros) {
      var piezas = piezasDelModelo(grupo);
      var areaPlancha = Math.max(info.ancho, 1e-6) * Math.max(info.fondo, 1e-6);
      var p, perim, k, a, b, ratio;
      for (p = 0; p < piezas.length; p++) {
        var pz = piezas[p];
        var esMuroAltura = nivelPieza(pz, info, areaPlancha) === 2;
        perim = 0;
        for (k = 0; k < pz.contorno.length; k++) {
          a = pz.contorno[k];
          b = pz.contorno[(k + 1) % pz.contorno.length];
          perim += Math.hypot(a[0] - b[0], a[1] - b[1]);
        }
        ratio = perim * perim / Math.max(pz.area, 1e-9);
        /* ratio alto = forma alargada (muro), no un bloque de habitación */
        var esMuroForma = ratio > 40 && pz.area < areaPlancha * 0.12;
        if (!esMuroAltura && !esMuroForma) continue;
        hayMuros = true;
        rasterizarContorno(pz.contorno, aPlano, marcar, puntosMuro);
      }
    }
    if (!hayMuros || puntosMuro.length < 4) {
      return null;
    }
    /* Fuera del edificio = bloqueado */
    var casco = envolver(puntosMuro);
    function dentro(x, y) {
      var signo = 0;
      var k, p1, p2, cr;
      for (k = 0; k < casco.length; k++) {
        p1 = casco[k];
        p2 = casco[(k + 1) % casco.length];
        cr = (p2[0] - p1[0]) * (y - p1[1]) - (p2[1] - p1[1]) * (x - p1[0]);
        if (cr !== 0) {
          if (signo === 0) signo = cr > 0 ? 1 : -1;
          else if ((cr > 0 ? 1 : -1) !== signo) return false;
        }
      }
      return true;
    }

    var bloqueadas = 0;
    var total = cols * filas;
    var f, c;
    for (f = 0; f < filas; f++) {
      for (c = 0; c < cols; c++) {
        if (!dentro((c + 0.5) * CELDA_NAV, (f + 0.5) * CELDA_NAV)) {
          data[f * cols + c] = 1;
        }
        if (data[f * cols + c] === 1) bloqueadas++;
      }
    }

    /* Máscara demasiado densa = inutilizable */
    if (bloqueadas / total > 0.88) {
      return null;
    }

    return {
      celda: CELDA_NAV,
      cols: cols,
      filas: filas,
      data: data,
      metrosPorUnidad: info.ancho / (info.ancho * escala * s2)
    };
  }
  /* Máscara de respaldo: solo aulas (para TI sin materiales de pared) */
  /* Máscara por aulas (pensada para TI).
   - Dentro del edificio: libre
   - Interior de cada aula: bloqueado (borde libre = pasillo)
   - Fuera del edificio: bloqueado */
  /* Máscara por aulas + hueco de puerta hacia el centro del edificio */
  function construirMascaraDesdeEspacios(edificio, piso) {
    var cols = Math.ceil(ANCHO_MAPA / CELDA_NAV);
    var filas = Math.ceil(ALTO_MAPA / CELDA_NAV);
    var data = new Uint8Array(cols * filas);
    var i, e, x1, y1, x2, y2, fx, fy, c, f;

    var todos = (UniMap.estado && UniMap.estado.todosLosEspacios && UniMap.estado.todosLosEspacios.length)
      ? UniMap.estado.todosLosEspacios
      : ((UniMap.estado && UniMap.estado.espacios) || []);

    var lista = [];
    for (i = 0; i < todos.length; i++) {
      e = todos[i];
      if (!e || e.edificio !== edificio || e.piso !== piso) continue;
      if (e.estado === 'inactivo') continue;
      if (!isFinite(e.x) || !isFinite(e.y)) continue;
      lista.push(e);
    }
    if (!lista.length) return null;

    for (i = 0; i < data.length; i++) data[i] = 0;

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (i = 0; i < lista.length; i++) {
      e = lista[i];
      minX = Math.min(minX, e.x);
      minY = Math.min(minY, e.y);
      maxX = Math.max(maxX, e.x + (e.ancho || 20));
      maxY = Math.max(maxY, e.y + (e.alto || 20));
    }
    minX = Math.max(0, minX - 28);
    minY = Math.max(0, minY - 28);
    maxX = Math.min(ANCHO_MAPA, maxX + 28);
    maxY = Math.min(ALTO_MAPA, maxY + 28);

    var cMin = Math.floor(minX / CELDA_NAV);
    var fMin = Math.floor(minY / CELDA_NAV);
    var cMax = Math.min(cols - 1, Math.floor(maxX / CELDA_NAV));
    var fMax = Math.min(filas - 1, Math.floor(maxY / CELDA_NAV));
    for (f = 0; f < filas; f++) {
      for (c = 0; c < cols; c++) {
        if (c < cMin || c > cMax || f < fMin || f > fMax) data[f * cols + c] = 1;
      }
    }

    var cxEd = (minX + maxX) / 2;
    var cyEd = (minY + maxY) / 2;
    var reConector = /escalera|ascensor|elevador|stair|lift|elevator/i;

    for (i = 0; i < lista.length; i++) {
      e = lista[i];
      if (reConector.test(e.tipo || '') || reConector.test(e.nombre || '')) continue;

      x1 = Math.floor(e.x / CELDA_NAV);
      y1 = Math.floor(e.y / CELDA_NAV);
      x2 = Math.floor((e.x + (e.ancho || 20) - 1) / CELDA_NAV);
      y2 = Math.floor((e.y + (e.alto || 20) - 1) / CELDA_NAV);

      /* Bloquear el rectángulo completo del aula */
      for (fy = y1; fy <= y2; fy++) {
        if (fy < 0 || fy >= filas) continue;
        for (fx = x1; fx <= x2; fx++) {
          if (fx < 0 || fx >= cols) continue;
          data[fy * cols + fx] = 1;
        }
      }

      /* Puerta: abrir 3 celdas en el lado más cercano al centro del edificio */
      var mx = e.x + (e.ancho || 20) / 2;
      var my = e.y + (e.alto || 20) / 2;
      var dx = cxEd - mx;
      var dy = cyEd - my;
      var puerta = 3;
      var k;

      if (Math.abs(dx) >= Math.abs(dy)) {
        /* Puerta en pared izquierda o derecha */
        var px = dx > 0 ? x2 : x1;
        var py = Math.floor(my / CELDA_NAV);
        for (k = -1; k <= 1; k++) {
          var yy = py + k;
          if (yy >= 0 && yy < filas && px >= 0 && px < cols) data[yy * cols + px] = 0;
          if (yy >= 0 && yy < filas && px + (dx > 0 ? 1 : -1) >= 0 && px + (dx > 0 ? 1 : -1) < cols) {
            data[yy * cols + (px + (dx > 0 ? 1 : -1))] = 0;
          }
        }
      } else {
        /* Puerta en pared superior o inferior */
        var py2 = dy > 0 ? y2 : y1;
        var px2 = Math.floor(mx / CELDA_NAV);
        for (k = -1; k <= 1; k++) {
          var xx = px2 + k;
          if (xx >= 0 && xx < cols && py2 >= 0 && py2 < filas) data[py2 * cols + xx] = 0;
          if (xx >= 0 && xx < cols && py2 + (dy > 0 ? 1 : -1) >= 0 && py2 + (dy > 0 ? 1 : -1) < filas) {
            data[(py2 + (dy > 0 ? 1 : -1)) * cols + xx] = 0;
          }
        }
      }
    }

    return {
      celda: CELDA_NAV,
      cols: cols,
      filas: filas,
      data: data,
      metrosPorUnidad: 0.12,
      desdeEspacios: true
    };
  }

  function mascaraNavegacion(edificio, piso, cb) {
    var clave = edificio + '-' + piso;
    if (clave in cacheMascaras) return cb(null, cacheMascaras[clave]);
    if (pendientesMascaras[clave]) {
      pendientesMascaras[clave].push(cb);
      return;
    }
    pendientesMascaras[clave] = [cb];

    function fin(err, m) {
      if (!err) cacheMascaras[clave] = m;
      var l = pendientesMascaras[clave] || [];
      pendientesMascaras[clave] = null;
      for (var i = 0; i < l.length; i++) l[i](err, m);
    }

    var def = UniMap.datos.modeloDePiso ? UniMap.datos.modeloDePiso(edificio, piso) : null;

    /* Sin modelo 3D → solo aulas */
    if (!def) {
      return fin(null, construirMascaraDesdeEspacios(edificio, piso));
    }

    /* TA y TI: intentar GLB (muros reales). Si falla → aulas con puertas */
    clonar(def.archivo, function (err, grupo) {
      if (err) {
        return fin(null, construirMascaraDesdeEspacios(edificio, piso));
      }
      try {
        var m = construirMascara(grupo, preparar(grupo));
        if (!m) m = construirMascaraDesdeEspacios(edificio, piso);
        fin(null, m);
      } catch (e) {
        console.warn('[UniMap] máscara', edificio, piso, e);
        fin(null, construirMascaraDesdeEspacios(edificio, piso));
      }
    });
  }

  function mascaraListaSync(edificio, piso) {
    return cacheMascaras[edificio + '-' + piso] || null;
  }

  function invalidarMascaras() {
    cacheMascaras = {};
  }

  UniMap.modelos = {
    mascaraNavegacion: mascaraNavegacion,
    mascaraListaSync: mascaraListaSync,
    invalidarMascaras: invalidarMascaras,
    cargar: cargar,
    clonar: clonar,
    preparar: preparar,
    prepararRender: prepararRender,
    normalizar: normalizar,
    pedirPlano: pedirPlano,
    planoListo: planoListo,
    invalidarPlanos: invalidarPlanos
  };
})();