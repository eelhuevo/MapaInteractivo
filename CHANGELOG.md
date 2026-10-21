# Changelog

Todas las versiones del proyecto **UniMap — Mapa Interactivo de Campus**.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las
versiones usan [SemVer](https://semver.org/lang/es/) (`MAJOR.MINOR.PATCH`).

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

[v1.0.0]: https://github.com/eelhuevo/MapaInteractivo/releases/tag/v1.0.0
