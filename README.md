# UniMap — Campus Universitario

![Verificar](https://github.com/eelhuevo/MapaInteractivo/actions/workflows/concion-commits.yml/badge.svg?branch=beta)
![Release](https://img.shields.io/github/v/release/eelhuevo/MapaInteractivo?label=release)
![Rama de entrega](https://img.shields.io/badge/rama%20de%20entrega-beta-1a56db)
![Integrantes](https://img.shields.io/badge/integrantes-5-8250df)
![Commits](https://img.shields.io/github/commit-activity/eelhuevo/MapaInteractivo)
![Issues abiertas](https://img.shields.io/github/issues/eelhuevo/MapaInteractivo?label=issues)
![Pull Requests abiertas](https://img.shields.io/github/issues-pr/eelhuevo/MapaInteractivo?label=pull%20requests)

Mapa interactivo de campus con **vista 2D en plano** y **visor 3D** de los modelos
de la carpeta `models/`, con autenticación, filtros, buscador, horarios y favoritos.

| | |
|---|---|
| **Abrir la aplicación** | Doble clic en `INICIAR.bat` → <http://localhost:8080> |
| **Manual de usuario** | [`MANUAL-USUARIO.md`](MANUAL-USUARIO.md) |
| **Guía de contribución** | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| **Estructura del proyecto** | [`ESTRUCTURA.md`](ESTRUCTURA.md) |
| **Historial de versiones** | [`CHANGELOG.md`](CHANGELOG.md) |
| **Tablero de tareas** | <https://github.com/users/eelhuevo/projects/1> |
| **Release** | [`v1.0.0`](https://github.com/eelhuevo/MapaInteractivo/releases/tag/v1.0.0) |

---

## Estado del proyecto

| Qué | Dónde |
|---|---|
| Rama de **entrega v1.0** (todo el trabajo integrado) | [`beta`](https://github.com/eelhuevo/MapaInteractivo/tree/beta) |
| Rama principal **protegida** (línea base + revisiones del equipo) | [`main`](https://github.com/eelhuevo/MapaInteractivo/tree/main) |
| Tareas registradas | [Issues #36–#51](https://github.com/eelhuevo/MapaInteractivo/issues?q=is%3Aissue) |
| Entregas del equipo | [Pull Requests #52–#75](https://github.com/eelhuevo/MapaInteractivo/pulls?q=is%3Apr) |
| Verificación automática de commits | [`.github/workflows/concion-commits.yml`](.github/workflows/concion-commits.yml) → *Verificar* |
| Plantillas de issues y PRs | [`.github/`](.github) |
| Discusiones del equipo | <https://github.com/eelhuevo/MapaInteractivo/discussions> |

La rama `beta` es la **entrega**: contiene los 16 trabajos del equipo más las
correcciones, con un **100 % de commits que siguen la convención** del proyecto
(`tipo(ámbito): descripción`). Cada entrega se hizo en su **rama propia** y se
abrió como **Pull Request**, como se explica en [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## El equipo

Cada integrante del proyecto, con su perfil, sus issues y sus entregas. Los
enlaces a "commits" muestran directamente el trabajo de cada persona en la rama
de entrega.

| Integrante | Perfil | Área del proyecto | Commits | Issues | Pull Requests |
|---|---|---|---|---|---|
| **eelhuevo** | [@eelhuevo](https://github.com/eelhuevo) | Modelo de datos, estado global, autenticación, documentación | [commits](https://github.com/eelhuevo/MapaInteractivo/commits/beta?author=eelhuevo) | [#36](https://github.com/eelhuevo/MapaInteractivo/issues/36) [#37](https://github.com/eelhuevo/MapaInteractivo/issues/37) [#38](https://github.com/eelhuevo/MapaInteractivo/issues/38) [#51](https://github.com/eelhuevo/MapaInteractivo/issues/51) | [#53](https://github.com/eelhuevo/MapaInteractivo/pull/53) [#57](https://github.com/eelhuevo/MapaInteractivo/pull/57) [#58](https://github.com/eelhuevo/MapaInteractivo/pull/58) [#59](https://github.com/eelhuevo/MapaInteractivo/pull/59) [#60](https://github.com/eelhuevo/MapaInteractivo/pull/60) [#61](https://github.com/eelhuevo/MapaInteractivo/pull/61) [#62](https://github.com/eelhuevo/MapaInteractivo/pull/62) [#63](https://github.com/eelhuevo/MapaInteractivo/pull/63) [#64](https://github.com/eelhuevo/MapaInteractivo/pull/64) [#65](https://github.com/eelhuevo/MapaInteractivo/pull/65) [#66](https://github.com/eelhuevo/MapaInteractivo/pull/66) [#67](https://github.com/eelhuevo/MapaInteractivo/pull/67) [#68](https://github.com/eelhuevo/MapaInteractivo/pull/68) [#69](https://github.com/eelhuevo/MapaInteractivo/pull/69) [#70](https://github.com/eelhuevo/MapaInteractivo/pull/70) [#71](https://github.com/eelhuevo/MapaInteractivo/pull/71) |
| **moisesAlejandro78** | [@moisesAlejandro78](https://github.com/moisesAlejandro78) | Modelado 3D en Blender (edificio principal, oficinas, torre antigua) | [commits](https://github.com/eelhuevo/MapaInteractivo/commits/beta?author=moisesAlejandro78) | [#39](https://github.com/eelhuevo/MapaInteractivo/issues/39) [#40](https://github.com/eelhuevo/MapaInteractivo/issues/40) [#41](https://github.com/eelhuevo/MapaInteractivo/issues/41) | [#72](https://github.com/eelhuevo/MapaInteractivo/pull/72) [#73](https://github.com/eelhuevo/MapaInteractivo/pull/73) [#74](https://github.com/eelhuevo/MapaInteractivo/pull/74) [#75](https://github.com/eelhuevo/MapaInteractivo/pull/75) |
| **Jhoselinconde537-lang** | [@Jhoselinconde537-lang](https://github.com/Jhoselinconde537-lang) | Cargadores de Three.js (glTF y FBX) y modelo FBX de la torre B | [commits](https://github.com/eelhuevo/MapaInteractivo/commits/beta?author=Jhoselinconde537-lang) | [#42](https://github.com/eelhuevo/MapaInteractivo/issues/42) [#43](https://github.com/eelhuevo/MapaInteractivo/issues/43) [#44](https://github.com/eelhuevo/MapaInteractivo/issues/44) | [#64](https://github.com/eelhuevo/MapaInteractivo/pull/64) [#65](https://github.com/eelhuevo/MapaInteractivo/pull/65) [#66](https://github.com/eelhuevo/MapaInteractivo/pull/66) |
| **Oslo144** | [@Oslo144](https://github.com/Oslo144) | Interfaz: barra superior, paneles laterales y ficha flotante del espacio | [commits](https://github.com/eelhuevo/MapaInteractivo/commits/beta?author=Oslo144) | [#45](https://github.com/eelhuevo/MapaInteractivo/issues/45) [#46](https://github.com/eelhuevo/MapaInteractivo/issues/46) [#47](https://github.com/eelhuevo/MapaInteractivo/issues/47) | [#54](https://github.com/eelhuevo/MapaInteractivo/pull/54) [#55](https://github.com/eelhuevo/MapaInteractivo/pull/55) [#56](https://github.com/eelhuevo/MapaInteractivo/pull/56) [#57](https://github.com/eelhuevo/MapaInteractivo/pull/57) [#67](https://github.com/eelhuevo/MapaInteractivo/pull/67) [#68](https://github.com/eelhuevo/MapaInteractivo/pull/68) |
| **ItsMegabo11** | [@ItsMegabo11](https://github.com/ItsMegabo11) | Sistema de diseño, buscador de espacios y adaptación a móvil y tablet | [commits](https://github.com/eelhuevo/MapaInteractivo/commits/beta?author=ItsMegabo11) | [#48](https://github.com/eelhuevo/MapaInteractivo/issues/48) [#49](https://github.com/eelhuevo/MapaInteractivo/issues/49) [#50](https://github.com/eelhuevo/MapaInteractivo/issues/50) | [#69](https://github.com/eelhuevo/MapaInteractivo/pull/69) [#70](https://github.com/eelhuevo/MapaInteractivo/pull/70) [#71](https://github.com/eelhuevo/MapaInteractivo/pull/71) |

> La participación individual también se refleja en las **revisiones**: cada Pull
> Request necesita una aprobación de otro miembro del equipo antes de integrarse
> (`main` está protegida y exige 1 revisión aprobatoria + la verificación
> automática *Verificar*).

---

## Capturas

| Vista 2D | Buscador | Ficha del espacio | Vista 3D |
|---|---|---|---|
| ![Vista 2D del campus](docs/capturas/02-mapa-2d.png) | ![Buscador con resultados resaltados](docs/capturas/03-buscador.png) | ![Ficha flotante de un espacio](docs/capturas/04-ficha-espacio.png) | ![Visor 3D del modelo del edificio](docs/capturas/07-vista-3d.png) |

| Panel de filtros | Horarios de docentes | Pantalla de acceso |
|---|---|---|
| ![Panel de filtros](docs/capturas/05-filtros.png) | ![Panel de horarios](docs/capturas/06-horarios.png) | ![Pantalla de acceso](docs/capturas/01-acceso.png) |

---

## Cómo abrir el proyecto

### Opción recomendada (necesaria para la vista 3D)

Doble clic en **`INICIAR.bat`** → abre `http://localhost:8080` en el navegador.

> La vista 3D descarga los archivos `.glb` / `.fbx` por HTTP. Si abres `index.html`
> directamente con doble clic (`file://`), el navegador bloquea esa descarga por
> política CORS y el visor mostrará un aviso. El mapa 2D, filtros, buscador,
> horarios y favoritos sí funcionan igualmente.

### Opción sin instalar nada

Si tienes **Python 3** instalado, también puedes servir la carpeta con:

```bash
python -m http.server 8080
```

### Cuenta de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@uni.edu` | `123456` | Administrador |

También puedes registrarte desde la propia pantalla o entrar como **Invitado**.

---

## Documentación

| Documento | Para qué sirve |
|---|---|
| [`MANUAL-USUARIO.md`](MANUAL-USUARIO.md) | **Manual de usuario**: cómo entrar, usar el mapa 2D y 3D, filtros, búsqueda, horarios y favoritos |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | **Guía de contribución**: flujo de trabajo, convención de commits, Pull Requests y versiones |
| [`ESTRUCTURA.md`](ESTRUCTURA.md) | **Estructura del proyecto**: qué hay en cada carpeta y para qué sirve |
| [`CHANGELOG.md`](CHANGELOG.md) | **Historial de versiones** del proyecto |
| `README.md` (este) | Documentación técnica: estructura, cómo ejecutar, qué se conservó del proyecto original |
| Plantillas en `.github/` | Formulario para Pull Requests e issues |

---

## Estructura

```
unimap/
├── index.html              → pantalla de acceso (login / registro / invitado)
├── mapa.html               → mapa 2D + visor 3D + paneles
├── INICIAR.bat             → servidor local (requiere Python 3)
├── README.md
│
├── css/                    → estilos divididos por capítulo
│   ├── base.css            → variables, reset, botones, animaciones, avisos
│   ├── auth.css            → pantalla de autenticación
│   ├── map.css             → barra superior, buscador, pisos, lienzo, leyenda, zoom
│   ├── panels.css          → paneles de filtros, horarios y favoritos
│   ├── components.css      → tooltip, resultados de búsqueda, favoritos
│   ├── view3d.css          → visor 3D, marcadores, selector de modelos, carga
│   └── responsive.css      → ajustes a distintos tamaños de pantalla
│
├── js/
│   ├── app.js              → arranque de la pantalla del mapa
│   ├── core/
│   │   ├── store.js        → namespace global, estado, storage y utilidades
│   │   └── ui.js           → pantalla, conmutador 2D/3D, navegación a espacios
│   ├── data/
│   │   ├── categorias.js   → tipos de espacio
│   │   ├── edificios.js    → edificios + días de la semana
│   │   ├── docentes.js     → docentes y horarios
│   │   └── espacios.js     → construcción de los espacios de los 4 pisos
│   ├── auth/
│   │   └── auth.js         → login, registro, invitado y sesión (index + mapa)
│   ├── map/
│   │   ├── tooltip.js      → ficha del espacio (compartida 2D/3D)
│   │   ├── map2d.js        → lienzo 2D: dibujo, pan, zoom, hover, pisos
│   │   ├── filtros.js      → lógica de filtros (tipos, disponibilidad, piso)
│   │   ├── busqueda.js     → buscador de espacios y docentes
│   │   ├── horarios.js     → panel de horarios de docentes
│   │   └── favoritos.js    → favoritos por usuario
│   └── view3d/
│       └── viewer3d.js     → escena Three.js, modelos, luces, marcadores 3D
│
├── vendor/three/           → Three.js r147 en local (funciona sin internet)
│   ├── three.min.js
│   ├── GLTFLoader.js / FBXLoader.js / OrbitControls.js
│   ├── fflate.min.js / NURBSCurve.js / NURBSUtils.js
│
├── models/                 → modelos 3D del campus
│   ├── edificio.glb
│   ├── habitacion.glb
│   ├── oficinas.glb
│   └── PLANTA BAJA TOORE B.fbx
│
└── docs/
    └── capturas/           → imágenes del README y del manual de usuario
```

El detalle completo, archivo por archivo, está en [`ESTRUCTURA.md`](ESTRUCTURA.md).

---

## Qué se conservó del proyecto original

- **Autenticación**: login, registro con validaciones y contraseña, y acceso como invitado.
- **Filtros completos**: los 8 tipos de espacio, disponibilidad (activo/inactivo) y los
  4 pisos. Ninguno se eliminó, aunque algún tipo no tenga modelo 3D asignado.
- **Búsqueda** por nombre, tipo, docente o departamento, con resultados navegables.
- **Horarios** de los 8 docentes con buscador y salto al aula correspondiente.
- **Favoritos** por usuario (ocultos para invitados) con persistencia en `localStorage`.
- **Selector de pisos**, zoom, paneo, tooltip con ficha completa y notificaciones.

## Qué se añadió

- **Botón 2D / 3D** en la barra superior para conmutar entre el plano y el visor 3D.
- **Visor 3D** con Three.js local: carga de los 4 modelos (GLB y FBX), normalización
  de escala, luces con sombras, suelo, cuadricula, niebla y controles orbitales con
  amortiguación, rotación automática y restablecer cámara.
- **Selector de modelos** con progreso de descarga y avisos de error.
- **Marcadores 3D** proyectados sobre el modelo: muestran el estado, los favoritos y
  respetan los filtros y el piso activos; al pulsarlos se abre la misma ficha (tooltip)
  que en 2D. La búsqueda, los horarios y los favoritos enfocan la cámara en 3D.
- **Proyecto dividido**: 2 HTML, 7 CSS y 15 JS con un espacio de nombres común
  `window.UniMap`.

## Qué se completó

- **El filtro de piso surte efecto**: los pisos desmarcados desactivan su botón del
  selector, si el piso actual queda oculto se salta al primer piso permitido y
  intentar entrar a un espacio de un piso oculto (búsqueda, horarios o favoritos)
  muestra un aviso en lugar de navegar. Aplicar sin ningún piso se rechaza.
- **La planta se dibuja completa**: pasillos, jardín, estacionamiento y sanitarios
  forman parte del edificio y se pintan siempre (los datos y los colores ya existían);
  no son filtrables, no abren ficha y no aparecen en los marcadores 3D.
- **Mapa 2D táctil**: el paneo usa *pointer events* con captura y la pellizca de dos
  dedos hace zoom, de modo que el plano se maneja igual con ratón, dedo o lápiz
  (`touch-action: none` en el lienzo).
- **El arrastre ya no abre fichas**: soltar el mapa sobre un aula no la selecciona;
  solo un clic (o un toque) sin desplazamiento la abre.
- **Sesión recordada en la pantalla de acceso**: si ya hay sesión iniciada,
  `index.html` continúa directamente en el mapa.
- **Teclado**: `Escape` cierra la ficha, los paneles, los resultados de búsqueda y el
  selector de modelos; `Enter` en el buscador abre el primer resultado.
- **Leyenda según la vista**: "Usted aquí" se oculta en 3D (donde no existe ese
  marcador) gracias a la clase `leyenda-2d` que la hoja `view3d.css` ya esperaba.
- **Detalles de acabado**: la cuadrícula de pisos del panel de filtros se muestra en
  dos columnas, el tooltip se cierra al redimensionar la ventana y los botones de piso
  ocultos tienen su propio estado visual.
- **Buscador sin acentos**: "aula", "Aula" y "áula" devuelven lo mismo; los resultados
  se resaltan con `<mark>` y se recorren con `↑` / `↓`.
- **Ficha flotante accesible**: se anuncia con `role="tooltip"`, se oculta con
  `aria-hidden` y se cierra con `Escape`.
- **Preferencias recordadas**: el piso, la vista (2D/3D) y los filtros activos se
  guardan en el navegador y el campus se abre como quedó la última vez.
- **Correo normalizado**: `Ana.Perez@Campus.EDU` y `ana.perez@campus.edu` son la
  misma cuenta.
- **Diseño adaptable**: puntos de corte en 1600, 1024, 900, 768, 520 y 480 px, más
  el modo horizontal de móvil, la impresión y la preferencia de menos movimiento.
- **Modelos con metadatos**: cada `.glb` / `.fbx` lleva dentro el nombre del modelo y
  el número de tarea al que pertenece (`unimap_modelo` y `unimap_tarea`).

Todo el detalle de uso está en el [`MANUAL-USUARIO.md`](MANUAL-USUARIO.md).

---

## Cómo trabajamos

```
Issue asignado  →  Rama propia  →  Commit  →  Push  →  Pull Request  →  Revisión  →  Merge
```

1. Cada tarea tiene su **issue** (`#36`–`#51`) con responsable, etiquetas y
   criterio de aceptación.
2. Cada persona trabaja en una **rama propia** (`feature/...`).
3. Cada cambio es un **commit** con la convención
   `tipo(ámbito): descripción en minúsculas`.
4. La verificación automática **`Verificar`** rechaza los commits y los títulos de PR
   que no la siguen.
5. Otro miembro del equipo **revisa y aprueba** el Pull Request.
6. La rama `main` está **protegida**: solo entra código revisado.

El detalle está en [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Notas

- Los datos viven en `localStorage` (usuarios, sesión, favoritos y preferencias). No
  hay servidor backend: las contraseñas se guardan en texto plano, propio de un
  prototipo académico.
- Three.js está en la versión **r147**, la última que incluye builds globales no
  modulares, por eso todo el código funciona con `<script>` clásicos y sin servidor
  de desarrollo ni proceso de compilación.
- Las librerías de `vendor/three/` son copia local del código original de Three.js
  (licencia MIT); solo se añadieron las cabeceras de procedencia. No se modificó el
  código de la librería.
