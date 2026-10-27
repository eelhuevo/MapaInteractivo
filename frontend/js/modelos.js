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
      new THREE.GLTFLoader().load(CARPETA + archivo, function (gltf) {
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
    if (pieza.altura > info.altura * 0.45) return 2;
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

  UniMap.modelos = {
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
