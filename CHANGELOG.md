# Changelog

Todas las versiones del proyecto **UniMap — Mapa Interactivo de Campus**.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las
versiones usan [SemVer](https://semver.org/lang/es/) (`MAJOR.MINOR.PATCH`).

---

## [Unreleased]

### Anadido

- **Panel de administrador completo: 7 CRUDs nuevos en la web** (usuarios,
  estudiantes, docentes, materias, carreras, roles y catálogos), con un único
  motor de tablas + modal genérico en `admin.js` (no 7 módulos):
  · **9 pestañas**: Espacios, Usuarios, Estudiantes, Docentes, Materias,
    Carreras, Roles, Catálogos y Estadísticas (las 7 nuevas se cargan de forma
    perezosa la primera vez que se abren);
  · cada tabla tiene buscador sin tildes (`util.normalizar`), filtros de
    rol/carrera/estado, contador `n / total`, botones **Editar** y
    **Activar/Desactivar** (o **Eliminar** en catálogos simples);
  · el modal genérico adapta los campos al rol: al elegir *estudiante* aparecen
    carrera + semestre, con *docente* aparece departamento, oficina y un
    multi-select de materias; la contraseña vacía en edición significa
    «no cambiarla»;
  · cuentas, estudiantes y docentes **no se borran**: `DELETE` →
    `PATCH /admin/usuarios/{id}/estado` (`estaActivo`) con aviso de
    confirmación y botón para reactivar (así no se pierden favoritos,
    avisos ni estadísticas);
  · los catálogos simples sí admiten borrado real y muestran el motivo del
    **409** (p. ej. «Hay usuarios con este rol»);
  · Escape cierra el modal, el cambio de idioma repinta la pestaña abierta y
    todo se valida con `node --check` + pruebas en el navegador integrado
    (alta/edición/baja/búsqueda/filtros/idioma, 0 errores JS).

- **Backend: CRUD administrativo de esas 7 entidades** (rol
  `administrador`/`personalAdministrativo`, `php -l` OK):
  · `PUT /admin/usuarios/{id}` y `PATCH /admin/usuarios/{id}/estado`;
  · `GET/PUT /admin/estudiantes`, `GET/PUT /admin/docentes` (la edición
    sincroniza `idMaterias` con `semestreMateria = 1`);
  · `GET /admin/materias` (con `idDocentes`) y
    `POST/PUT/DELETE /admin/catalogos/{entidad}` para `roles`, `materias`,
    `carreras`, `tipos-espacio`, `categorias-servicio` y `tipos-laboratorio`,
    con guardas **409** cuando el registro está en uso;
  · `POST /admin/usuarios` ampliado: crea siempre la fila `docentes` (antes
    solo si venía departamento) y acepta `idEspacioOficina` e `idMaterias`;
  · `AdminUsuarioController::index`/`formaUsuario` devuelven además
    `idCarrera`, `semestreEstudiante` y `departamentoDocente` para precargar
    el modal de edición;
  · `AdminCatalogoController::store` acepta `idDocentes` al crear una materia
    (antes solo en `update`);
  · documentado en `backend/README.md` (tabla de endpoints).

- **3 endpoints `GET` que faltaban: `/api/roles`, `/api/materias`,
  `/api/estudiantes`** — con esto el backend cubre las consultas del proyecto
  completo (docentes, usuarios, pisos, aulas, estudiantes, categorías…):
  · `GET /api/roles` (**público**): catálogo de los 4 roles reales
    (`estudiante`, `docente`, `administrador`, `personalAdministrativo`) para
    el selector del registro (HU-17);
  · `GET /api/materias?buscar=` (**público**): 8 materias con los 14 vínculos
    de docentes activos (`docenteMaterias`), filtro `ilike` sin distinguir
    tildes (p. ej. `buscar=base` → «Base de Datos I»);
  · `GET /api/estudiantes?buscar=` (**con token Sanctum**): 2 estudiantes
    activos con nombre en 3FN (`nombre` + `apellidoPaterno` +
    `apellidoMaterno`, más `nombreCompleto` ya unido), correo, carrera y
    semestre — no es público porque hay datos personales;
  · nuevos `RolController`, `MateriaController`, `EstudianteController` +
    rutas en `routes/api.php` (todo validado con `php -l` y con las consultas
    equivalentes ejecutadas directo contra Supabase);
  · documentado en `backend/README.md` (tabla de endpoints).

- **Cero datos falsos en el frontend (último resto eliminado)**: `auth.js`
  dejaba de sembrar la cuenta inventada `admin@uni.edu` / `123456` (rol admin)
  en `localStorage` al cargar la página, y `loginLocal()` la aceptaba aunque el
  backend estuviera apagado. Ahora:
  · las **únicas cuentas** son las de los seeders (`admin@univalle.edu.bo` /
    `Admin12345`, etc.), vivas en la base de datos;
  · si el backend está apagado el login muestra el aviso nuevo
    `err.sinBackend` («Sin backend no hay cuentas…», es/en) en vez de dejar
    entrar con credenciales inventadas;
  · `loginLocal()` solo comprueba cuentas que el **propio usuario** registró
    con el backend apagado (datos suyos, no falsos);
  · `data/categorias.js` queda **vacío** como `espacios.js` y `docentes.js`
    (nadie leía esas 8 categorías: los tipos vienen de
    `GET /api/catalogos/tipos-espacio`);
  · `MANUAL-USUARIO.md` sección 4.1 ahora lista las 4 cuentas reales del
    backend y avisa de que sin backend no hay login;
  · `REVISION_HISTORIAS_DE_USUARIO.md` actualizado (el frontend ya sí consume
    el API y ya no hay credenciales divergentes);
  · versiones `auth.js?v=6`, `i18n.js?v=11` y `categorias.js?v=4`.

- **Endpoint `GET /api/docentes` + 10 docentes en los seeders**: la web ya no
  tiene docentes inventados. `DocenteController` devuelve nombre en 3FN
  (nombre / apellido paterno / apellido materno + `nombreCompleto`),
  departamento, correo, oficina, materias y **horario semanal** (turnos de
  lunes a domingo en "HH:MM"), con la tabla nueva `horariosDocente`
  (migración `2026_11_02_000001_create_horarios_docente_table`) y el modelo
  `HorarioDocente` + relación `Docente::horarios()`.
  · `DocenteSeeder` siembra **10 docentes** (`docente@` más `docente2@`…
    `docente10@`, todos con `Docente12345`), sus horarios (49 turnos) y sus
    materias; llamado desde `DatabaseSeeder` e idempotente
    (`firstOrCreate`/`syncWithoutDetaching`);
  · `frontend/js/data/docentes.js` queda **vacío** (como `espacios.js`):
    `api.js cargarDocentes()` pide la lista al backend, la publica en
    `UniMap.datos.docentes` y vincula cada docente a su espacio con
    `idEspacioOficina` → `espacio.docente = 'd'+idDocente`, que es el enlace
    que usan la búsqueda, el tooltip y el panel de horarios para saltar a su
    aula. Con el backend apagado el panel queda vacío (cero datos falsos);
  · versiones `api.js?v=5` y `docentes.js?v=4` en `index.html`, `mapa.html`
    y `admin.html`.

- **Backend como única fuente de datos del mapa**: la web ya no genera ni
  fusiona datos locales. `mapa.html` y `admin.html` piden los espacios con
  `GET /api/espacios?incluirInactivos=1` y el plano se llena solo con esa
  respuesta:
  · si el backend está apagado, el plano queda **vacío y con un aviso**
    (clave `mapa.sinBackend`): **cero datos inventados en el navegador**;
  · `localStorage` queda solo como *overrides* del administrador y cola
    offline (`unimap_pendientes_api`): lo que cambias sin backend se
    reintenta solo cuando vuelve;
  · se eliminó el generador de espacios de demostración
    (`data/espacios.js`) y la máquina de fusión de `personalizacion.js`;
  · los ids visibles son canónicos `b{id}` (con fallback en
    `api.js idDeBackend/idLocalDe` para legado);
  · el panel refresca desde el backend tras cada sync OK.

  Cambios de backend para esto:
  · `EspacioMapaResource` incluye ahora `estaActivo`, `contactoEspacio`,
    `capacidadAula` y `horarios` (rango "HH:MM-HH:MM");
  · `GET /api/espacios` acepta `?incluirInactivos=1`;
  · `CacheResponse` respeta `X-Cache-TTL: 0` (sin caché: los cambios se ven
    al instante, no tras los 60 s del caché);
  · **`CampusSeeder` reescrito**: ubica todos los espacios en el plano
    lógico 800x600 (columnas x=170/400, filas y=70/150/230/310/390) y los
    traduce a lat/lng con la fórmula inversa que usa el frontend, reubica
    los espacios legacy conservando su nombre (los referencian
    `SugerenciaSeeder` y `verificar_hu`), agrega la planta baja del
    Edificio B (10 tarjetas), los top floors (conferencias + auditorio) y
    genera por piso aulas/laboratorios/oficinas/salón con **nombres únicos
    globalmente** (incluyen torre y piso). Solo se crean los 4 tipos de
    laboratorio del catálogo; las aulas generadas no crean fila en
    `aulas` (HU-18 sigue con sus 5 aulas exactas);
  · **`CONFIGURAR.ps1` / `INSTALAR.bat` ahora ejecutan
    `php artisan db:seed --force`** (idempotente: todos los seeders usan
    `firstOrCreate`, solo agregan lo que falte) e **imprimen los conteos
    de las tablas** al terminar, para ver que los datos entraron. En la
    máquina que ya estaba configurada basta con correr `CONFIGURAR.bat`
    una vez (aplica la migración de usuarios y re-siembra).

- **Nombres de usuario en 3FN (3ª forma normal)**: `nombreUsuario` deja de
  guardar el nombre completo en una columna. Nueva migración
  `2026_11_01_000001_normalizar_nombres_usuarios` que agrega
  `apellidoPaternoUsuario` / `apellidoMaternoUsuario` y parte los datos
  existentes (regla: ≥3 partes → nombre = menos las 2 últimas). Modelo
  `Usuario` con `nombre_completo`, `dividirNombre()` y `resolverNombre()`;
  `AuthController` y `AdminUsuarioController` aceptan los apellidos como
  opcionales (si no llegan, dividen el nombre solos) y devuelven los tres
  campos más `nombreCompleto`. El registro en la web envía los apellidos
  separados (campo nuevo opcional «Apellido materno»). `UsuarioSeeder`
  siembra las 4 cuentas demo con nombre de 3 partes (contraseñas sin
  cambios).

- **`INSTALAR.bat` — instalación automática en PC nueva**: busca primero un
  PHP 8.3+ con extensiones en el PATH; si no está (o le faltan), descarga
  PHP 8.4 portable a `%USERPROFILE%\php84` sin tocar XAMPP ni el PHP del
  sistema, crea su `php.ini`, **agrega la carpeta al PATH de usuario**,
  descarga Composer y crea un shim `composer.bat`, y continúa solo con
  `CONFIGURAR.ps1` (.env, `composer install`, APP_KEY, conexión,
  migraciones, semillas y conteos). Después solo quedan dos dobles clics:
  `INICIAR.bat` y `INICIAR-BACKEND.bat`. Corregido el error que fallaba
  escribiendo en `%USERPROFILE%\php84` cuando esa carpeta no existía.
- **Puente REST entre la web y el backend Laravel** (`js/core/api.js`): el panel
  de administracion ahora envia altas, ediciones y bajas de espacios a
  `POST/PUT/DELETE /api/admin/espacios` con el token Sanctum. Si el backend esta
  apagado el cambio se guarda en localStorage, se encola y se reintenta solo
  (cola en `unimap_pendientes_api`, con candado de 10 s y reintento al cargar
  `admin.html`).
- **`backend/config/cors.php`**: sin el, Laravel no emitia cabeceras CORS y el
  navegador bloqueaba todas las llamadas desde `localhost:8080` a `localhost:8000`.
- **`INICIAR-BACKEND.bat`**: arranca `php artisan serve` en el puerto 8000.
  Ahora **elige el PHP correcto**: primero el portable de
  `%USERPROFILE%\php84` y después el del PATH, pero solo si cumple
  **PHP 8.3+ con `pdo_pgsql`, `mbstring` y `curl`** (así no arranca con
  el PHP 8.0 de XAMPP y muere en silencio); si ninguno sirve, explica el
  problema y sugiere `INSTALAR.bat`. Al terminar abre
  `http://localhost:8000/api/edificios` (el chequeo real; la raíz `/api`
  da 404, que es normal).
- **`INICIAR.bat` sin Python**: si la PC no tiene Python, usa el PHP portable
  como servidor estático de la página (mismo doble clic).
- **Tipos de espacio `auditorio`, `comedor` y `salon`** en `CatalogoSeeder`: ya
  existian en el panel web pero no en la BD, y el CRUD del admin los rechazaba.
- **Textos de sincronizacion en i18n** (`adm.sync*`) en español e inglés.
- **Caché de respuestas HTTP en el backend (`cache.res`)**: la primera carga
  de la web consulta Supabase una vez (~3 s) y las siguientes se leen de disco
  en milisegundos. El middleware `CacheResponse` se registra sobre el grupo de
  lecturas públicas de `routes/api.php` (`/espacios`, `/busqueda`, `/aulas`,
  `/edificios` y sus pisos, `/zonas`, los 4 `/catalogos/*`, `/roles`,
  `/materias` y `/docentes`):
  · solo `GET`/`HEAD` con respuesta 2xx JSON, TTL de **600 s** y clave por
    URL completa + usuario (`guest` sin token); cabecera `X-Cache:
    HIT/MISS/OFF` para depurar;
  · **se invalida sola** al escribir desde el panel: `InvalidarCacheRespuestas`
    (`cache.invalidar`, `Cache::flush()`) en el grupo `admin` — cualquier
    cambio se ve al instante en todas las máquinas, así que la web no tiene
    que pedir la lista sin caché en cada carga;
  · no se cachea nada por usuario (fichas, estado, favoritos, rutas, QR) y las
    respuestas con `Authorization` llevan la clave aparte;
  · `X-Cache-TTL: 0` queda como herramienta manual para pedir una respuesta
    fresca a mano (la web **no** envía esa cabecera);
  · alias `cache.res`/`cache.invalidar` en `bootstrap/app.php` y
    `CACHE_STORE=file` en `.env`; validado con `php -l` y con los archivos
    reales escritos en `storage/framework/cache/data/`.

### Cambiado

- **Login y registro contra el backend**: `auth.js` intenta primero
  `POST /api/auth/login` y `POST /api/auth/registro`; si el backend esta apagado
  o no conoce la cuenta, cae al modo local (localStorage) de siempre. El rol del
  backend (`administrador`/`personalAdministrativo`) se mapea a `admin` para
  conservar el acceso al panel.
- **Avisos y estadisticas usan los endpoints reales**: `/api/notificaciones` (HU-13)
  y `/api/eventos-consulta` (HU-14) en vez de rutas inexistentes; las llamadas
  solo se hacen si hay token y el espacio esta mapeado en el backend.
- **El ranking de estadisticas del admin sale de la base de datos**: el panel
  pinta primero el conteo local (respaldo, sirve con el backend apagado) y, con
  sesion del backend, lo sobreescribe con
  `GET /api/admin/estadisticas/espacios-mas-consultados` (`ranking` +
  `totalEventosRegistrados`). Asi las consultas de **todas** las maquinas se ven
  en el panel y la web nunca muestra cifras distintas a las de Supabase.
  (`admin.js` pasa de `?v=7` a `?v=8`).
- `UniMap.config.activa` pasa a `true` en `store.js` (con el backend apagado la
  web sigue funcionando igual con localStorage).
- Versiones `?v=` de `store`, `i18n`, `auth`, `admin`, `avisos` y `estadisticas`
  subidas en `index.html`, `mapa.html` y `admin.html` para invalidar la cache.
- **Arranque de la web más rápido y más tolerante ante un backend tardío**:
  · `config/database.php`: conexión PDO **persistente** al pooler de Supabase
    (`PDO::ATTR_PERSISTENT => true` en `pgsql`) — reutiliza el socket entre
    peticiones en vez de repetir el handshake TLS/SCRAM completo en cada una;
  · `api.js`: timeout de **20 s** por petición (`TIMEOUT_PETICION`, corta con
    `AbortController` en vez de dejar la página colgada) y reintentos con
    espera creciente (`conReintentos`: 0,7 s → 4 s, hasta 5 repeticiones) para
    las cargas del mapa; los `GET` públicos de `/catalogos/*`, `/edificios`
    (+ `/pisos`), `/espacios` y `/docentes` van **sin `Authorization`**
    (`GETS_SIN_TOKEN`): la respuesta no depende del usuario y así se evita el
    preflight `OPTIONS`, que en `artisan serve` (un solo hilo) arrancaba
    Laravel entero — mitad de peticiones y caché compartida entre sesiones;
  · `app.js`: mientras el backend no conteste reintenta hasta 30 veces cada
    10 s (~5 min) con el aviso nuevo `mapa.conectando` (azul); si sigue sin
    responder pasa a `mapa.sinBackend` (naranja). Al contestar se pinta el
    plano y se quita el aviso solo, sin recargar la página a mano;
  · `i18n.js`: claves `mapa.conectando` (nueva) y `mapa.sinBackend` (es/en);
  · `api.js?v=9` en `index.html`, `frontend/mapa.html` y `frontend/admin.html`.

### Corregido

- **La web salia con el aviso amarillo «Sin backend» y el plano vacio aunque
  el backend respondia 200**: `GET /api/espacios` es una resource collection
  de Laravel y viene envuelta en `{"data":[...]}`, pero
  `cargarEspaciosRemotos()` (`api.js`) exigia un array plano y devolvia
  `false`. Ese `false` dispara `mapa.sinBackend` **y** corta la cadena antes
  de `cargarDocentes()`, de ahi que tampoco aparecieran los 10 docentes. Ahora
  se acepta tanto el array plano como el envoltorio `data`. `api.js?v=5` →
  `?v=6` en `index.html`, `frontend/mapa.html` y `frontend/admin.html`.
- **`INICIAR-BACKEND.bat` cerraba la ventana al instante**: dos bloques
  `if ... ( ... )` llevaban un parentesis sin escapar dentro del texto de un
  `echo` (`... extensiones (pdo_pgsql, mbstring, curl).` y
  `... backend (carpeta backend\vendor).`), asi que `cmd` cerraba el bloque
  antes de tiempo y abortaba con «No se esperaba . en este momento» sin
  llegar nunca al `pause`. Los parentesis se quitaron de esos dos `echo`.
- **El liberador de puerto leia mal `findstr` (en ambos `.bat`)**:
  `findstr /r ":8000 .*LISTENING"` toma el espacio como separador de patrones
  alternativos, o sea `:8000` **o** `.*LISTENING`, y casaba los 91 puertos
  `LISTENING` del sistema: el arranque tardaba ~75 s, la ventana se inundaba
  de avisos y podia matar procesos `php` ajenos (p. ej. XAMPP). Ahora es
  `findstr /r /c:"..."` (un solo patron) en `INICIAR-BACKEND.bat` e
  `INICIAR.bat`.
- **Los buscadores no encontraban texto sin tildes**: buscar "maria" no
  encontraba a "María Elena" ni al "Secretaría Académica". Nuevo
  `util.normalizar()` (minusculas + sin tildes) en `store.js` y aplicado en
  los cuatro buscadores: panel de horarios (`horarios.js`), buscador del top
  bar (`busqueda.js`), panel de servicios (`servicios.js`) y listado del
  admin (`admin.js`). Versiones `store.js?v=10`, `busqueda/horarios/
  servicios.js?v=4` y `admin.js?v=9`.
- **Los modelos 3D desaparecian al cambiar de tema (claro/oscuro)**: el listener
  `tema:cambiado` recreaba la niebla con distancias fijas de 260/700 mientras la
  camara esta a unas 1400 unidades de la planta, asi que el modelo entero se
  fundia con el fondo y solo volvia a verse haciendo mucho zoom (efecto
  neblina). Ahora el cambio de tema solo actualiza el color de la niebla, que
  sigue gobernada por `encuadrar()` (2x y 6x la extension de la escena), y la
  niebla inicial arranca ya con esas distancias.
- `js/view3d/viewer3d.js` pasa de `?v=11` a `?v=12` en `mapa.html` para que los
  navegadores con cache arrastrado carguen el script corregido.

---

## [v1.1.0] - 2026-10-22

Entrega del equipo en la rama [`beta`](https://github.com/eelhuevo/MapaInteractivo/tree/beta):
las 16 tareas del proyecto (issues #36 a #51), cada una en su rama y con su Pull
Request. Todos los commits de la rama siguen la convencion del proyecto y la
verificacion automatica "Verificar" esta en verde.

### Anadido

- **Buscador sin acentos ni mayusculas**: "aula", "Aula" y "aula" devuelven lo
  mismo; los resultados se resaltan con `<mark>` y se recorren con `↑` y `↓`.
- **Ficha flotante accesible**: se anuncia con `role="tooltip"`, se marca con
  `aria-hidden` cuando esta cerrada y se cierra con `Escape`.
- **Correo normalizado** al iniciar sesion y registrarse: los espacios y las
  mayusculas ya no crean cuentas duplicadas.
- **Consultas al modelo de espacios**: `espacioPorId`, `espaciosPorTipo`,
  `resumenPorTipo` y `normalizarTexto` (`UniMap.datos`).
- **Modelos 3D modelados por el equipo**: edificio principal, edificio de oficinas,
  habitacion tipo, planta baja de la torre B (exportada a FBX) y torre antigua de
  los pisos con banos, todos con metadatos de procedencia (`unimap_modelo` y
  `unimap_tarea`).
- **Selector de modelos 3D**: la torre antigua de banos ya se puede elegir en el
  visor (antes el archivo estaba en el repositorio pero no aparecia en la lista).
- **Cargadores de Three.js** integrados en `vendor/three/`: glTF, FBX, curvas NURBS
  y `fflate` (funciona sin internet).
- **Sistema de diseno**: variables, reset, botones, animaciones, foco visible y
  soporte de "reducir el movimiento".
- **Puntos de corte** para tablet, celular, pantalla ancha, modo horizontal e
  impresion (`css/responsive.css`).
- **Estilos** de la barra superior, de los paneles laterales y de la ficha flotante.
- **Encabezado de autoria** en `css/map.css`.
- **Capturas reales** de la aplicacion en `docs/capturas/`, usadas en el `README.md`
  y en el `MANUAL-USUARIO.md`.

### Corregido

- **Las preferencias ya se guardan de verdad**: el piso, la vista (2D/3D) y los
  filtros estaban preparados en `js/core/store.js`, pero nunca se escribian en el
  navegador y al abrir el campus se volvia siempre a la Planta Baja. Ahora se
  guardan al cambiar de piso, al conmutar la vista y al aplicar o restablecer los
  filtros, y se restauran al entrar: el campus se abre como quedo la ultima vez y
  el panel de filtros muestra los valores recuperados.
- `ReferenceError: estado is not defined` en `js/core/store.js`: faltaba el atajo
  al estado global, que rompia el arranque del modulo.
- El FBX reexportado de la planta baja se habia perdido al exportarlo desde
  Blender: ahora se exporta con `use_custom_props=True` para conservar los
  metadatos.

### Eliminado

- `app.js` y `styles.css` de la raiz del repositorio: eran el monolitico del
  proyecto original y ningun HTML los cargaia (su codigo vive en `js/` y `css/`).
- `Carpetas.png`: la estructura completa esta escrita en `ESTRUCTURA.md`.

### Documentacion

- `README.md` reescrito: insignias, estado del proyecto, tabla del equipo con
  enlaces a sus issues y Pull Requests, capturas y flujo de trabajo.
- `MANUAL-USUARIO.md` ampliado con las funciones nuevas y las capturas.
- `ESTRUCTURA.md` con el arbol completo, archivo por archivo.
- `CONTRIBUTING.md` actualizado con el flujo real (ramas, revisiones, rama de
  entrega `beta` y tablero de tareas).

---

## [v1.0.0] - 2026-10-21

Primera entrega del mapa interactivo de campus con vista 2D en plano y visor 3D.

### Anadido

- **Autenticacion**: login, registro con validaciones y acceso como invitado.
- **Mapa 2D** de los cuatro pisos (PB, P1, P2, P3) con paneo, zoom, pellizca tactil
  y leyenda "Usted aqui".
- **Visor 3D** con Three.js r147 en local: carga de los cuatro modelos (GLB y FBX),
  normalizacion de escala, luces con sombras, niebla, controles orbitales con
  amortiguacion, rotacion automatica y restablecer camara.
- **Selector de modelos** con progreso de descarga y avisos de error.
- **Marcadores 3D** proyectados sobre el modelo, que respetan los filtros y el piso
  activo y abren la misma ficha que en 2D.
- **Conmutador 2D / 3D** en la barra superior.
- **Filtros** por los 8 tipos de espacio, por disponibilidad y por piso.
- **Buscador** de espacios, tipos, docentes y departamentos, con resultados navegables.
- **Horarios** de los docentes con buscador y salto al aula correspondiente.
- **Favoritos** por usuario, persistidos en `localStorage`.
- **Ficha flotante** del espacio, compartida entre las vistas 2D y 3D.
- **Manual de usuario** (`MANUAL-USUARIO.md`).
- **Guia de contribucion** (`CONTRIBUTING.md`) con la convencion de commits.
- **Plantillas** de Pull Request e issues en `.github/`.

### Cambiado

- El proyecto se organizo en carpetas: `css/`, `js/`, `models/` y `vendor/`.
- La planta se dibuja completa: pasillos, jardin, estacionamiento y sanitarios.
- La leyenda "Usted aqui" se oculta en la vista 3D.

---

[v1.1.0]: https://github.com/eelhuevo/MapaInteractivo/tree/beta
[v1.0.0]: https://github.com/eelhuevo/MapaInteractivo/releases/tag/v1.0.0
