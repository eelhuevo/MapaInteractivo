/* =========================================================
   core/i18n.js — internacionalizacion ES / EN (HU-15)
   · diccionario con todas las cadenas visibles de la interfaz
   · aplica traducciones a [data-i18n], [data-i18n-title],
     [data-i18n-placeholder] y <option data-i18n>
   · selector de idioma (.boton-idioma) persistido en localStorage
   ========================================================= */
(function () {
  'use strict';

  var UniMap = window.UniMap;
  var util = UniMap.util;

  var LLAVE = 'unimap_idioma';

  /* ── DICCIONARIO ──────────────────────────────────── */
  var ES = {
    /* index.html — autenticacion */
    'auth.tagline': 'Explora tu campus universitario de forma interactiva. Encuentra aulas, laboratorios y oficinas en un solo lugar.',
    'auth.feat1': 'Mapa interactivo 2D con zoom y paneo',
    'auth.feat2': 'Visor 3D de los modelos del campus',
    'auth.feat3': 'Busca espacios por nombre, tipo o docente',
    'auth.feat4': 'Guarda espacios como favoritos rapidamente',
    'auth.login': 'Iniciar Sesion',
    'auth.correo': 'Correo electronico',
    'auth.phCorreo': 'ejemplo@universidad.edu',
    'auth.contrasena': 'Contrasena',
    'auth.phPass': 'Tu contrasena',
    'auth.phPassNuevo': 'Minimo 6 caracteres',
    'auth.phPassConfirmar': 'Repite tu contrasena',
    'auth.mostrar': 'Mostrar',
    'auth.entrar': 'Entrar',
    'auth.noCuenta': 'No tienes cuenta?',
    'auth.registrate': 'Registrate',
    'auth.registro': 'Crear Cuenta',
    'auth.nombre': 'Nombre',
    'auth.apellido': 'Apellido',
    'auth.phNombre': 'Juan',
    'auth.phApellido': 'Perez',
    'auth.rol': 'Rol',
    'auth.seleccionaRol': 'Selecciona tu rol',
    'auth.rolEstudiante': 'Estudiante',
    'auth.rolDocente': 'Docente',
    'auth.rolAdmin': 'Administrativo',
    'auth.crearCuenta': 'Crear Cuenta',
    'auth.tienesCuenta': 'Ya tienes cuenta?',
    'auth.iniciaSesion': 'Inicia sesion',
    'auth.invitado': 'Entrar como Invitado',
    'auth.demo': 'Cuenta de prueba:',
    'auth.ocultar': 'Ocultar',
    'auth.confirmaPass': 'Confirmar contrasena',
    'auth.o': 'o',
    'auth.registroExitoso': 'Registro exitoso. Iniciando sesion...',

    /* Errores de validacion (HU-15 / HU-16 / HU-17) */
    'err.correoObligatorio': 'El correo es obligatorio',
    'err.correoInvalido': 'Correo invalido',
    'err.passObligatoria': 'La contrasena es obligatoria',
    'err.min6': 'Minimo 6 caracteres',
    'err.min2': 'Minimo 2 caracteres',
    'err.credenciales': 'Correo o contrasena incorrectos',
    'err.nombre': 'Nombre requerido',
    'err.apellido': 'Apellido requerido',
    'err.correoRequerido': 'Correo requerido',
    'err.rol': 'Selecciona un rol',
    'err.passRequerida': 'Contrasena requerida',
    'err.confirma': 'Confirma tu contrasena',
    'err.noCoinciden': 'Las contrasenas no coinciden',
    'err.yaRegistrado': 'Este correo ya esta registrado',

    /* barra superior */
    'top.buscarPh': 'Buscar aula, oficina, docente...',
    'top.filtros': 'Filtros',
    'top.horarios': 'Horarios',
    'top.favoritos': 'Favoritos',
    'top.servicios': 'Servicios del edificio',
    'top.ruta': 'Trazar ruta',
    'top.escanear': 'Escanear QR',
    'top.avisos': 'Notificaciones',
    'top.sugerencias': 'Para ti',
    'top.admin': 'Administracion',
    'top.ubicacion': 'Mi ubicacion',
    'top.salir': 'Cerrar sesion',
    'top.idioma': 'Idioma',
    'top.vista2d': 'Vista plano 2D',
    'top.vista3d': 'Vista tridimensional 3D',
    'top.acercar': 'Acercar',
    'top.alejar': 'Alejar',
    'top.reiniciar': 'Restablecer vista',
    'top.camara': 'Restablecer camara',
    'top.rotacion': 'Rotacion automatica',

    /* panel de filtros */
    'filtros.titulo': 'Filtros',
    'filtros.tipo': 'Tipo de espacio',
    'tipo.aula': 'Aulas',
    'tipo.laboratorio': 'Laboratorios',
    'tipo.oficina': 'Oficinas',
    'tipo.biblioteca': 'Biblioteca',
    'tipo.auditorio': 'Auditorios',
    'tipo.comedor': 'Comedor',
    'tipo.deportivo': 'Deportivo',
    'tipo.salon': 'Salones',
    'filtros.torre': 'Torre',
    'torre.antigua': 'Torre Antigua',
    'torre.innovacion': 'Torre Innovacion',
    'filtros.disponibilidad': 'Disponibilidad',
    'filtros.disponibles': 'Disponibles',
    'filtros.noDisponibles': 'No disponibles',
    'filtros.piso': 'Piso',
    'filtros.labTipo': 'Tipo de laboratorio',
    'lab.informatica': 'Informatica',
    'lab.electronica': 'Electronica',
    'lab.fisica': 'Fisica',
    'lab.quimica': 'Quimica',
    'lab.mecanica': 'Mecanica',
    'lab.ia': 'Inteligencia Artificial',
    'lab.robotica': 'Robotica',
    'lab.iot': 'IoT',
    'lab.ciberseguridad': 'Ciberseguridad',
    'lab.produccion': 'Produccion',
    'filtros.aplicar': 'Aplicar Filtros',
    'filtros.restablecer': 'Restablecer',
    'filtros.aplicados': 'Filtros aplicados',
    'filtros.restablecidos': 'Filtros restablecidos',
    'filtros.alMenosTorre': 'Selecciona al menos una torre',
    'filtros.alMenosPiso': 'Selecciona al menos un piso',
    'filtros.alMenosLab': 'Selecciona al menos un tipo de laboratorio',
    'filtros.pisoOculto': 'Ese piso esta oculto por los filtros',
    'filtros.torreOculta': 'Esa torre esta oculta por los filtros',

    /* favoritos */
    'fav.titulo': 'Mis Favoritos',
    'fav.vacio': 'No tienes favoritos aun',
    'fav.vacioSub': 'Haz clic en un espacio y guarda tu favorito',
    'fav.agregado': 'Agregado a favoritos',
    'fav.eliminado': 'Eliminado de favoritos',
    'fav.fechaa': 'Agregado:',
    'fav.requiere': 'Inicia sesion para usar favoritos',
    'fav.btnAgregar': '\u2606 Agregar a favoritos',
    'fav.btnQuitar': '\u2605 Quitar de favoritos',

    /* horarios */
    'hor.titulo': 'Horarios de Docentes',
    'hor.buscarPh': 'Buscar docente...',
    'hor.docente': 'Horario del docente:',

    /* tooltip / ficha */
    'tip.capacidad': 'Capacidad:',
    'tip.personas': 'personas',
    'tip.docente': 'Docente:',
    'tip.contacto': 'Contacto:',
    'tip.horario': 'Horario:',
    'tip.piso': 'Piso:',
    'tip.torre': 'Torre:',
    'tip.abierto': 'Abierto',
    'tip.cerrado': 'Cerrado',
    'tip.cierraA': 'Cierra a las',
    'tip.abreA': 'Abre a las',
    'tip.ruta': 'Trazar ruta',
    'tip.qr': 'Codigo QR',
    'tip.sinDatos': 'Sin datos de atencion',

    /* leyenda y pisos */
    'ley.activo': 'Activo',
    'ley.inactivo': 'Inactivo',
    'ley.usted': 'Usted aqui',
    'ley.entrada': 'Entrada',
    'ley.estacionamiento': 'Estacionamiento',
    'rol.admin': 'Administrador',
    'rol.invitado': 'Invitado',
    'piso.pb': 'Planta Baja',
    'piso.piso': 'Piso',
    'dia.lunes': 'Lunes', 'dia.martes': 'Martes', 'dia.miercoles': 'Miercoles',
    'dia.jueves': 'Jueves', 'dia.viernes': 'Viernes', 'dia.sabado': 'Sabado',

    /* Etiquetas singulares de tipos (ficha / listas) */
    'etiqueta.aula': 'Aula',
    'etiqueta.laboratorio': 'Laboratorio',
    'etiqueta.oficina': 'Oficina',
    'etiqueta.biblioteca': 'Biblioteca',
    'etiqueta.auditorio': 'Auditorio',
    'etiqueta.comedor': 'Comedor',
    'etiqueta.deportivo': 'Area Deportiva',
    'etiqueta.salon': 'Salon',
    'etiqueta.jardin': 'Jardin',
    'etiqueta.estacionamiento': 'Estacionamiento',
    'etiqueta.sanitarios': 'Sanitarios',
    'etiqueta.pasillo': 'Pasillo',
    'etiqueta.entrada': 'Entrada',

    /* buscador */
    'busq.sinResultados': 'No se encontraron resultados',

    /* servicios del edificio (HU-07) */
    'serv.titulo': 'Servicios del Edificio',
    'serv.buscarPh': 'Filtrar servicios...',
    'serv.vacio': 'No hay servicios para mostrar',
    'serv.ir': 'Ir',
    'serv.porPiso': 'por piso',

    /* ruta peatonal (HU-10) */
    'rut.sinDestino': 'Selecciona un destino en el mapa primero',
    'rut.listo': 'Ruta trazada hacia',
    'rut.limpiada': 'Ruta eliminada',
    'rut.distancia': 'Distancia aprox.:',
    'rut.metros': 'm',
    'rut.otraPlanta': 'El destino esta en {lugar}. Navegando...',
    'rut.abriendo': 'Mostrando la planta del destino...',

    /* ubicacion (HU-10 / HU-08) */
    'ubi.denegado': 'Permiso de ubicacion denegado. Usando el punto de acceso del campus',
    'ubi.noSoportado': 'Tu navegador no soporta geolocalizacion. Usando el punto de acceso del campus',
    'ubi.obtenida': 'Ubicacion obtenida. Puedes trazar tu ruta',

    /* codigo QR (HU-11) */
    'qr.titulo': 'Codigo QR',
    'qr.info': 'Escanea este codigo para abrir la ficha directamente',
    'qr.descargar': 'Descargar PNG',
    'qr.copiar': 'Copiar enlace',
    'qr.copiado': 'Enlace copiado',
    'qr.escanearTitulo': 'Escanear codigo QR',
    'qr.camara': 'Apunta la camara al codigo QR',
    'qr.sinCamara': 'No se pudo acceder a la camara. Pega aqui el enlace del codigo',
    'qr.pegarPh': 'Pega aqui el enlace del QR',
    'qr.abrir': 'Abrir',
    'qr.invalido': 'Codigo no reconocido',
    'qr.preparandoCamara': 'Preparando camara...',

    /* notificaciones / avisos (HU-13) */
    'av.titulo': 'Notificaciones',
    'av.vacio': 'Sin notificaciones',
    'av.marcarTodo': 'Marcar todo como leido',
    'av.nuevos': 'avisos nuevos',
    'av.horario': 'El horario de "{n}" cambio de {a} a {b}',
    'av.estado': 'El estado de "{n}" cambio a {a}',
    'av.nombre': '"{a}" ahora se llama "{n}"',
    'av.piso': '"{n}" cambio de piso: {a}',
    'av.ubicacion': '"{n}" cambio de ubicacion en el plano',
    'av.nuevo': 'Nuevo espacio disponible: "{n}"',
    'av.eliminado': 'El espacio "{n}" fue retirado del mapa',

    /* sugerencias por carrera y semestre (HU-20) */
    'sug.titulo': 'Para Ti',
    'sug.perfil': 'Mi perfil',
    'sug.carrera': 'Carrera',
    'sug.semestre': 'Semestre',
    'sug.guardar': 'Guardar',
    'sug.vacio': 'Completa tu perfil para recibir sugerencias',
    'sug.vacio2': 'No hay sugerencias por ahora',
    'sug.ir': 'Ir',
    'sug.listo': 'Perfil guardado',
    'sug.actualiza': 'Actualiza tu perfil para mejores sugerencias',
    'carr.ing-sistemas': 'Ing. Sistemas',
    'carr.ing-electronica': 'Ing. Electronica',
    'carr.ing-industrial': 'Ing. Industrial',
    'carr.ing-civil': 'Ing. Civil',
    'carr.admin': 'Administracion',
    'carr.derecho': 'Derecho',
    'carr.ciencias': 'Ciencias',

    /* estadisticas (HU-14) */
    'est.titulo': 'Estadisticas de uso',
    'est.consultas': 'consultas',
    'est.top': 'Espacios mas consultados',
    'est.sinDatos': 'Aun no hay datos de consulta',
    'est.total': 'Total de espacios',

    /* visor 3D (HU-05) */
    'v3.vista3d': 'Vista 3D',
    'v3.modelo': 'Modelo: {n}',
    'v3.errorCampus': 'Error al cargar el campus 3D',
    'v3.errorModelo': 'Error al cargar el modelo 3D',
    'v3.sinThree': 'No se pudo cargar Three.js. Revisa la carpeta /vendor/three.',
    'v3.sinWebgl': 'Tu navegador no soporta WebGL, necesario para la vista 3D.',
    'v3.avisoCampus': 'No se pudieron cargar los modelos del campus. Usa INICIAR.bat para servir el proyecto por HTTP.',
    'v3.avisoModelo': 'No se pudo cargar "{n}". Si abriste el proyecto con doble clic (file://), usa INICIAR.bat para servirlo por HTTP.',
    'v3.eligeModelo': 'Elige un modelo 3D para situar los espacios del campus.',
    'v3.cargandoTitulo': 'Cargando modelo 3D',
    'v3.preparando': 'Preparando escena...',
    'v3.cargandoCampus': 'Cargando campus...',
    'v3.cargandoPiezas': 'Cargando campus: {n}',
    'v3.descargando': 'Descargando {n}...',
    'v3.rotacionOn': 'Rotacion automatica activada',
    'v3.rotacionOff': 'Rotacion automatica desactivada',

    /* panel de administracion (HU-06) */
    'adm.titulo': 'Administracion del Campus',
    'adm.volver': 'Volver al mapa',
    'adm.espacios': 'Espacios',
    'adm.estadisticas': 'Estadisticas',
    'adm.nuevo': 'Nuevo espacio',
    'adm.editar': 'Editar',
    'adm.eliminar': 'Eliminar',
    'adm.guardar': 'Guardar',
    'adm.cancelar': 'Cancelar',
    'adm.confirmarEliminar': 'Eliminar "{n}"? El espacio se ocultara del mapa',
    'adm.creado': 'Espacio creado',
    'adm.actualizado': 'Cambios guardados',
    'adm.eliminadoMsg': 'Espacio eliminado del mapa',
    'adm.sinPermisos': 'Necesitas iniciar sesion como administrador',
    'adm.nombre': 'Nombre',
    'adm.tipo': 'Tipo',
    'adm.torre': 'Torre',
    'adm.piso': 'Piso',
    'adm.estado': 'Estado',
    'adm.accion': 'Acciones',
    'adm.horario': 'Horario de atencion',
    'adm.telefono': 'Contacto',
    'adm.capacidad': 'Capacidad',
    'adm.buscarPh': 'Buscar espacio...',
    'adm.vacio': 'Sin resultados',
    'adm.restaurar': 'Restaurar datos demo',
    'adm.restaurado': 'Datos demo restaurados',
    'adm.est.creado': 'Creado por ti (personalizado)',
    'adm.seccionTipo': 'Distribucion por tipo',
    'adm.seccionTop': 'Mas consultados',
    'adm.errMin2': 'Min. 2 caracteres',
    'adm.errRequerido': 'Requerido',
    'adm.errPiso': 'Piso entre 0 y 8',

    /* gestion de usuarios (HU-17: registro por administrador) */
    'adm.usuarios': 'Usuarios',
    'adm.usuariosVacio': 'Sin usuarios registrados',
    'adm.userNuevo': 'Nuevo usuario',
    'adm.userEditar': 'Editar usuario',
    'adm.userPassPh': 'Minimo 6 caracteres',
    'adm.userPassOblig': 'Contrasena requerida',
    'adm.userCreado': 'Usuario creado',
    'adm.userActualizado': 'Usuario actualizado',
    'adm.userEliminado': 'Usuario eliminado',
    'adm.userConfirmar': 'Eliminar al usuario "{n}"?',
    'adm.userNoSelf': 'No puedes eliminar tu propia cuenta',
    'adm.userFecha': 'Registro'
  };

  var EN = {
    'auth.tagline': 'Explore your university campus interactively. Find classrooms, labs and offices in one place.',
    'auth.feat1': 'Interactive 2D map with zoom and pan',
    'auth.feat2': '3D viewer of the campus models',
    'auth.feat3': 'Search spaces by name, type or professor',
    'auth.feat4': 'Save spaces as favorites quickly',
    'auth.login': 'Sign In',
    'auth.correo': 'Email',
    'auth.phCorreo': 'example@university.edu',
    'auth.contrasena': 'Password',
    'auth.phPass': 'Your password',
    'auth.phPassNuevo': 'At least 6 characters',
    'auth.phPassConfirmar': 'Repeat your password',
    'auth.mostrar': 'Show',
    'auth.entrar': 'Enter',
    'auth.noCuenta': "Don't have an account?",
    'auth.registrate': 'Sign up',
    'auth.registro': 'Create Account',
    'auth.nombre': 'First name',
    'auth.apellido': 'Last name',
    'auth.phNombre': 'John',
    'auth.phApellido': 'Doe',
    'auth.rol': 'Role',
    'auth.seleccionaRol': 'Select your role',
    'auth.rolEstudiante': 'Student',
    'auth.rolDocente': 'Professor',
    'auth.rolAdmin': 'Staff',
    'auth.crearCuenta': 'Create Account',
    'auth.tienesCuenta': 'Already have an account?',
    'auth.iniciaSesion': 'Sign in',
    'auth.invitado': 'Continue as Guest',
    'auth.demo': 'Demo account:',
    'auth.ocultar': 'Hide',
    'auth.confirmaPass': 'Confirm password',
    'auth.o': 'or',
    'auth.registroExitoso': 'Registration successful. Signing you in...',

    /* Errores de validacion (HU-15 / HU-16 / HU-17) */
    'err.correoObligatorio': 'Email is required',
    'err.correoInvalido': 'Invalid email',
    'err.passObligatoria': 'Password is required',
    'err.min6': 'At least 6 characters',
    'err.min2': 'At least 2 characters',
    'err.credenciales': 'Incorrect email or password',
    'err.nombre': 'First name required',
    'err.apellido': 'Last name required',
    'err.correoRequerido': 'Email required',
    'err.rol': 'Select a role',
    'err.passRequerida': 'Password required',
    'err.confirma': 'Confirm your password',
    'err.noCoinciden': 'Passwords do not match',
    'err.yaRegistrado': 'This email is already registered',

    'top.buscarPh': 'Search room, office, professor...',
    'top.filtros': 'Filters',
    'top.horarios': 'Schedules',
    'top.favoritos': 'Favorites',
    'top.servicios': 'Building services',
    'top.ruta': 'Draw route',
    'top.escanear': 'Scan QR',
    'top.avisos': 'Notifications',
    'top.sugerencias': 'For you',
    'top.admin': 'Administration',
    'top.ubicacion': 'My location',
    'top.salir': 'Log out',
    'top.idioma': 'Language',
    'top.vista2d': '2D plan view',
    'top.vista3d': '3D view',
    'top.acercar': 'Zoom in',
    'top.alejar': 'Zoom out',
    'top.reiniciar': 'Reset view',
    'top.camara': 'Reset camera',
    'top.rotacion': 'Auto rotate',

    'filtros.titulo': 'Filters',
    'filtros.tipo': 'Space type',
    'tipo.aula': 'Classrooms',
    'tipo.laboratorio': 'Labs',
    'tipo.oficina': 'Offices',
    'tipo.biblioteca': 'Library',
    'tipo.auditorio': 'Auditoriums',
    'tipo.comedor': 'Cafeteria',
    'tipo.deportivo': 'Sports',
    'tipo.salon': 'Halls',
    'filtros.torre': 'Tower',
    'torre.antigua': 'Old Tower',
    'torre.innovacion': 'Innovation Tower',
    'filtros.disponibilidad': 'Availability',
    'filtros.disponibles': 'Available',
    'filtros.noDisponibles': 'Unavailable',
    'filtros.piso': 'Floor',
    'filtros.labTipo': 'Lab type',
    'lab.informatica': 'Computer science',
    'lab.electronica': 'Electronics',
    'lab.fisica': 'Physics',
    'lab.quimica': 'Chemistry',
    'lab.mecanica': 'Mechanics',
    'lab.ia': 'Artificial Intelligence',
    'lab.robotica': 'Robotics',
    'lab.iot': 'IoT',
    'lab.ciberseguridad': 'Cybersecurity',
    'lab.produccion': 'Production',
    'filtros.aplicar': 'Apply Filters',
    'filtros.restablecer': 'Reset',
    'filtros.aplicados': 'Filters applied',
    'filtros.restablecidos': 'Filters reset',
    'filtros.alMenosTorre': 'Select at least one tower',
    'filtros.alMenosPiso': 'Select at least one floor',
    'filtros.alMenosLab': 'Select at least one lab type',
    'filtros.pisoOculto': 'That floor is hidden by the filters',
    'filtros.torreOculta': 'That tower is hidden by the filters',

    'fav.titulo': 'My Favorites',
    'fav.vacio': 'You have no favorites yet',
    'fav.vacioSub': 'Click a space and save it to your favorites',
    'fav.agregado': 'Added to favorites',
    'fav.eliminado': 'Removed from favorites',
    'fav.fechaa': 'Added:',
    'fav.requiere': 'Log in to use favorites',
    'fav.btnAgregar': '\u2606 Add to favorites',
    'fav.btnQuitar': '\u2605 Remove from favorites',

    'hor.titulo': 'Professor Schedules',
    'hor.buscarPh': 'Search professor...',
    'hor.docente': 'Professor schedule:',

    'tip.capacidad': 'Capacity:',
    'tip.personas': 'people',
    'tip.docente': 'Professor:',
    'tip.contacto': 'Contact:',
    'tip.horario': 'Hours:',
    'tip.piso': 'Floor:',
    'tip.torre': 'Tower:',
    'tip.abierto': 'Open',
    'tip.cerrado': 'Closed',
    'tip.cierraA': 'Closes at',
    'tip.abreA': 'Opens at',
    'tip.ruta': 'Draw route',
    'tip.qr': 'QR code',
    'tip.sinDatos': 'No opening hours data',

    'ley.activo': 'Active',
    'ley.inactivo': 'Inactive',
    'ley.usted': 'You are here',
    'ley.entrada': 'Entrance',
    'ley.estacionamiento': 'Parking',
    'rol.admin': 'Administrator',
    'rol.invitado': 'Guest',
    'piso.pb': 'Ground floor',
    'piso.piso': 'Floor',
    'dia.lunes': 'Monday', 'dia.martes': 'Tuesday', 'dia.miercoles': 'Wednesday',
    'dia.jueves': 'Thursday', 'dia.viernes': 'Friday', 'dia.sabado': 'Saturday',

    /* Etiquetas singulares de tipos (ficha / listas) */
    'etiqueta.aula': 'Classroom',
    'etiqueta.laboratorio': 'Lab',
    'etiqueta.oficina': 'Office',
    'etiqueta.biblioteca': 'Library',
    'etiqueta.auditorio': 'Auditorium',
    'etiqueta.comedor': 'Cafeteria',
    'etiqueta.deportivo': 'Sports Area',
    'etiqueta.salon': 'Hall',
    'etiqueta.jardin': 'Garden',
    'etiqueta.estacionamiento': 'Parking',
    'etiqueta.sanitarios': 'Restrooms',
    'etiqueta.pasillo': 'Corridor',
    'etiqueta.entrada': 'Entrance',

    'busq.sinResultados': 'No results found',

    'serv.titulo': 'Building Services',
    'serv.buscarPh': 'Filter services...',
    'serv.vacio': 'No services to show',
    'serv.ir': 'Go',
    'serv.porPiso': 'per floor',

    'rut.sinDestino': 'Select a destination on the map first',
    'rut.listo': 'Route drawn to',
    'rut.limpiada': 'Route removed',
    'rut.distancia': 'Approx. distance:',
    'rut.metros': 'm',
    'rut.otraPlanta': 'The destination is at {lugar}. Navigating...',
    'rut.abriendo': 'Showing the destination floor...',

    'ubi.denegado': 'Location permission denied. Using the campus entrance point',
    'ubi.noSoportado': 'Your browser does not support geolocation. Using the campus entrance point',
    'ubi.obtenida': 'Location obtained. You can draw your route',

    'qr.titulo': 'QR code',
    'qr.info': 'Scan this code to open the details directly',
    'qr.descargar': 'Download PNG',
    'qr.copiar': 'Copy link',
    'qr.copiado': 'Link copied',
    'qr.escanearTitulo': 'Scan QR code',
    'qr.camara': 'Point the camera at the QR code',
    'qr.sinCamara': "Could not access the camera. Paste the code link here",
    'qr.pegarPh': 'Paste the QR link here',
    'qr.abrir': 'Open',
    'qr.invalido': 'Unrecognized code',
    'qr.preparandoCamara': 'Preparing camera...',

    'av.titulo': 'Notifications',
    'av.vacio': 'No notifications',
    'av.marcarTodo': 'Mark all as read',
    'av.nuevos': 'new notices',
    'av.horario': 'The schedule of "{n}" changed from {a} to {b}',
    'av.estado': 'The status of "{n}" changed to {a}',
    'av.nombre': '"{a}" is now named "{n}"',
    'av.piso': '"{n}" changed floor: {a}',
    'av.ubicacion': '"{n}" moved on the floor plan',
    'av.nuevo': 'New space available: "{n}"',
    'av.eliminado': 'Space "{n}" was removed from the map',

    'sug.titulo': 'For You',
    'sug.perfil': 'My profile',
    'sug.carrera': 'Degree',
    'sug.semestre': 'Semester',
    'sug.guardar': 'Save',
    'sug.vacio': 'Complete your profile to get suggestions',
    'sug.vacio2': 'No suggestions right now',
    'sug.ir': 'Go',
    'sug.listo': 'Profile saved',
    'sug.actualiza': 'Update your profile for better suggestions',
    'carr.ing-sistemas': 'Systems Eng.',
    'carr.ing-electronica': 'Electronics Eng.',
    'carr.ing-industrial': 'Industrial Eng.',
    'carr.ing-civil': 'Civil Eng.',
    'carr.admin': 'Business Admin.',
    'carr.derecho': 'Law',
    'carr.ciencias': 'Sciences',

    'est.titulo': 'Usage statistics',
    'est.consultas': 'views',
    'est.top': 'Most viewed spaces',
    'est.sinDatos': 'No view data yet',
    'est.total': 'Total spaces',

    /* visor 3D (HU-05) */
    'v3.vista3d': '3D View',
    'v3.modelo': 'Model: {n}',
    'v3.errorCampus': 'Error loading the 3D campus',
    'v3.errorModelo': 'Error loading the 3D model',
    'v3.sinThree': 'Could not load Three.js. Check the /vendor/three folder.',
    'v3.sinWebgl': 'Your browser does not support WebGL, required for the 3D view.',
    'v3.avisoCampus': 'The campus models could not be loaded. Use INICIAR.bat to serve the project over HTTP.',
    'v3.avisoModelo': 'Could not load "{n}". If you opened the project by double clicking (file://), use INICIAR.bat to serve it over HTTP.',
    'v3.eligeModelo': 'Choose a 3D model to place the campus spaces.',
    'v3.cargandoTitulo': 'Loading 3D model',
    'v3.preparando': 'Preparing scene...',
    'v3.cargandoCampus': 'Loading campus...',
    'v3.cargandoPiezas': 'Loading campus: {n}',
    'v3.descargando': 'Downloading {n}...',
    'v3.rotacionOn': 'Auto rotate on',
    'v3.rotacionOff': 'Auto rotate off',

    'adm.titulo': 'Campus Administration',
    'adm.volver': 'Back to map',
    'adm.espacios': 'Spaces',
    'adm.estadisticas': 'Statistics',
    'adm.nuevo': 'New space',
    'adm.editar': 'Edit',
    'adm.eliminar': 'Delete',
    'adm.guardar': 'Save',
    'adm.cancelar': 'Cancel',
    'adm.confirmarEliminar': 'Delete "{n}"? The space will be hidden from the map',
    'adm.creado': 'Space created',
    'adm.actualizado': 'Changes saved',
    'adm.eliminadoMsg': 'Space removed from the map',
    'adm.sinPermisos': 'You need to sign in as an administrator',
    'adm.nombre': 'Name',
    'adm.tipo': 'Type',
    'adm.torre': 'Tower',
    'adm.piso': 'Floor',
    'adm.estado': 'Status',
    'adm.accion': 'Actions',
    'adm.horario': 'Business hours',
    'adm.telefono': 'Contact',
    'adm.capacidad': 'Capacity',
    'adm.buscarPh': 'Search space...',
    'adm.vacio': 'No results',
    'adm.restaurar': 'Restore demo data',
    'adm.restaurado': 'Demo data restored',
    'adm.est.creado': 'Created by you (custom)',
    'adm.seccionTipo': 'Distribution by type',
    'adm.seccionTop': 'Most viewed',
    'adm.errMin2': 'Min. 2 characters',
    'adm.errRequerido': 'Required',
    'adm.errPiso': 'Floor between 0 and 8',

    /* user management (HU-17: admin registration) */
    'adm.usuarios': 'Users',
    'adm.usuariosVacio': 'No registered users',
    'adm.userNuevo': 'New user',
    'adm.userEditar': 'Edit user',
    'adm.userPassPh': 'At least 6 characters',
    'adm.userPassOblig': 'Password required',
    'adm.userCreado': 'User created',
    'adm.userActualizado': 'User updated',
    'adm.userEliminado': 'User deleted',
    'adm.userConfirmar': 'Delete user "{n}"?',
    'adm.userNoSelf': 'You cannot delete your own account',
    'adm.userFecha': 'Registered'
  };

  var actual = util.almacen.leer(LLAVE, 'es');
  if (actual !== 'en') actual = 'es';

  /* ── TRADUCCION ───────────────────────────────────── */
  function t(clave, params) {
    var dic = actual === 'en' ? EN : ES;
    var texto = dic[clave] !== undefined ? dic[clave]
      : (ES[clave] !== undefined ? ES[clave] : clave);
    if (params) {
      for (var k in params) {
        if (params.hasOwnProperty(k)) {
          texto = texto.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
        }
      }
    }
    return texto;
  }

  function aplicar() {
    document.documentElement.lang = actual;

    var elems = util.todos('[data-i18n]');
    for (var i = 0; i < elems.length; i++) elems[i].textContent = t(elems[i].getAttribute('data-i18n'));

    var titulos = util.todos('[data-i18n-title]');
    for (var j = 0; j < titulos.length; j++) titulos[j].setAttribute('title', t(titulos[j].getAttribute('data-i18n-title')));

    var phs = util.todos('[data-i18n-placeholder]');
    for (var p = 0; p < phs.length; p++) phs[p].setAttribute('placeholder', t(phs[p].getAttribute('data-i18n-placeholder')));

    var etiquetas = util.todos('[data-i18n-aria]');
    for (var a = 0; a < etiquetas.length; a++) etiquetas[a].setAttribute('aria-label', t(etiquetas[a].getAttribute('data-i18n-aria')));

    var actual_ = util.el('idioma-actual');
    if (actual_) actual_.textContent = actual.toUpperCase();

    document.dispatchEvent(new CustomEvent('idioma:cambiado', { detail: { idioma: actual } }));
  }

  function cambiar(nuevo) {
    if (nuevo !== 'es' && nuevo !== 'en') return;
    actual = nuevo;
    util.almacen.escribir(LLAVE, nuevo);
    aplicar();
  }

  function iniciar() {
    aplicar();
    var botones = util.todos('.boton-idioma');
    for (var b = 0; b < botones.length; b++) {
      botones[b].addEventListener('click', function () {
        cambiar(actual === 'es' ? 'en' : 'es');
      });
    }
  }

  UniMap.i18n = {
    iniciar: iniciar,
    aplicar: aplicar,
    cambiar: cambiar,
    t: t,
    obtener: function () { return actual; }
  };
})();
