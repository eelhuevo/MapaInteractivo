# UniMap — Campus Universitario

Mapa interactivo de campus con **vista 2D en plano** y **visor 3D** de los modelos
de la carpeta `models/`, con autenticación, filtros, buscador, horarios y favoritos.

---

## Cómo abrir el proyecto

### Opción recomendada (necesaria para la vista 3D)

Doble clic en **`INICIAR.bat`** → abre `http://localhost:8080` en el navegador.

> La vista 3D descarga los archivos `.glb` / `.fbx` por HTTP. Si abres `index.html`
> directamente con doble clic (`file://`), el navegador bloquea esa descarga por
> política CORS y el visor mostrará un aviso. El mapa 2D, filtros, buscador,
> horarios y favoritos sí funcionan igualmente.

### Cuenta de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@uni.edu` | `123456` | Administrador |

También puedes registrarte desde la propia pantalla o entrar como **Invitado**.

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
└── models/                 → modelos 3D del campus
    ├── edificio.glb
    ├── habitacion.glb
    ├── oficinas.glb
    └── PLANTA BAJA TOORE B.fbx
```

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

---

## Notas

- Los datos viven en `localStorage` (usuarios y favoritos). No hay servidor backend:
  las contraseñas se guardan en texto plano, propio de un prototipo académico.
- Three.js está en la versión **r147**, la última que incluye builds globales no
  modulares, por eso todo el código funciona con `<script>` clásicos y sin servidor
  de desarrollo ni proceso de compilación.
