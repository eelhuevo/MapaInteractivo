# Changelog

Todas las versiones del proyecto **UniMap — Mapa Interactivo de Campus**.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las
versiones usan [SemVer](https://semver.org/lang/es/) (`MAJOR.MINOR.PATCH`).

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
  habitacion tipo y planta baja de la torre B (exportada a FBX), todos con
  metadatos de procedencia (`unimap_modelo` y `unimap_tarea`).
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
