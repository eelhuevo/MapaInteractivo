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

  /* Sin usuarios inventados: la unica fuente de cuentas es el backend
     (seeders de Laravel). Lo unico que vive en localStorage son las
     cuentas que el propio usuario registro con el backend apagado. */

  /* ── SESION ENTRE PAGINAS ─────────────────────────── */
  function guardarSesion(usuario) {
    estado.usuarioActual = usuario;
    util.almacen.escribir(llaveSesion, usuario);
  }

  function sesionGuardada() {
    return util.almacen.leer(llaveSesion, null);
  }

  function cerrarSesion() {
    /* Revoca el token del backend si existe (no bloquea la salida) */
    if (UniMap.api && UniMap.api.token()) UniMap.api.cerrarSesionBackend();
    util.almacen.quitar(llaveSesion);
    estado.usuarioActual = null;
    estado.favoritos = [];
    window.location.href = RUTA_INDEX;
  }

  /* ── TRADUCCION DE CUENTAS DEL BACKEND ────────────── */
  function mapearRolBackend(rol) {
    if (rol === 'administrador' || rol === 'personalAdministrativo') return 'admin';
    if (rol === 'estudiante') return 'estudiante';
    if (rol === 'docente') return 'docente';
    return rol || 'invitado';
  }

  function sesionDesdeBackend(u) {
    /* Los apellidos viajan separados (3FN). Si un backend antiguo no
       los manda, se divide el nombre completo como respaldo. */
    var nombre;
    var apellido;
    if (u.apellidoPaternoUsuario !== undefined || u.apellidoMaternoUsuario !== undefined) {
      nombre = String(u.nombreUsuario || '').trim();
      apellido = (String(u.apellidoPaternoUsuario || '').trim() + ' ' +
        String(u.apellidoMaternoUsuario || '').trim()).trim();
    } else {
      var partes = String(u.nombreUsuario || '').split(' ');
      nombre = partes[0] || u.nombreUsuario || '';
      apellido = partes.slice(1).join(' ') || '';
    }
    return {
      id: 'b' + u.idUsuario,
      nombre: nombre,
      apellido: apellido,
      correo: u.correoUsuario || '',
      rol: mapearRolBackend(u.rol),
      backend: true
    };
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

      /* Comprueba solo cuentas que el usuario haya registrado el
         mismo con el backend apagado (nada inventado por nosotros).
         `sinBackend` avisa de que la fuente de cuentas es la BD. */
      function loginLocal(mensajeSinBackend) {
        var usuarios = obtenerUsuarios();
        var encontrado = null;
        for (var u = 0; u < usuarios.length; u++) {
          if (usuarios[u].correo === correo && usuarios[u].contrasena === pass) {
            encontrado = usuarios[u];
            break;
          }
        }

        if (!encontrado) {
          mostrarError('contrasena-login', UniMap.i18n.t(mensajeSinBackend || 'err.credenciales'));
          return;
        }

        guardarSesion(encontrado);
        window.location.href = RUTA_MAPA;
      }

      /* 1) Intento con el backend Laravel: si la cuenta existe ahi se
            guarda el token (Sanctum) que usa el panel de administracion
            para sincronizar los cambios con la base de datos.
         2) Si el backend esta apagado no hay cuentas que comprobar
            (la unica fuente de usuarios es la base de datos): se
            comprueba la lista local y, si esta vacia, se avisa. */
      if (UniMap.api && UniMap.api.activa()) {
        UniMap.api.iniciarSesion(correo, pass).then(function (res) {
          if (res.ok) {
            guardarSesion(sesionDesdeBackend(res.usuario));
            window.location.href = RUTA_MAPA;
            return;
          }
          loginLocal(res.estado === 0 ? 'err.sinBackend' : null);
        });
        return;
      }

      loginLocal('err.sinBackend');
    });

    /* REGISTRO */
    formularioRegistro.addEventListener('submit', function (e) {
      e.preventDefault();
      limpiarTodosLosErrores();
      var ok = true;
      var nombre = util.el('nombre-registro').value.trim();
      var apellido = util.el('apellido-registro').value.trim();
      var correo = util.el('correo-registro').value.trim();
      var pass = util.el('contrasena-registro').value;
      var pass2 = util.el('contrasena2-registro').value;

      if (!nombre || nombre.length < 2) { mostrarError('nombre-registro', nombre ? UniMap.i18n.t('err.min2') : UniMap.i18n.t('err.nombre')); ok = false; }
      if (!apellido || apellido.length < 2) { mostrarError('apellido-registro', apellido ? UniMap.i18n.t('err.min2') : UniMap.i18n.t('err.apellido')); ok = false; }
      if (!correo) { mostrarError('correo-registro', UniMap.i18n.t('err.correoRequerido')); ok = false; }
      else if (!util.validarCorreo(correo)) { mostrarError('correo-registro', UniMap.i18n.t('err.correoInvalido')); ok = false; }
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

      function registroLocal() {
        var nuevo = {
          id: 'u' + Date.now(),
          nombre: nombre,
          apellido: apellido,
          correo: correo,
          rol: 'personal',
          contrasena: pass,
          fechaRegistro: new Date().toISOString()
        };

        usuarios.push(nuevo);
        guardarUsuarios(usuarios);
        guardarSesion(nuevo);
        window.location.href = RUTA_MAPA;
      }

      /* Intento en el backend Laravel. El backend asigna automaticamente
         el rol 'personal' (no se elige desde el formulario) y exige
         contrasenas de 8+ caracteres. Si no hay backend, el registro
         queda en local con rol 'personal'. */
      if (UniMap.api && UniMap.api.activa() && pass.length >= 8) {
        var campoMaterno = util.el('apellidoMaterno-registro');
        UniMap.api.registrarse({
          nombre: nombre,
          apellidoPaterno: apellido,
          apellidoMaterno: campoMaterno ? campoMaterno.value.trim() : '',
          correo: correo,
          contrasena: pass
        }).then(function (res) {
          if (res.ok) {
            guardarSesion(sesionDesdeBackend(res.usuario));
            window.location.href = RUTA_MAPA;
            return;
          }
          registroLocal();
        });
        return;
      }

      registroLocal();
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
