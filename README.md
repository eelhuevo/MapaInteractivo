# UniMap — Campus Universitario

Mapa interactivo de campus con **dos torres integradas** (Torre Antigua y Torre Innovación, **17 pisos en total**), **plano 2D** (canvas) y **visor 3D campus** (Three.js, ambas torres en la misma escena), con autenticación, filtros, buscador, horarios y favoritos. Incluye el **frontend** (sin dependencias externas: no usa CDNs) y el **backend** (API REST en Laravel + Supabase/PostGIS), que es la **única fuente de datos visible** en todas las máquinas.

---

## 📋 Tabla de Contenidos

1. [Equipo de Desarrollo](#equipo-de-desarrollo)
2. [Características Principales](#características-principales)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Requisitos del Sistema](#requisitos-del-sistema)
5. [Instalación y Configuración](#instalación-y-configuración)
6. [Guía de Uso](#guía-de-uso)
7. [Arquitectura y Decisiones Técnicas](#arquitectura-y-decisiones-técnicas)
8. [Control de Calidad y Convenciones](#control-de-calidad-y-convenciones)
9. [Documentación Complementaria](#documentación-complementaria)

---

## 👥 Equipo de Desarrollo

El proyecto fue desarrollado colaborativamente por el siguiente equipo:

| Integrante | Rol en el Proyecto |
| --- | --- |
| **Marco (eelhuevo)** | Product Manager & Backend Developer |
| **Moisés (moisesAlejandro78)** | Frontend Developer & 3D Specialist |
| **Jhoselin (Jhoselinconde537-lang)** | Frontend Developer |
| **José (ItsMegabo11)** | QA & Software Tester |
| **Paul (Oslo144)**| UI/UX Designer & Frontend Developer |

---

## 🚀 Características Principales

* **Sistema Multitorre (17 pisos):** Integración completa de la *Torre Antigua* (Planta Baja a Piso 7) y la *Torre Innovación* (Planta Baja a Piso 8), con un conmutador interactivo de torres y un selector de niveles dinámico.
* **Experiencia Dual (2D / 3D):**
* **Plano 2D:** Renderizado en HTML5 Canvas con soporte para paneo fluido, zoom táctil/rueda, capas e interactividad por espacio.
* **Visor 3D:** Escena unificada en Three.js con soporte para modelos `.glb` y `.fbx`, posicionamiento automático de marcadores por altura de piso y selector de modelos individuales.


* **Buscador Inteligente y Filtros Avanzados:** Búsqueda en tiempo real por nombre de espacio, tipo, docente o departamento asignado, complementada con filtros por categoría y disponibilidad.
* **Gestión de Horarios y Favoritos:** Consulta de horarios académicos vinculada directamente con la ubicación en el mapa y almacenamiento local de espacios favoritos por usuario.
* **Autenticación Completa:** Sistema de acceso con roles (Administrador / Invitado / Usuario registrado), validaciones de contraseña seguras y persistencia de sesión.
* **Sin servicios externos:** No usa CDNs ni APIs de terceros: la página y la API corren en local (`localhost`); solo la base de datos vive en la nube (Supabase), compartida por todas las máquinas.

---

## 📂 Estructura del Proyecto

```text
MapaInteractivo/
├── index.html                  → Pantalla de acceso global (Login / Registro / Invitado)
├── INSTALAR.bat                → Instalación automática en PC nueva (solo 1a vez)
├── INICIAR.bat                 → Script de automatización para despliegue local (Python 3)
├── INICIAR-BACKEND.bat         → Arranca la API Laravel (puerto 8000) para sincronizar
├── README.md                   → Documentación técnica principal
│
├── frontend/                   → Código fuente del cliente (Vanilla JS + IIFE, sin build)
│   ├── mapa.html               → Interfaz principal (Mapa 2D + Visor 3D + Paneles)
│   ├── admin.html              → Panel de administración y gestión de recursos
│   │
│   ├── css/                    → Hojas de estilo modulares por capítulo
│   │   ├── base.css            → Variables globales, reset, botones, animaciones, avisos
│   │   ├── auth.css            → Estilos de autenticación
│   │   ├── map.css             → Barra superior, buscador, pisos, lienzo, leyenda
│   │   ├── panels.css          → Paneles de filtros, horarios y favoritos
│   │   ├── components.css      → Tooltips, resultados de búsqueda, tarjetas
│   │   ├── view3d.css          → Visor 3D, marcadores, selector de modelos, carga
│   │   ├── admin.css           → Estilos del panel de control
│   │   ├── hus.css             → Estilos adicionales (HU)
│   │   └── responsive.css      → Media queries (móvil, tablet, pantalla ancha, impresión)
│   │
│   ├── js/                     → Lógica estructurada bajo window.UniMap
│   │   ├── app.js              → Punto de entrada y orquestador del mapa
│   │   ├── modelos.js          → Modelos de datos del frontend
│   │   │
│   │   ├── core/               → Núcleo: estado, API, i18n, UI, avisos, estadísticas, personalización
│   │   │   ├── store.js        → Estado global, persistencia, utilidades (normalizar, escapar)
│   │   │   ├── api.js          → Puente REST con el backend Laravel (endpoints /api/*)
│   │   │   ├── i18n.js         → Internacionalización (es/en)
│   │   │   ├── ui.js           → Pantalla, conmutador 2D/3D, navegación a espacios
│   │   │   ├── avisos.js       → Panel de notificaciones
│   │   │   ├── estadisticas.js → Estadísticas de uso del mapa
│   │   │   └── personalizacion.js → Personalización de la interfaz
│   │   │
│   │   ├── data/               → Repositorios estáticos (vacíos a propósito: los datos vienen del backend)
│   │   │   ├── categorias.js   → vacío (tipos vienen de GET /api/catalogos/tipos-espacio)
│   │   │   ├── docentes.js     → vacío (viene de GET /api/docentes)
│   │   │   ├── edificios.js    → estructura física del plano (no es dato falso)
│   │   │   └── espacios.js     → vacío (viene de GET /api/espacios)
│   │   │
│   │   ├── auth/               → Gestión de sesiones y credenciales
│   │   │   └── auth.js         → Login, registro, invitado, sesión
│   │   │
│   │   ├── admin/              → Panel de administración
│   │   │   └── admin.js        → Motor CRUD genérico (7 pestañas, carga perezosa)
│   │   │
│   │   ├── map/                → Lógica 2D, renderizado, rutas y servicios
│   │   │   ├── map2d.js        → Lienzo 2D: dibujo, paneo, zoom, hover, pisos
│   │   │   ├── tooltip.js      → Ficha flotante del espacio (2D y 3D)
│   │   │   ├── filtros.js      → Filtros (tipos, disponibilidad, piso)
│   │   │   ├── busqueda.js     → Buscador de espacios y docentes
│   │   │   ├── horarios.js     → Panel de horarios de docentes
│   │   │   ├── favoritos.js    → Favoritos por usuario (localStorage)
│   │   │   ├── qr.js           → Códigos QR
│   │   │   ├── ruta.js         → Rutas peatonales
│   │   │   ├── servicios.js    → Panel de servicios por piso
│   │   │   └── sugerencias.js  → Sugerencias según carrera/semestre
│   │   │
│   │   └── view3d/             → Visor Three.js
│   │       └── viewer3d.js     → Escena Three.js, modelos, luces, marcadores 3D
│   │
│   ├── vendor/                 → Librerías sin dependencias externas (funciona offline)
│   │   ├── three/              → Three.js r147 en local
│   │   │   ├── three.min.js
│   │   │   ├── GLTFLoader.js
│   │   │   ├── FBXLoader.js
│   │   │   ├── OrbitControls.js
│   │   │   ├── NURBSCurve.js
│   │   │   ├── NURBSUtils.js
│   │   │   └── fflate.min.js
│   │   └── fonts/              → Fuentes para los modelos 3D
│   │
│   └── models/                 → Activos 3D (.glb y .fbx) exportados de Blender
│       ├── edificio.glb
│       ├── oficinas.glb
│       ├── planta-baja-torre-b.fbx
│       ├── torre-antigua-banos.glb
│       ├── torre-antigua-conexion.glb
│       ├── torre-antigua-cursos.glb
│       ├── torre-innovacion-pisos-6-10.glb
│       ├── torre-innovacion-plantilla.glb
│       └── (y variantes con mayúsculas: TorreAntiguaBanos.glb, etc.)
│
├── backend/                    → API REST (Laravel 13 + Sanctum + Supabase/PostgreSQL 17)
│   ├── app/                    → Controladores, modelos Eloquent, middleware, recursos
│   ├── database/               → Migraciones relacionales y seeders
│   ├── routes/                 → Definición de endpoints de la API
│   ├── docs/                   → Documentación del backend (README-backend.md, backlog)
│   ├── bootstrap/              → Bootstrap de Laravel
│   ├── config/                 → Configuración (cors, cache, database, etc.)
│   ├── public/                 → Punto de entrada público
│   ├── resources/              → Vistas y recursos
│   ├── routes/                 → routes/api.php (definición de endpoints)
│   ├── storage/                → Almacenamiento (caché, logs)
│   ├── tests/                  → Pruebas (ExampleTest, verificar_hu.php)
│   ├── vendor/                 → Dependencias de Composer
│   ├── .env                    → Configuración de entorno (Supabase pooler)
│   ├── .env.example            → Plantilla de configuración
│   ├── artisan                 → CLI de Laravel
│   ├── composer.json / composer.lock
│   ├── package.json
│   ├── phpunit.xml
│   ├── smoke_supabase.php
│   ├── verificar_hu.php
│   └── vite.config.js
│
├── docs/                       → Recursos documentales de apoyo
│   └── ramas.md                → Modelo de ramas del proyecto
│
└── .github/                    → Plantillas de issues, PRs y flujos de CI
    ├── ISSUE_TEMPLATE/
    ├── pull_request_template.md
    └── workflows/
        └── convencion-commits.yml
```

---

## 💻 Requisitos del Sistema

### Frontend

* Navegador web moderno con soporte para **WebGL** (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).
* **Python 3.x** (únicamente requerido si se utiliza el script de arranque local para evitar bloqueos CORS en la carga de modelos 3D).

### Backend (obligatorio: es la única fuente de datos del mapa)

* **PHP >= 8.3** (Laravel 13; `INSTALAR.bat` instala un PHP 8.4 portable
  si tu PC no tiene uno compatible, sin tocar XAMPP ni el PHP del sistema).
* Extensiones PHP requeridas: `pdo_pgsql`, `pgsql`, `fileinfo`, `zip`, `intl`, `mbstring`, `curl`, `openssl`.
* **Composer** (lo descarga `INSTALAR.bat` si no está instalado).
* Instancia activa de **PostgreSQL con extensión PostGIS** (configurada mediante Supabase).

> La página **no tiene datos de relleno**: todos los espacios del mapa
> vienen del backend. Con el backend apagado el mapa sale vacío y con un
> aviso en pantalla.

---

## ⚙️ Instalación y Configuración

### 0. PC nueva (primera vez)

En una computadora que nunca ha tenido el proyecto, un solo doble clic en
**`INSTALAR.bat`** prepara todo: descarga PHP 8.4 portable y Composer (sin
tocar XAMPP ni el PHP del sistema), instala las dependencias del backend,
genera la clave, conecta con Supabase, aplica migraciones y siembra los
datos de ejemplo (pisos, espacios y el usuario administrador). Requiere
internet la primera vez.

Después, el uso diario en cualquier PC son dos dobles clics:

1. **`INICIAR-BACKEND.bat`** → la API en `http://localhost:8000`
2. **`INICIAR.bat`** → la página en `http://localhost:8080`

Comprueba que el backend responde abriendo en el navegador
`http://localhost:8000/api/edificios` (debe salir un JSON con los 4
edificios). Entrar a la raíz `http://localhost:8000/api` muestra
**error 404: es normal**, ahí no hay ruta.

La base de datos vive en Supabase (nube): no hay que instalarla ni
abrirla, y todas las PC comparten la misma. Para ver los datos sembrados:
Dashboard de Supabase → **Table Editor** → tabla `espacios` (también
`usuarios`, `pisos`, `aulas`...).

### 1. Ejecución del Frontend (Entorno de Desarrollo)

Para evitar restricciones de seguridad CORS del navegador al cargar los modelos 3D locales (`.glb` / `.fbx`), se debe servir el proyecto a través de un servidor HTTP local:

* **Opción automática (Windows):**
Haz doble clic en el archivo **`INICIAR.bat`** en la raíz del proyecto. Esto levantará un servidor Python en el puerto `8080`.
* **Opción manual (Terminal / CLI):**
```bash
python -m http.server 8080

```


Una vez iniciado, abre en tu navegador: `http://localhost:8080`

### 2. Credenciales de Acceso por Defecto

Con el backend corriendo, entra con las cuentas que siembra el backend en
Supabase (también las imprime `CONFIGURAR.bat` al terminar):

| Correo Electrónico | Contraseña | Rol Asignado |
| --- | --- | --- |
| `admin@univalle.edu.bo` | `Admin12345` | Administrador |
| `gestion@univalle.edu.bo` | `Gestion12345` | Personal administrativo |
| `docente@univalle.edu.bo` | `Docente12345` | Docente |
| `estudiante@univalle.edu.bo` | `Estudiante12345` | Estudiante |

*También tienes la opción de registrar un nuevo usuario directamente desde la interfaz o ingresar con el rol de **Invitado** (con permisos de lectura restringidos).*

### 3. Cómo abrir el backend a mano (estilo XAMPP)

Si prefieres no usar los `.bat`, el procedimiento manual es siempre el
mismo. **Solo hay que iniciar el backend; la página y la base de datos
no se "abren" a mano** (la BD está en Supabase):

1. **Solo la primera vez en cada PC** (prepara PHP, Composer, `.env`,
   migraciones y datos):

   ```bash
   INSTALAR.bat
   ```

2. **A diario**, abre una terminal en la raíz del proyecto (en VS Code:
   *Terminal → New Terminal*) y levanta el backend:

   ```bash
   cd backend
   php artisan serve        # API en http://localhost:8000
   ```

3. En otra terminal (o con doble clic a `INICIAR.bat`) levanta la página:

   ```bash
   python -m http.server 8080   # página en http://localhost:8080
   ```

4. **Comprueba** que el backend responde: abre
   <http://localhost:8000/api/edificios> → debe salir JSON con los 4
   edificios.

   * `http://localhost:8000/api` (raíz) da **error 404: es normal**.
   * Si `php artisan serve` se queja de la versión de PHP, el `php` del
     PATH es viejo (p. ej. el de XAMPP): ejecuta `INSTALAR.bat` una vez
     y quedará un PHP portable sin tocar XAMPP.
   * Si el backend está apagado, el mapa sale **vacío con aviso** (no
     usa datos de relleno).

Los datos se ven en Supabase: **Table Editor** → tabla `espacios`.

### 4. Instalación manual del backend (alternativa a INSTALAR.bat)

Si no puedes usar `INSTALAR.bat`, el equivalente paso a paso es:

```bash
cd backend
cp .env.example .env     # y completa DB_HOST/DB_PORT/DB_USERNAME/DB_DATABASE/DB_PASSWORD (pooler IPv4 de Supabase)
composer install
php artisan key:generate
php artisan migrate       # aplica migraciones (incluye las de nombres de usuario)
php artisan db:seed      # siembra pisos, espacios y usuarios (imprime los conteos con CONFIGURAR.bat)
php artisan serve        # API en http://localhost:8000
```

---

## 📖 Guía de Uso

1. **Autenticación:** Al abrir la aplicación, selecciona tu modalidad de ingreso (Iniciar sesión, Registrarse o Entrar como invitado).
2. **Navegación en el Mapa 2D:**
* Arrastra el lienzo con el ratón o un gesto táctil para desplazarte.
* Utiliza la rueda del ratón o los botones de control para hacer zoom.
* Selecciona una torre y un nivel específico desde el selector lateral superior.
* Haz clic sobre cualquier espacio del plano para desplegar su ficha técnica detallada.


3. **Exploración 3D:** Cambia a la vista tridimensional mediante el conmutador de vistas para inspeccionar la volumetría de las torres de manera unificada.
4. **Búsqueda y Filtros:** Emplea la barra de búsqueda superior para encontrar aulas, laboratorios o personal docente de forma instantánea. Utiliza el panel de filtros para categorizar los espacios según su funcionalidad.

---

## 🛠️ Arquitectura y Decisiones Técnicas

* **Patrón Modular IIFE:** El frontend está estructurado mediante Funciones Ejecutadas Inmediatamente (IIFE) que exponen un espacio de nombres global seguro (`window.UniMap`), evitando la contaminación del ámbito global sin la necesidad de empaquetadores complejos (Bundlers).
* **Three.js sin Dependencias Externas:** Se emplea la versión **r147** de Three.js alojada localmente en `frontend/vendor/three/`, garantizando estabilidad a largo plazo, independencia de redes externas y funcionamiento 100% offline.
* **Diseño Adaptativo (Responsive Design):** Uso intensivo de Flexbox, CSS Grid y variables nativas para garantizar una experiencia de usuario fluida tanto en equipos de escritorio como en tabletas y dispositivos móviles.
* **Modelo Geoespacial:** Preparado para integrarse con esquemas de bases de datos geográficas mediante PostGIS, permitiendo consultas espaciales avanzadas en futuras iteraciones del backend.

---

## 🔒 Control de Calidad y Convenciones

El repositorio aplica estrictas políticas de control de calidad de código:

* **Convención de Commits:** Se utiliza el estándar de *Conventional Commits* (`tipo(ámbito): descripción`), verificado automáticamente mediante flujos de trabajo (*GitHub Actions*).
* **Protección de Ramas:** La rama principal (`main`) se encuentra protegida; todo código nuevo debe integrarse obligatoriamente a través de Pull Requests desde ramas de desarrollo (*feature branches*), requiriendo validación previa y revisiones de pares.

---

## 📚 Documentación Complementaria

Para profundizar en aspectos específicos del proyecto, consulta los siguientes manuales integrados en el repositorio:

* [`MANUAL-USUARIO.md`](https://www.google.com/search?q=MANUAL-USUARIO.md) — Guía detallada orientada al usuario final sobre el uso de la plataforma.
* [`CONTRIBUTING.md`](CONTRIBUTING.md) — Lineamientos obligatorios para la colaboración, flujos de trabajo y políticas de ramas.
* [`ESTRUCTURA.md`](https://www.google.com/search?q=ESTRUCTURA.md) — Descripción pormenorizada de los componentes de software.
* [`CHANGELOG.md`](CHANGELOG.md) — Registro histórico de cambios y versiones del sistema.