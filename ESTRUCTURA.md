# MapaInteractivo — Estructura

Árbol completo del repositorio **UniMap — Campus Universitario**. Cada archivo
tiene una responsabilidad clara: el proyecto se lee de arriba abajo.

```
MapaInteractivo/
│
├── index.html                    → pantalla de acceso (login / registro / invitado)
├── mapa.html                     → mapa 2D + visor 3D + paneles laterales
├── INICIAR.bat                   → servidor local con Python 3 (doble clic)
├── README.md                     → presentación del proyecto, equipo y enlaces
├── MANUAL-USUARIO.md             → manual de usuario paso a paso
├── CONTRIBUTING.md               → guía de contribución del equipo
├── CHANGELOG.md                  → historial de versiones
├── ESTRUCTURA.md                 → este archivo
├── .gitattributes                → finales de línea (LF) para todos los archivos
│
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── config.yml            → configurador de las plantillas de issue
│   │   ├── informe_error.md      → plantilla para reportar un error
│   │   └── solicitud_mejora.md   → plantilla para proponer una mejora
│   ├── pull_request_template.md  → checklist obligatorio de cada Pull Request
│   └── workflows/
│       └── convencion-commits.yml → verificación automática "Verificar"
│
├── css/                          → estilos separados por capítulo
│   ├── base.css                  → variables, reset, botones, animaciones, avisos
│   ├── auth.css                  → pantalla de autenticación
│   ├── map.css                   → barra superior, buscador, pisos, lienzo, leyenda
│   ├── panels.css                → paneles de filtros, horarios y favoritos
│   ├── components.css            → tooltip, resultados de búsqueda, favoritos
│   ├── view3d.css                → visor 3D, marcadores, selector de modelos, carga
│   └── responsive.css            → puntos de corte, modo horizontal e impresión
│
├── js/                           → JavaScript con espacio de nombres window.UniMap
│   ├── app.js                    → arranque de la pantalla del mapa
│   ├── core/
│   │   ├── store.js              → estado global, persistencia y utilidades
│   │   └── ui.js                 → pantalla, conmutador 2D/3D, navegación a espacios
│   ├── data/
│   │   ├── categorias.js         → los 8 tipos de espacio y sus colores
│   │   ├── edificios.js          → edificios del campus y días de la semana
│   │   ├── docentes.js           → docentes y sus horarios
│   │   └── espacios.js           → construcción de los espacios de los 4 pisos
│   ├── auth/
│   │   └── auth.js               → login, registro, invitado y sesión
│   ├── map/
│   │   ├── tooltip.js            → ficha flotante del espacio (2D y 3D)
│   │   ├── map2d.js              → lienzo 2D: dibujo, paneo, zoom, hover, pisos
│   │   ├── filtros.js            → lógica de filtros (tipos, disponibilidad, piso)
│   │   ├── busqueda.js           → buscador de espacios y docentes
│   │   ├── horarios.js           → panel de horarios de docentes
│   │   └── favoritos.js          → favoritos por usuario
│   └── view3d/
│       └── viewer3d.js           → escena Three.js, modelos, luces, marcadores 3D
│
├── models/                       → modelos 3D del campus (exportados de Blender)
│   ├── edificio.glb              → edificio principal  (tarea #39)
│   ├── habitacion.glb            → habitación tipo      (tarea #41)
│   ├── oficinas.glb              → edificio de oficinas (tarea #40)
│   ├── TorreAntiguaBanos.glb     → torre antigua, baños (tarea #72)
│   └── PLANTA BAJA TOORE B.fbx   → planta baja torre B  (tarea #42)
│
├── vendor/
│   └── three/                    → Three.js r147 en local (funciona sin internet)
│       ├── three.min.js
│       ├── GLTFLoader.js         → cargador de modelos .glb
│       ├── FBXLoader.js          → cargador de modelos .fbx
│       ├── OrbitControls.js      → controles orbitales de la cámara
│       ├── NURBSCurve.js         → curvas NURBS (FBX)
│       ├── NURBSUtils.js         → utilidades NURBS (FBX)
│       └── fflate.min.js         → descompresor de los .glb
│
└── docs/
    └── capturas/                 → imágenes del README y del manual de usuario
        ├── 01-acceso.png
        ├── 02-mapa-2d.png
        ├── 03-buscador.png
        ├── 04-ficha-espacio.png
        ├── 05-filtros.png
        ├── 06-horarios.png
        └── 07-vista-3d.png
```

## Por qué está organizado así

| Decisión | Motivo |
|---|---|
| **Una carpeta por responsabilidad** (`core`, `data`, `auth`, `map`, `view3d`) | Se encuentra cualquier archivo mirando su carpeta, sin leer todo el proyecto. |
| **CSS por capítulo** (`base`, `auth`, `map`, `panels`, `components`, `view3d`, `responsive`) | Los estilos de una zona se editan sin tocar los de otra. |
| **Todo bajo `window.UniMap`** | Evita colisiones de variables globales entre archivos y permite depurar desde la consola del navegador. |
| **Modelos aparte del código** | Los `.glb` y `.fbx` son pesados; separarlos permite clonar el código rápido y reemplazar los modelos sin tocar la lógica. |
| **Three.js en `vendor/`** | La aplicación funciona sin conexión a internet y sin paso de compilación. |
| **Plantillas en `.github/`** | Cada issue y cada Pull Request se crean con el mismo formato, que es lo que revisa la rúbrica del proyecto. |

## Rutas y referencias

- Todos los `src` y `href` son **relativos** y usan `/`, para que funcione igual en
  Windows, Linux y macOS.
- Las carpetas que empiezan por `.` (`.github`) no se ven en el explorador de
  archivos de Windows si están ocultas: mostrarlas con *Archivo → Mostrar →
  Archivos ocultos* si hace falta editarlas.
