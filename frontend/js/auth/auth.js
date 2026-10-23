/* =========================================================
   auth/auth.js — login, registro, invitado y sesion
   (funciona en index.html y en mapa.html)
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;
  var estado = UniMap.estado;

  var llaveUsuarios = UniMap.CLAVES.usuarios;
  var llaveSesion = UniMap.CLAVES.sesion;

  /* Rutas segun la pagina actual: index.html vive en la raiz
     y mapa.html dentro de frontend/ */
  var EN_MAPA = !!util.el('pantalla-mapa');
  var RUTA_INDEX = EN_MAPA ? '../index.html' : 'index.html';
  var RUTA_MAPA = EN_MAPA ? 'mapa.html' : 'frontend/mapa.html';

  /* ── USUARIOS ─────────────────────────────────────── */
  function obtenerUsuarios() {
    return util.almacen.leer(llaveUsuarios, []);
  }

  function guardarUsuarios(lista) {
    util.almacen.escribir(llaveUsuarios, lista);
  }

  function usuarioPorDefecto() {
    return {
      id: 'u1',
      nombre: 'Admin',
      apellido: 'Sistema',
      correo: 'admin@uni.edu',
      rol: 'admin',
      contrasena: '123456',
      fechaRegistro: new Date().toISOString()
    };
  }

  /* Inicializar usuario admin por defecto si no hay usuarios */
  (function inicializarUsuarios() {
    var guardados = obtenerUsuarios();
    if (guardados.length === 0) {
      var admin = usuarioPorDefecto();
      guardados.push(admin);
      guardarUsuarios(guardados);
    }
  })();

  /* ── SESION ENTRE PAGINAS ─────────────────────────── */
  function guardarSesion(usuario) {
    estado.usuarioActual = usuario;
    util.almacen.escribir(llaveSesion, usuario);
  }

  function sesionGuardada() {
    return util.almacen.leer(llaveSesion, null);
  }

  function cerrarSesion() {
    util.almacen.quitar(llaveSesion);
    estado.usuarioActual = null;
    estado.favoritos = [];
    window.location.href = RUTA_INDEX;
  }

  /* ── VALIDACIONES / ERRORES ───────────────────────── */
  function mostrarError(idCampo, mensaje) {
    var campo = util.el(idCampo);
    var error = util.el(idCampo + '-error');
    if (campo) campo.classList.add('error');
    if (error) error.textContent = mensaje;
  }

  function limpiarTodosLosErrores() {
    var mensajes = document.querySelectorAll('.error-msg');
    for (var i = 0; i < mensajes.length; i++) mensajes[i].textContent = '';
    var campos = document.querySelectorAll('.error');
    for (var j = 0; j < campos.length; j++) campos[j].classList.remove('error');
  }

  /* ── EVENTOS (solo si los elementos existen) ──────── */
  function conectarFormularios() {
    var formularioLogin = util.el('formulario-login');
    var formularioRegistro = util.el('formulario-registro');
    if (!formularioLogin || !formularioRegistro) return;

    /* Si ya hay sesion abierta, no hace falta volver a entrar:
       se continua directamente en el mapa */
    if (sesionGuardada()) {
      window.location.replace(RUTA_MAPA);
      return;
    }

    var enlaceRegistro = util.el('mostrar-registro');
    var enlaceLogin = util.el('mostrar-login');

    if (enlaceRegistro) {
      enlaceRegistro.addEventListener('click', function (e) {
        e.preventDefault();
        formularioLogin.classList.remove('active');
        formularioRegistro.classList.add('active');
        limpiarTodosLosErrores();
      });
    }

    if (enlaceLogin) {
      enlaceLogin.addEventListener('click', function (e) {
        e.preventDefault();
        formularioRegistro.classList.remove('active');
        formularioLogin.classList.add('active');
        limpiarTodosLosErrores();
      });
    }

    /* Mostrar / ocultar contrasena */
    var botonesPass = document.querySelectorAll('.boton-mostrar-pass');
    for (var k = 0; k < botonesPass.length; k++) {
      botonesPass[k].addEventListener('click', function () {
        var campo = util.el(this.getAttribute('data-target'));
        if (!campo) return;
        if (campo.type === 'password') { campo.type = 'text'; this.textContent = UniMap.i18n.t('auth.ocultar'); }
        else { campo.type = 'password'; this.textContent = UniMap.i18n.t('auth.mostrar'); }
      });
    }

    /* Fortaleza de contrasena */
    var campoFortaleza = util.el('contrasena-registro');
    if (campoFortaleza) {
      campoFortaleza.addEventListener('input', function () {
        var val = this.value;
        var score = 0;
        if (val.length >= 6) score++;
        if (val.length >= 10) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;

        var barra = util.el('fortaleza-contrasena');
        if (!barra) return;
        var pct = (score / 5) * 100;
        var color = '#dc2626';
        if (score >= 4) color = '#059669';
        else if (score >= 2) color = '#d97706';
        barra.style.background = val
          ? 'linear-gradient(to right, ' + color + ' ' + pct + '%, #e5e7eb ' + pct + '%)'
          : '#e5e7eb';
      });
    }

    /* LOGIN */
    formularioLogin.addEventListener('submit', function (e) {
      e.preventDefault();
      limpiarTodosLosErrores();
      var ok = true;
      var correo = util.el('correo-login').value.trim();
      var pass = util.el('contrasena-login').value;

      if (!correo) { mostrarError('correo-login', UniMap.i18n.t('err.correoObligatorio')); ok = false; }
      else if (!util.validarCorreo(correo)) { mostrarError('correo-login', UniMap.i18n.t('err.correoInvalido')); ok = false; }

      if (!pass) { mostrarError('contrasena-login', UniMap.i18n.t('err.passObligatoria')); ok = false; }
      else if (pass.length < 6) { mostrarError('contrasena-login', UniMap.i18n.t('err.min6')); ok = false; }

      if (!ok) return;

      var usuarios = obtenerUsuarios();
      var encontrado = null;
      for (var u = 0; u < usuarios.length; u++) {
        if (usuarios[u].correo === correo && usuarios[u].contrasena === pass) {
          encontrado = usuarios[u];
          break;
        }
      }

      if (!encontrado) {
        mostrarError('contrasena-login', UniMap.i18n.t('err.credenciales'));
        return;
      }

      guardarSesion(encontrado);
      window.location.href = RUTA_MAPA;
    });

    /* REGISTRO */
    formularioRegistro.addEventListener('submit', function (e) {
      e.preventDefault();
      limpiarTodosLosErrores();
      var ok = true;
      var nombre = util.el('nombre-registro').value.trim();
      var apellido = util.el('apellido-registro').value.trim();
      var correo = util.el('correo-registro').value.trim();
      var rol = util.el('rol-registro').value;
      var pass = util.el('contrasena-registro').value;
      var pass2 = util.el('contrasena2-registro').value;

      if (!nombre || nombre.length < 2) { mostrarError('nombre-registro', nombre ? UniMap.i18n.t('err.min2') : UniMap.i18n.t('err.nombre')); ok = false; }
      if (!apellido || apellido.length < 2) { mostrarError('apellido-registro', apellido ? UniMap.i18n.t('err.min2') : UniMap.i18n.t('err.apellido')); ok = false; }
      if (!correo) { mostrarError('correo-registro', UniMap.i18n.t('err.correoRequerido')); ok = false; }
      else if (!util.validarCorreo(correo)) { mostrarError('correo-registro', UniMap.i18n.t('err.correoInvalido')); ok = false; }
      if (!rol) { mostrarError('rol-registro', UniMap.i18n.t('err.rol')); ok = false; }
      if (!pass) { mostrarError('contrasena-registro', UniMap.i18n.t('err.passRequerida')); ok = false; }
      else if (pass.length < 6) { mostrarError('contrasena-registro', UniMap.i18n.t('err.min6')); ok = false; }
      if (!pass2) { mostrarError('contrasena2-registro', UniMap.i18n.t('err.confirma')); ok = false; }
      else if (pass !== pass2) { mostrarError('contrasena2-registro', UniMap.i18n.t('err.noCoinciden')); ok = false; }

      if (!ok) return;

      var usuarios = obtenerUsuarios();
      for (var u = 0; u < usuarios.length; u++) {
        if (usuarios[u].correo === correo) {
          mostrarError('correo-registro', UniMap.i18n.t('err.yaRegistrado'));
          return;
        }
      }

      var nuevo = {
        id: 'u' + Date.now(),
        nombre: nombre,
        apellido: apellido,
        correo: correo,
        rol: rol,
        contrasena: pass,
        fechaRegistro: new Date().toISOString()
      };

      usuarios.push(nuevo);
      guardarUsuarios(usuarios);
      guardarSesion(nuevo);
      window.location.href = RUTA_MAPA;
    });
  }

  /* ── BOTON INVITADO ───────────────────────────────── */
  function conectarInvitado() {
    var boton = util.el('boton-invitado');
    if (!boton) return;
    boton.addEventListener('click', function () {
      guardarSesion({ id: 'guest', nombre: 'Invitado', apellido: '', correo: '', rol: 'invitado' });
      window.location.href = RUTA_MAPA;
    });
  }

  /* ── BOTON SALIR (mapa.html) ──────────────────────── */
  function conectarSalida() {
    var boton = util.el('boton-salir');
    if (!boton) return;
    boton.addEventListener('click', cerrarSesion);
  }

  /* ── ARRANQUE DEL MODULO ──────────────────────────── */
  conectarFormularios();
  conectarInvitado();
  conectarSalida();

  UniMap.auth = {
    obtenerUsuarios: obtenerUsuarios,
    guardarUsuarios: guardarUsuarios,
    guardarSesion: guardarSesion,
    sesionGuardada: sesionGuardada,
    cerrarSesion: cerrarSesion,
    mostrarError: mostrarError,
    limpiarTodosLosErrores: limpiarTodosLosErrores
  };
})();
