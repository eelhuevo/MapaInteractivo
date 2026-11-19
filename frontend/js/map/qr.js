/* =========================================================
   map/qr.js — codigos QR (HU-11)
   · generar: codificador QR propio (modo byte, nivel M,
     versiones 1-10) sin dependencias externas
   · escanear: camara + BarcodeDetector (donde el navegador
     lo soporta) con alternativa de pegar el enlace
   · abrir ficha: vincula el QR con ?espacio=ID (deep link)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var estado = UniMap.estado;

  /* ═══════════════════════════════════════════════════
     CODIFICADOR QR (nivel M, versiones 1..10, modo byte)
     ═══════════════════════════════════════════════════ */
  var codificador = (function () {

    /* ── Campo GF(256) con polinomio 0x11D ── */
    var EXP = new Array(512);
    var LOG = new Array(256);
    (function () {
      var x = 1;
      for (var i = 0; i < 255; i++) {
        EXP[i] = x;
        LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
      }
      for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
    })();

    function multiplicar(a, b) {
      return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
    }

    function generadorRS(n) {
      var g = [1];
      for (var i = 0; i < n; i++) {
        var ng = new Array(g.length + 1);
        for (var k = 0; k < ng.length; k++) ng[k] = 0;
        for (var j = 0; j < g.length; j++) {
          ng[j] ^= g[j];
          ng[j + 1] ^= multiplicar(g[j], EXP[i]);
        }
        g = ng;
      }
      return g;
    }

    function codigosError(datos, nEC) {
      var g = generadorRS(nEC);
      var res = datos.slice();
      var i, j;
      for (i = 0; i < nEC; i++) res.push(0);
      for (i = 0; i < datos.length; i++) {
        var coef = res[i];
        if (coef !== 0) {
          for (j = 0; j < g.length; j++) res[i + j] ^= multiplicar(g[j], coef);
        }
      }
      return res.slice(datos.length);
    }

    /* ── Tablas nivel M ──
       [datosTotal, bloquesCortos, datosPorCorto,
        bloquesLargos, datosPorLargo, ecPorBloque] */
    var TABLA = {
      1: [16, 1, 16, 0, 0, 10],
      2: [28, 1, 28, 0, 0, 16],
      3: [44, 1, 44, 0, 0, 26],
      4: [64, 2, 32, 0, 0, 18],
      5: [86, 2, 43, 0, 0, 24],
      6: [108, 4, 27, 0, 0, 16],
      7: [124, 4, 31, 0, 0, 18],
      8: [154, 2, 38, 2, 39, 22],
      9: [182, 3, 36, 2, 37, 22],
      10: [216, 4, 43, 1, 44, 26]
    };

    var ALINEACION = {
      1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
      6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
    };

    var G15 = 0x537;
    var G15_MASK = 0x5412;
    var G18 = 0x1f25;

    function largoBits(n) {
      var l = 0;
      while (n !== 0) { l++; n >>>= 1; }
      return l;
    }

    /* BCH del formato (nivel M = 00) */
    function bchFormato(mascara) {
      var data = (0 << 3) | mascara;
      var d = data << 10;
      while (largoBits(d) - largoBits(G15) >= 0) d ^= G15 << (largoBits(d) - largoBits(G15));
      return ((data << 10) | d) ^ G15_MASK;
    }

    /* BCH de la informacion de version (v >= 7) */
    function bchVersion(v) {
      var d = v << 12;
      while (largoBits(d) - largoBits(G18) >= 0) d ^= G18 << (largoBits(d) - largoBits(G18));
      return (v << 12) | d;
    }

    function funcionMascara(m) {
      switch (m) {
        case 0: return function (i, j) { return (i + j) % 2 === 0; };
        case 1: return function (i) { return i % 2 === 0; };
        case 2: return function (i, j) { return j % 3 === 0; };
        case 3: return function (i, j) { return (i + j) % 3 === 0; };
        case 4: return function (i, j) { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0; };
        case 5: return function (i, j) { return (i * j) % 2 + (i * j) % 3 === 0; };
        case 6: return function (i, j) { return ((i * j) % 2 + (i * j) % 3) % 2 === 0; };
        default: return function (i, j) { return ((i + j) % 2 + (i * j) % 3) % 2 === 0; };
      }
    }

    function bytesUTF8(texto) {
      if (window.TextEncoder) return Array.prototype.slice.call(new TextEncoder().encode(texto));
      var bytes = [];
      for (var i = 0; i < texto.length; i++) {
        var c = texto.charCodeAt(i);
        if (c < 128) bytes.push(c);
        else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
        else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
      }
      return bytes;
    }

    function construirMatriz(version, codewords) {
      var size = version * 4 + 17;
      var modulos = [];
      var reservado = [];
      var i, j;
      for (i = 0; i < size; i++) {
        modulos.push(new Array(size));
        reservado.push(new Array(size));
        for (j = 0; j < size; j++) { modulos[i][j] = 0; reservado[i][j] = false; }
      }

      /* Timing */
      for (var t = 0; t < size; t++) {
        modulos[6][t] = t % 2 === 0 ? 1 : 0;
        reservado[6][t] = true;
        modulos[t][6] = t % 2 === 0 ? 1 : 0;
        reservado[t][6] = true;
      }

      /* Finders + separadores */
      function finder(fila, col) {
        for (var dr = -1; dr <= 7; dr++) {
          for (var dc = -1; dc <= 7; dc++) {
            var r = fila + dr, c = col + dc;
            if (r < 0 || r >= size || c < 0 || c >= size) continue;
            var oscuro = (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) ||
              (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6)) ||
              (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
            modulos[r][c] = oscuro ? 1 : 0;
            reservado[r][c] = true;
          }
        }
      }
      finder(0, 0);
      finder(0, size - 7);
      finder(size - 7, 0);

      /* Patrones de alineacion */
      var centros = ALINEACION[version];
      for (var a = 0; a < centros.length; a++) {
        for (var b = 0; b < centros.length; b++) {
          var fr = centros[a], fc = centros[b];
          if ((fr === 6 && fc === 6) ||
              (fr === 6 && fc === size - 7) ||
              (fr === size - 7 && fc === 6)) continue;
          for (var dr2 = -2; dr2 <= 2; dr2++) {
            for (var dc2 = -2; dc2 <= 2; dc2++) {
              var oscuro2 = Math.max(Math.abs(dr2), Math.abs(dc2)) !== 1;
              modulos[fr + dr2][fc + dc2] = oscuro2 ? 1 : 0;
              reservado[fr + dr2][fc + dc2] = true;
            }
          }
        }
      }

      /* Reservar areas de formato */
      for (var f = 0; f < 9; f++) {
        reservado[8][f] = true;
        reservado[f][8] = true;
      }
      for (var f3 = 0; f3 < 8; f3++) {
        reservado[8][size - 1 - f3] = true;
        reservado[size - 1 - f3][8] = true;
      }

      /* Informacion de version (v >= 7) */
      if (version >= 7) {
        var bitsVersion = bchVersion(version);
        for (var vb = 0; vb < 18; vb++) {
          var bv = (bitsVersion >> vb) & 1;
          var vr = Math.floor(vb / 3);
          var vc = vb % 3 + size - 11;
          modulos[vr][vc] = bv; reservado[vr][vc] = true;
          modulos[vc][vr] = bv; reservado[vc][vr] = true;
        }
      }

      /* Colocacion de datos en zigzag */
      var bitsDatos = [];
      for (var cw = 0; cw < codewords.length; cw++) {
        for (var bb = 7; bb >= 0; bb--) bitsDatos.push((codewords[cw] >> bb) & 1);
      }
      var idx = 0;
      var haciaArriba = true;
      for (var col = size - 1; col >= 1; col -= 2) {
        if (col === 6) col--;
        for (var rec = 0; rec < size; rec++) {
          var fila = haciaArriba ? size - 1 - rec : rec;
          for (var cc = 0; cc < 2; cc++) {
            var cCol = col - cc;
            if (reservado[fila][cCol]) continue;
            modulos[fila][cCol] = idx < bitsDatos.length ? bitsDatos[idx] : 0;
            idx++;
          }
        }
        haciaArriba = !haciaArriba;
      }

      /* Enmascarado: elegir la mejor mascara */
      var mejor = null;
      var mejorPenalidad = Infinity;
      for (var m = 0; m < 8; m++) {
        var candidato = aplicarMascara(modulos, reservado, m);
        escribirFormato(candidato, size, m);
        var penalidad = calcularPenalidad(candidato, size);
        if (penalidad < mejorPenalidad) {
          mejorPenalidad = penalidad;
          mejor = candidato;
        }
      }
      return mejor;
    }

    function aplicarMascara(modulos, reservado, m) {
      var size = modulos.length;
      var fn = funcionMascara(m);
      var copia = [];
      for (var i = 0; i < size; i++) {
        copia.push(modulos[i].slice());
        for (var j = 0; j < size; j++) {
          if (!reservado[i][j] && fn(i, j)) copia[i][j] ^= 1;
        }
      }
      return copia;
    }

    function escribirFormato(matriz, size, mascara) {
      var bits = bchFormato(mascara);
      for (var i = 0; i < 15; i++) {
        var bit = (bits >> i) & 1;
        if (i < 6) matriz[i][8] = bit;
        else if (i < 8) matriz[i + 1][8] = bit;
        else matriz[size - 15 + i][8] = bit;

        if (i < 8) matriz[8][size - i - 1] = bit;
        else if (i < 9) matriz[8][15 - i] = bit;
        else matriz[8][15 - i - 1] = bit;
      }
      matriz[size - 8][8] = 1;
    }

    function calcularPenalidad(m, size) {
      var penalidad = 0, i, j, k;

      /* N1: corridas de 5 o mas */
      for (i = 0; i < size; i++) {
        var fila = 1, colu = 1;
        for (j = 1; j < size; j++) {
          if (m[i][j] === m[i][j - 1]) fila++;
          else { if (fila >= 5) penalidad += 3 + (fila - 5); fila = 1; }
          if (m[j][i] === m[j - 1][i]) colu++;
          else { if (colu >= 5) penalidad += 3 + (colu - 5); colu = 1; }
        }
        if (fila >= 5) penalidad += 3 + (fila - 5);
        if (colu >= 5) penalidad += 3 + (colu - 5);
      }

      /* N2: bloques 2x2 del mismo color */
      for (i = 0; i < size - 1; i++) {
        for (j = 0; j < size - 1; j++) {
          var v = m[i][j];
          if (v === m[i][j + 1] && v === m[i + 1][j] && v === m[i + 1][j + 1]) penalidad += 3;
        }
      }

      /* N3: patrones 1:1:3:1:1 con fondo claro */
      var p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
      var p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
      function coincide(vertical, arr, i0, j0) {
        for (k = 0; k < 11; k++) {
          var val = vertical ? m[i0 + k][j0] : m[i0][j0 + k];
          if (val !== arr[k]) return false;
        }
        return true;
      }
      /* vertical: recorre filas hasta size-11 */
      for (i = 0; i <= size - 11; i++) {
        for (j = 0; j < size; j++) {
          if (coincide(true, p1, i, j) || coincide(true, p2, i, j)) penalidad += 40;
        }
      }
      /* horizontal: recorre columnas hasta size-11 */
      for (i = 0; i < size; i++) {
        for (j = 0; j <= size - 11; j++) {
          if (coincide(false, p1, i, j) || coincide(false, p2, i, j)) penalidad += 40;
        }
      }

      /* N4: proporcion de modulos oscuros */
      var oscuros = 0;
      for (i = 0; i < size; i++) {
        for (j = 0; j < size; j++) if (m[i][j]) oscuros++;
      }
      var porcentaje = Math.abs(oscuros * 100 / (size * size) - 50);
      penalidad += Math.floor(porcentaje / 5) * 10;

      return penalidad;
    }

    function codificar(texto) {
      var bytes = bytesUTF8(texto);
      var version = 0;
      for (var v = 1; v <= 10; v++) {
        var cabecera = 4 + (v < 10 ? 8 : 16);
        if (TABLA[v][0] * 8 >= cabecera + bytes.length * 8) { version = v; break; }
      }
      if (!version) return null; /* demasiado largo */

      var tabla = TABLA[version];
      var totalDatos = tabla[0];
      var ecPorBloque = tabla[5];

      var bits = [];
      function empujar(valor, cantidad) {
        for (var b = cantidad - 1; b >= 0; b--) bits.push((valor >> b) & 1);
      }
      empujar(4, 4); /* modo byte */
      empujar(bytes.length, version < 10 ? 8 : 16);
      for (var i = 0; i < bytes.length; i++) empujar(bytes[i], 8);

      /* Terminador + relleno a bytes */
      var terminador = Math.min(4, totalDatos * 8 - bits.length);
      empujar(0, terminador);
      while (bits.length % 8 !== 0) bits.push(0);

      var codewords = [];
      for (var b2 = 0; b2 < bits.length; b2 += 8) {
        var byte = 0;
        for (var k = 0; k < 8; k++) byte = (byte << 1) | bits[b2 + k];
        codewords.push(byte);
      }
      var relleno = [0xEC, 0x11];
      var rr = 0;
      while (codewords.length < totalDatos) {
        codewords.push(relleno[rr % 2]);
        rr++;
      }

      /* Bloques + correccion de errores */
      var bloques = [];
      var pos = 0, g;
      for (g = 0; g < tabla[1]; g++) { bloques.push(codewords.slice(pos, pos + tabla[2])); pos += tabla[2]; }
      for (g = 0; g < tabla[3]; g++) { bloques.push(codewords.slice(pos, pos + tabla[4])); pos += tabla[4]; }

      var ecBloques = [];
      for (g = 0; g < bloques.length; g++) ecBloques.push(codigosError(bloques[g], ecPorBloque));

      /* Entrelazado */
      var salida = [];
      var maxData = Math.max(tabla[2], tabla[4]);
      for (var c = 0; c < maxData; c++) {
        for (g = 0; g < bloques.length; g++) {
          if (c < bloques[g].length) salida.push(bloques[g][c]);
        }
      }
      for (var c2 = 0; c2 < ecPorBloque; c2++) {
        for (g = 0; g < ecBloques.length; g++) salida.push(ecBloques[g][c2]);
      }

      return construirMatriz(version, salida);
    }

    return { codificar: codificar };
  })();

  /* ═══════════════════════════════════════════════════
     INTERFAZ QR
     ═══════════════════════════════════════════════════ */
  var espacioActual = null;
  var stream = null;
  var detectando = false;
  var detector = null;

  function t(clave, params) { return UniMap.i18n.t(clave, params); }

  function urlDeEspacio(idEspacio) {
    var base = window.location.origin + window.location.pathname;
    if (window.location.protocol === 'file:') {
      base = window.location.href.split('?')[0].split('#')[0];
    }
    return base + '?espacio=' + encodeURIComponent(idEspacio);
  }

  function pintarMatriz(matriz, canvas) {
    if (!canvas) return;
    var size = matriz.length;
    var margen = 4;
    var px = 8;
    canvas.width = (size + margen * 2) * px;
    canvas.height = canvas.width;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111827';
    for (var i = 0; i < size; i++) {
      for (var j = 0; j < size; j++) {
        if (matriz[i][j]) ctx.fillRect((j + margen) * px, (i + margen) * px, px, px);
      }
    }
  }

  function mostrarQR(espacio) {
    var modal = util.el('modal-qr');
    if (!modal || !espacio) return;
    espacioActual = espacio;

    var url = urlDeEspacio(espacio.id);
    var matriz = codificador.codificar(url);
    if (!matriz) return;

    pintarMatriz(matriz, util.el('lienzo-qr'));

    var nombre = util.el('qr-nombre-espacio');
    if (nombre) nombre.textContent = espacio.nombre;

    var campo = util.el('qr-enlace');
    if (campo) campo.value = url;

    modal.classList.remove('hidden');
  }

  function cerrarQR() {
    var modal = util.el('modal-qr');
    if (modal) modal.classList.add('hidden');
  }

  function cerrarEscanear() {
    detectando = false;
    if (stream) {
      var pistas = stream.getTracks();
      for (var i = 0; i < pistas.length; i++) pistas[i].stop();
      stream = null;
    }
    var modal = util.el('modal-escanear');
    if (modal) modal.classList.add('hidden');
    var video = util.el('video-escanear');
    if (video) video.classList.add('hidden');
  }

  function extraerEspacio(url) {
    if (!url) return null;
    var m = String(url).match(/espacio=([^&#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function manejarValor(valor) {
    var id = extraerEspacio(valor);
    if (id) {
      cerrarEscanear();
      if (UniMap.ui) UniMap.ui.irAEspacio(id);
      return;
    }
    if (valor && String(valor).indexOf('mapa.html') !== -1) {
      window.location.href = valor;
      return;
    }
    util.notificar(t('qr.invalido'));
  }

  function abrirEscanear() {
    var modal = util.el('modal-escanear');
    if (!modal) return;
    modal.classList.remove('hidden');

    var video = util.el('video-escanear');
    var aviso = util.el('escanear-aviso');
    var campo = util.el('campo-qr-pegado');
    if (campo) campo.value = '';

    if (!('BarcodeDetector' in window) || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (video) video.classList.add('hidden');
      if (aviso) aviso.textContent = t('qr.sinCamara');
      return;
    }
    if (aviso) aviso.textContent = t('qr.preparandoCamara');

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(function (s) {
        stream = s;
        video.srcObject = s;
        video.classList.remove('hidden');
        video.play();
        if (aviso) aviso.textContent = t('qr.camara');
        if (!detector) detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        detectando = true;
        bucle();
      })
      .catch(function () {
        if (video) video.classList.add('hidden');
        if (aviso) aviso.textContent = t('qr.sinCamara');
      });

    function bucle() {
      if (!detectando) return;
      if (video.readyState >= 2) {
        detector.detect(video).then(function (codigos) {
          if (codigos && codigos.length) manejarValor(codigos[0].rawValue);
        }).catch(function () { /* frame sin codigos */ });
      }
      if (detectando) requestAnimationFrame(bucle);
    }
  }

  /* ── DEEP LINK (?espacio=ID) ──────────────────────── */
  function procesarEnlace() {
    var busqueda = window.location.search || '';
    if (!busqueda) return false;
    var params;
    try {
      params = new URLSearchParams(busqueda);
    } catch (e) { return false; }

    var idEspacio = params.get('espacio');
    var edificio = params.get('edificio');
    var piso = params.get('piso');

    if (edificio && UniMap.mapa2D) {
      var e = parseInt(edificio, 10);
      if (e === 1 || e === 2) {
        UniMap.mapa2D.cambiarEdificio(e, piso !== null ? parseInt(piso, 10) : undefined);
      }
    }

    if (idEspacio) {
      var esp = null;
      var lista = estado.todosLosEspacios || [];
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === idEspacio) { esp = lista[i]; break; }
      }
      if (esp) {
        setTimeout(function () {
          if (UniMap.ui) UniMap.ui.irAEspacio(idEspacio);
        }, 250);
        return true;
      }
    }
    return false;
  }

  /* ── CONEXION DE EVENTOS ──────────────────────────── */
  function iniciar() {
    var btnCerrarQR = util.el('cerrar-qr');
    if (btnCerrarQR) btnCerrarQR.addEventListener('click', cerrarQR);

    var btnDescargar = util.el('descargar-qr');
    if (btnDescargar) btnDescargar.addEventListener('click', function () {
      var canvas = util.el('lienzo-qr');
      if (!canvas) return;
      var enlace = document.createElement('a');
      enlace.href = canvas.toDataURL('image/png');
      enlace.download = 'qr-' + (espacioActual ? espacioActual.id : 'unimap') + '.png';
      enlace.click();
    });

    var btnCopiar = util.el('copiar-qr');
    if (btnCopiar) btnCopiar.addEventListener('click', function () {
      var campo = util.el('qr-enlace');
      if (!campo) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(campo.value).then(function () {
          util.notificar(t('qr.copiado'));
        }, function () { campo.select(); });
      } else {
        campo.select();
        try { document.execCommand('copy'); util.notificar(t('qr.copiado')); } catch (e) { /* manual */ }
      }
    });

    var btnEscanear = util.el('boton-escanear-qr');
    if (btnEscanear) btnEscanear.addEventListener('click', abrirEscanear);

    var btnCerrarEscanear = util.el('cerrar-escanear');
    if (btnCerrarEscanear) btnCerrarEscanear.addEventListener('click', cerrarEscanear);

    var btnAbrirPegado = util.el('abrir-qr-pegado');
    if (btnAbrirPegado) btnAbrirPegado.addEventListener('click', function () {
      var campo = util.el('campo-qr-pegado');
      if (campo && campo.value.trim()) manejarValor(campo.value.trim());
    });

    /* Cerrar al hacer clic en el fondo del modal */
    ['modal-qr', 'modal-escanear'].forEach(function (id) {
      var modal = util.el(id);
      if (modal) {
        modal.addEventListener('click', function (e) {
          if (e.target === modal) {
            if (id === 'modal-escanear') cerrarEscanear();
            else modal.classList.add('hidden');
          }
        });
      }
    });
  }

  UniMap.qr = {
    iniciar: iniciar,
    mostrarQR: mostrarQR,
    cerrarEscanear: cerrarEscanear,
    procesarEnlace: procesarEnlace,
    urlDeEspacio: urlDeEspacio
  };
})();
