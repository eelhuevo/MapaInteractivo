# UniMap — Campus Universitario

Mapa interactivo de campus con **dos torres integradas** (Torre Antigua y Torre Innovación, **17 pisos en total**), **plano 2D** (canvas) y **visor 3D campus** (Three.js, ambas torres en la misma escena), con autenticación, filtros, buscador, horarios y favoritos. Incluye el **frontend** (sin dependencias externas, funciona 100 % offline) y el **backend** (API REST en Laravel + Supabase/PostGIS).

---

## 📋 Tabla de Contenidos

1. [Equipo de Desarrollo](https://www.google.com/search?q=%23-equipo-de-desarrollo)
2. [Características Principales](https://www.google.com/search?q=%23-caracter%C3%ADsticas-principales)
3. [Estructura del Proyecto](https://www.google.com/search?q=%23-estructura-del-proyecto)
4. [Requisitos del Sistema](https://www.google.com/search?q=%23-requisitos-del-sistema)
5. [Instalación y Configuración](https://www.google.com/search?q=%23-instalaci%C3%B3n-y-configuraci%C3%B3n)
6. [Guía de Uso](https://www.google.com/search?q=%23-gu%C3%ADa-de-uso)
7. [Arquitectura y Decisiones Técnicas](https://www.google.com/search?q=%23-arquitectura-y-decisiones-t%C3%A9cnicas)
8. [Control de Calidad y Convenciones](https://www.google.com/search?q=%23-control-de-calidad-y-convenciones)
9. [Documentación Complementaria](https://www.google.com/search?q=%23-documentaci%C3%B3n-complementaria)

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
* **Modo Offline:** El frontend opera de manera autónoma sin requerir conexión a internet ni dependencias de CDNs externos.

---

## 📂 Estructura del Proyecto

```text
unimap/
├── index.html                  → Pantalla de acceso global (Login / Registro / Invitado)
├── INICIAR.bat                 → Script de automatización para despliegue local (Python 3)
├── README.md                   → Documentación técnica principal
│
├── frontend/                   → Código fuente del cliente (Vanilla JS + Módulos IIFE)
│   ├── mapa.html               → Interfaz principal (Mapa 2D + Visor 3D + Paneles)
│   ├── admin.html              → Panel de administración y gestión de recursos
│   │
│   ├── css/                    → Hojas de estilo modulares organizadas por componentes
│   │   ├── base.css            → Variables globales, reset, botones, animaciones y avisos
│   │   ├── auth.css            → Estilos de la pantalla de autenticación
│   │   ├── map.css             → Barra superior, buscador, pisos, lienzo y controles
│   │   ├── panels.css          → Paneles laterales de filtros, horarios y favoritos
│   │   ├── components.css      → Tooltips, resultados de búsqueda y tarjetas
│   │   ├── view3d.css          → Controles del visor 3D, marcadores y estados de carga
│   │   ├── admin.css           → Estilos específicos del panel de control
│   │   └── responsive.css      → Diseño adaptativo (Media Queries para móvil y tablet)
│   │
│   ├── js/                     → Lógica de la aplicación estructurada por dominios
│   │   ├── app.js              → Punto de entrada y orquestador del mapa
│   │   ├── core/               → Núcleo de estado global, UI, internacionalización y utilidades
│   │   ├── data/               → Repositorios estáticos (categorías, edificios, docentes, espacios)
│   │   ├── auth/               → Gestión de sesiones y credenciales
│   │   ├── admin/              → Controladores del panel de administración
│   │   ├── map/                → Lógica de interacción 2D, renderizado, rutas y servicios
│   │   └── view3d/             → Inicialización de Three.js y manipulación de la escena
│   │
│   ├── vendor/three/           → Biblioteca Three.js r147 en copia local estricta
│   └── models/                 → Activos 3D optimizados en formatos .glb y .fbx
│
├── backend/                    → API REST del sistema (Laravel + Supabase/PostGIS)
│   ├── app/                    → Controladores, modelos Eloquent, middleware y recursos
│   ├── database/               → Migraciones relacionales y seeders de datos iniciales
│   ├── routes/api.php          → Definición de endpoints de la API
│   ├── docs/                   → Backlog técnico y documentación del servidor
│   └── .env.example            → Plantilla de configuración de entorno
│
└── docs/                       → Recursos documentales de apoyo y guías operativas

```

---

## 💻 Requisitos del Sistema

### Frontend

* Navegador web moderno con soporte para **WebGL** (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).
* **Python 3.x** (únicamente requerido si se utiliza el script de arranque local para evitar bloqueos CORS en la carga de modelos 3D).

### Backend (Opcional para modo persistente)

* **PHP >= 8.4.1**
* Extensiones PHP requeridas: `pdo_pgsql`, `pgsql`, `fileinfo`, `zip`.
* **Composer** instalado globalmente.
* Instancia activa de **PostgreSQL con extensión PostGIS** (configurada mediante Supabase).

---

## ⚙️ Instalación y Configuración

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

Puedes utilizar las siguientes credenciales preconfiguradas para explorar el sistema con privilegios administrativos:

| Correo Electrónico | Contraseña | Rol Asignado |
| --- | --- | --- |
| `admin@uni.edu` | `123456` | Administrador |

*También tienes la opción de registrar un nuevo usuario directamente desde la interfaz o ingresar con el rol de **Invitado** (con permisos de lectura restringidos).*

### 3. Configuración del Backend (API REST)

Si deseas conectar la interfaz con el backend de Laravel y la base de datos geoespacial:

```bash
cd backend
cp .env.example .env
# Configura tus variables de conexión a Supabase/PostgreSQL en el archivo .env generado
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve

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