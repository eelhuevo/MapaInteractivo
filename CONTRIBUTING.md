# Cómo contribuir a UniMap (Mapa Interactivo)

Guía de trabajo del equipo. Si la lees, ya sabes qué hacer con tu tarea.

| Recurso | Enlace |
|---|---|
| Tablero de tareas | <https://github.com/users/eelhuevo/projects/1> |
| Issues del proyecto | <https://github.com/eelhuevo/MapaInteractivo/issues?q=is%3Aissue> |
| Pull Requests | <https://github.com/eelhuevo/MapaInteractivo/pulls?q=is%3Apr> |
| Rama de entrega `beta` | <https://github.com/eelhuevo/MapaInteractivo/tree/beta> |
| Verificación automática | [`.github/workflows/concion-commits.yml`](.github/workflows/concion-commits.yml) |

---

## 1. El flujo de trabajo completo

```
Issue asignado  →  Rama propia  →  Commit  →  Push  →  Pull Request  →  Revisión  →  Merge a main
```

1. **Te asignan un issue.** Tiene etiqueta, responsable, checklist y criterios de
   aceptación. Todo lo que haces debe servir para cerrarlo.
2. **Creas una rama** con el nombre de la tabla de tu tarea.
3. **Haces el commit** con un mensaje que siga la convención (sección 3).
4. **Subes la rama** (`git push -u origin <rama>`).
5. **Abres el Pull Request** hacia `main` y escribes `Closes #NN` en la descripción.
6. **Un compañero revisa** tu PR (aprobar, comentar o pedir cambios).
7. **Se fusiona** en `main` y el issue se cierra solo.

> `main` está **protegida**: no se puede subir nada directamente. Todo cambio entra
> por Pull Request. Eso es lo que hace profesional el repositorio.

### Las ramas del proyecto

| Rama | Para qué sirve |
|---|---|
| `main` | Línea base del proyecto. Está **protegida**: solo entra código revisado y verificado |
| `beta` | Rama de **entrega**: aquí se integra todo el trabajo del equipo para presentarlo |
| `Version2` | Segunda versión en curso (experimental) |
| `feature/...`, `fix/...`, `docs/...` | Ramas de trabajo: una por tarea |

---

## 2. Nombres de rama

Formato: `feature/descripcion-corta-en-kebab-case`

| Prefijo | Para qué | Ejemplo |
|---|---|---|
| `feature/` | Funcionalidad nueva | `feature/buscador-espacios-docentes` |
| `fix/` | Corrección de un error | `fix/zoom-invertido-movil` |
| `docs/` | Documentación | `docs/manual-de-usuario` |

Nunca trabajes directamente en `main`, en `beta` ni en `Version2`.

### Una rama por issue

Cada issue del proyecto tiene **una rama propia** con el nombre de la tabla del
punto 6 de `INSTRUCCIONES.md`. Ese es el orden de trabajo del equipo:

```
Issue asignado  →  Rama propia  →  Commit  →  Push  →  Pull Request  →  Revisión  →  Merge a main
```

Así cada cambio se puede revisar por separado y se sabe **quién** hizo **qué**.

### Qué pasa con las ramas después

El repositorio tiene el **borrado automático activado**: cuando el Pull Request se
fusiona, GitHub borra la rama sola. Al final quedan las ramas permanentes (`main`,
`beta` y `Version2`) y las de trabajo que sigan abiertas.

Si necesitas conservar una rama, al fusionar el PR desmarca **"Delete head
branch"**.

---

## 3. Convención de commits (Conventional Commits)

Todos los mensajes de commit siguen esta estructura:

```
<tipo>(<ámbito>): <descripción en minúsculas>
```

- **tipo**: qué tipo de cambio es.
- **ámbito** *(opcional)*: la parte del proyecto afectada, entre paréntesis.
- **descripción**: qué se hizo, en minúsculas, sin punto final, en imperativo.
  Ejemplo: `agrega el buscador`, no `Agregué el buscador.`

### Tipos permitidos

| Tipo | Significado | Ejemplo |
|---|---|---|
| `feat` | Funcionalidad nueva | `feat(auth): registra la sesion del usuario` |
| `fix` | Corrección de un error | `fix(mapa): corrige el zoom al arrastrar` |
| `docs` | Documentación | `docs: anade el manual de usuario` |
| `style` | Formato, sin cambiar el código | `style: normaliza la sangria de los archivos` |
| `refactor` | Reorganización del código | `refactor(store): separa el estado de la persistencia` |
| `perf` | Rendimiento | `perf(3d): reduce las consultas al DOM` |
| `test` | Pruebas | `test(busqueda): cubre la busqueda por docente` |
| `chore` | Tareas de mantenimiento | `chore: actualiza las dependencias de Three.js` |
| `build` | Empaquetado y dependencias | `build: anade la libreria de NURBS al vendor` |
| `ci` | Integración continua y automatizaciones | `ci: anade la verificacion de la convencion de commits` |

### Ejemplos de mensajes válidos

```
feat(mapa): anade el conmutador de vista 2D/3D
fix(filtros): evita aplicar un filtro sin ningun piso marcado
docs: anade el manual de usuario y la guia de contribucion
feat(view3d): carga los marcadores sobre el modelo
chore(models): reexporta el modelo de oficinas desde Blender
```

### Ejemplos de mensajes **incorrectos**

```
cambios varios            -> sin tipo, no se sabe qué cambió
Arreglado el bug del zoom  -> en pasado y sin tipo
feat: agregar filtro por dias de la semana   -> en pasado
wip                      -> no explica nada
```

### Reglas prácticas

- **Un commit = un cambio.** Si toca dos cosas sin relación, son dos commits.
- **El mensaje va en imperativo y en minúsculas**: `anade`, `corrige`, `actualiza`.
- **El cuerpo es opcional.** Si el cambio necesita explicación, deja una línea en
  blanco y luego el porqué:
  ```
  fix(3d): normaliza la escala del modelo de oficinas

  El modelo venia en centimetros y se salia del escenario.
  ```
- **Nunca uses "actualizar archivos" o "cambios"** como mensaje.

---

## 4. Pull Requests

### Antes de abrirlo

- [ ] El PR resuelve **un solo issue**.
- [ ] La rama está actualizada: `git pull origin main`.
- [ ] El código funciona (pruébalo en `INICIAR.bat`).
- [ ] El mensaje del commit sigue la convención.

### Al abrirlo

Usa la plantilla automática (`.github/pull_request_template.md`) y complétala.

**El título del Pull Request también sigue la convención** de commits, porque al
fusionar con *squash* ese título es el mensaje que queda en `main`:

```
feat(mapa): anade el conmutador de vista 2D/3D
fix(filtros): evita aplicar un filtro sin ningun piso marcado
docs: actualiza el manual de usuario
```

Hay una **verificación automática** (`.github/workflows/convencion-commits.yml`) que
rechaza los títulos y los mensajes que no la siguen.

En la descripción **siempre** incluye:

```
Closes #45
```

Esa línea hace que el issue se cierre solo al fusionar.

### Revisión

- Necesita **1 aprobación** de otro miembro del equipo antes de fusionarse.
- En la pestaña del Pull Request, en **Reviewers**, se puede pedir la revisión a un
  compañero concreto (cualquiera con acceso de escritura al repositorio puede
  revisarlo).
- El revisor puede pedir cambios: corrige en la **misma rama** y haz `push` otra vez.
- Las aprobaciones antiguas se descartan cuando hay commits nuevos.

### Fusionar

Cuando el PR esté aprobado, el autor (o el responsable del repositorio) pulsa
**Merge pull request** y borra la rama con **Delete branch**.

---

## 5. Issues

- Cada tarea tiene su issue, con **etiqueta** (`area:*`, `prioridad:*`), **responsable**
  y **criterios de aceptación**.
- Si encuentras un error, usa la plantilla de **informe de error** en
  `.github/ISSUE_TEMPLATE/`.
- Si propones una mejora, usa la de **solicitud de mejora**.
- Los issues se cierran al fusionar su PR (`Closes #NN`).

---

## 6. Etiquetas del proyecto

| Etiqueta | Significado |
|---|---|
| `area:2d` | Vista de plano |
| `area:3d` | Visor tridimensional |
| `area:datos` | Archivos de datos del mapa |
| `area:auth` | Autenticación y sesión |
| `area:ui` | Interfaz y estilos |
| `area:accesibilidad` | Navegación por teclado y lectura |
| `area:infraestructura` | Servidor, librerías, scripts |
| `area:documentacion` | Manuales y guías |
| `area:pruebas` | Pruebas y verificación |
| `prioridad:alta` | Se hace primero |
| `prioridad:media` | Se hace después de lo urgente |

---

## 7. Gestión de versiones

El proyecto sigue **SemVer** (`MAJOR.MINOR.PATCH`):

| Tipo de cambio | Versión | Ejemplo |
|---|---|---|
| Rompe algo incompatible | `MAJOR` | `v2.0.0` |
| Funcionalidad nueva | `MINOR` | `v1.1.0` |
| Corrección de errores | `PATCH` | `v1.0.1` |

Cada versión se publica como **release** en GitHub, con la lista de cambios:

```bash
git tag -a v1.1.0 -m "Version 1.1.0"
git push origin v1.1.0
```

Las tareas pendientes se agrupan en el **milestone** de la versión correspondiente
(por ejemplo, `v1.0`).

---

## 8. Reglas de escritura del código

- **JavaScript**: español en los identificadores, tal como está el proyecto
  (`UniMap.estado`, `util.notificar`, `util.escapar`). Comillas dobles, `;` al final.
- **CSS**: variables en `:root` (archivo `css/base.css`), estilos por capítulo
  (`css/map.css`, `css/panels.css`, `css/responsive.css`).
- **Namespaces**: todo lo nuevo se cuelga de `window.UniMap`.
- **Comentarios**: explica el *porqué*, no el *qué*.
- **Rutas**: siempre relativas y con `/` (funciona en Windows y en Linux).
- **Modelos 3D**: exportados desde Blender en `.glb` (o `.fbx` para la planta baja),
  con la misma escala y orientación que el resto del campus.

---

## 9. Estructura del proyecto

```
css/      estilos por capítulo
js/
  core/   estado global y utilidades
  data/   datos del mapa (espacios, categorías, edificios, docentes)
  auth/   autenticación y sesión
  map/    mapa 2D, filtros, búsqueda, horarios, favoritos, ficha
  view3d/ visor tridimensional
models/   modelos 3D del campus
vendor/   Three.js r147 y cargadores (funciona sin internet)
```

Detalle completo, archivo por archivo, en [`ESTRUCTURA.md`](ESTRUCTURA.md), y las
capturas de la aplicación en [`docs/capturas/`](docs/capturas/).

---

## 10. Configuración inicial de git (una sola vez)

Cada persona configura git con **su propio nombre y su propio correo**:

```bash
git config --global user.name  "TU NOMBRE"
git config --global user.email "TU-CORREO-NOREPLY"
```

| Persona | `user.name` | `user.email` |
|---|---|---|
| **eelhuevo** | `eelhuevo` | `246075275+eelhuevo@users.noreply.github.com` |
| **moisesAlejandro78** | `moisesAlejandro78` | `246076688+moisesAlejandro78@users.noreply.github.com` |
| **Jhoselinconde537-lang** | `condecita` | `243635011+Jhoselinconde537-lang@users.noreply.github.com` |
| **Oslo144** | `Oslo` | `246077111+Oslo144@users.noreply.github.com` |
| **ItsMegabo11** | `José Arroyo` | `246074753+ItsMegabo11@users.noreply.github.com` |

> **No uses el de otra persona.** GitHub identifica a cada commit por el
> `user.email`. Si todos configuran el de eelhuevo, todos los commits del equipo
> aparecerán como de eelhuevo y se pierde la evidencia de la participación
> individual de cada integrante.

Para copiar tu correo noreply: GitHub → tu avatar → **Settings** → **Emails** →
en *"Keep my email addresses private"* aparece con el formato
`ID+USUARIO@users.noreply.github.com`.

Para comprobarlo:

```bash
git config --global --list
```

Si `git` te pide usuario y contraseña al subir: usa un **token personal** de GitHub
en lugar de la contraseña. En GitHub → *Settings* → *Developer settings* → *Personal
access tokens* → *Generate new token* con permisos `repo`.

---

## 11. Resumen en 6 comandos

```bash
git clone https://github.com/eelhuevo/MapaInteractivo.git
cd MapaInteractivo
git checkout -b feature/mi-tarea
git add <mi-archivo>
git commit -m "feat(mapa): anade mi funcionalidad"
git push -u origin feature/mi-tarea
```

Y luego abre el Pull Request. **No hace falta instalar nada más**: al hacer
`git push`, la terminal muestra un link azul *"Create a pull request for
'feature/mi-tarea' on GitHub by visiting: ..."*. Ábrelo y:

- **Título**: `feat(mapa): anade mi funcionalidad` (el mismo mensaje del commit).
- **Descripción**: `Closes #45`.
- Botón verde **"Create pull request"**.

Si ya tienes [GitHub CLI](https://cli.github.com) instalado, también sirve:

```bash
gh pr create --base main --title "feat(mapa): anade mi funcionalidad" --body "Closes #45"
```

---

## 12. Las tareas del proyecto

Este es el mapa completo de las 16 tareas de la entrega `v1.0.0`: qué issue las
abría, quién las hizo, en qué rama se trabajó, qué Pull Request las entregó y qué
commit las contiene. Sirve para saber en cualquier momento **quién hizo qué**.

| # | Issue | Tarea | Responsable | Rama | Pull Request | Commit |
|---|---|---|---|---|---|---|
| 36 | [Modelo de datos de los espacios](https://github.com/eelhuevo/MapaInteractivo/issues/36) | `js/data/espacios.js` con los espacios de los 4 pisos | eelhuevo | `feature/modelo-datos-espacios` | [#58](https://github.com/eelhuevo/MapaInteractivo/pull/58) | [`8d784a1`](https://github.com/eelhuevo/MapaInteractivo/commit/8d784a1) |
| 37 | [Autenticación y sesión](https://github.com/eelhuevo/MapaInteractivo/issues/37) | Login, registro, invitado y sesión | eelhuevo | `feature/auth-sesion` | [#59](https://github.com/eelhuevo/MapaInteractivo/pull/59) | [`57bdbb1`](https://github.com/eelhuevo/MapaInteractivo/commit/57bdbb1) |
| 38 | [Estado global y persistencia](https://github.com/eelhuevo/MapaInteractivo/issues/38) | `js/core/store.js` con preferencias en `localStorage` | eelhuevo | `feature/store-estado-global` | [#60](https://github.com/eelhuevo/MapaInteractivo/pull/60) | [`619d3a0`](https://github.com/eelhuevo/MapaInteractivo/commit/619d3a0) + [`9e0405f`](https://github.com/eelhuevo/MapaInteractivo/commit/9e0405f) |
| 39 | [Edificio principal en 3D](https://github.com/eelhuevo/MapaInteractivo/issues/39) | `models/edificio.glb` | moisesAlejandro78 | `feature/modelo-edificio-principal` | [#61](https://github.com/eelhuevo/MapaInteractivo/pull/61) | [`3ee356e`](https://github.com/eelhuevo/MapaInteractivo/commit/3ee356e) |
| 40 | [Edificio de oficinas en 3D](https://github.com/eelhuevo/MapaInteractivo/issues/40) | `models/oficinas.glb` | moisesAlejandro78 | `feature/modelo-oficinas` | [#62](https://github.com/eelhuevo/MapaInteractivo/pull/62) | [`1694b4c`](https://github.com/eelhuevo/MapaInteractivo/commit/1694b4c) |
| 41 | [Habitación tipo en 3D](https://github.com/eelhuevo/MapaInteractivo/issues/41) | `models/habitacion.glb` | moisesAlejandro78 | `feature/modelo-habitacion` | [#63](https://github.com/eelhuevo/MapaInteractivo/pull/63) | [`65c1796`](https://github.com/eelhuevo/MapaInteractivo/commit/65c1796) |
| 42 | [Planta baja de la torre B (FBX)](https://github.com/eelhuevo/MapaInteractivo/issues/42) | `models/PLANTA BAJA TOORE B.fbx` con metadatos | Jhoselinconde537-lang | `feature/modelo-planta-baja-fbx` | [#64](https://github.com/eelhuevo/MapaInteractivo/pull/64) | [`5a870a8`](https://github.com/eelhuevo/MapaInteractivo/commit/5a870a8) + [`3fba895`](https://github.com/eelhuevo/MapaInteractivo/commit/3fba895) |
| 43 | [Cargador FBX y curvas NURBS](https://github.com/eelhuevo/MapaInteractivo/issues/43) | `vendor/three/FBXLoader.js`, `NURBSCurve.js`, `NURBSUtils.js` | Jhoselinconde537-lang | `feature/cargador-fbx-nurbs` | [#65](https://github.com/eelhuevo/MapaInteractivo/pull/65) | [`0736cbf`](https://github.com/eelhuevo/MapaInteractivo/commit/0736cbf) |
| 44 | [Cargador glTF](https://github.com/eelhuevo/MapaInteractivo/issues/44) | `vendor/three/GLTFLoader.js` | Jhoselinconde537-lang | `feature/cargador-gltf` | [#66](https://github.com/eelhuevo/MapaInteractivo/pull/66) | [`53eab8d`](https://github.com/eelhuevo/MapaInteractivo/commit/53eab8d) |
| 45 | [Barra superior](https://github.com/eelhuevo/MapaInteractivo/issues/45) | Estilos de la barra y del buscador | Oslo144 | `feature/estilos-barra-superior` | [#57](https://github.com/eelhuevo/MapaInteractivo/pull/57) | [`acdfbc0`](https://github.com/eelhuevo/MapaInteractivo/commit/acdfbc0) + [`0f23fcd`](https://github.com/eelhuevo/MapaInteractivo/commit/0f23fcd) |
| 46 | [Paneles laterales](https://github.com/eelhuevo/MapaInteractivo/issues/46) | `css/panels.css` | Oslo144 | `feature/estilos-paneles` | [#67](https://github.com/eelhuevo/MapaInteractivo/pull/67) | [`c372fdc`](https://github.com/eelhuevo/MapaInteractivo/commit/c372fdc) |
| 47 | [Ficha flotante del espacio](https://github.com/eelhuevo/MapaInteractivo/issues/47) | `js/map/tooltip.js` accesible | Oslo144 | `feature/ficha-espacio-tooltip` | [#68](https://github.com/eelhuevo/MapaInteractivo/pull/68) | [`3c2b02c`](https://github.com/eelhuevo/MapaInteractivo/commit/3c2b02c) |
| 48 | [Sistema de diseño base](https://github.com/eelhuevo/MapaInteractivo/issues/48) | `css/base.css` con variables y foco visible | ItsMegabo11 | `feature/sistema-diseno-base` | [#69](https://github.com/eelhuevo/MapaInteractivo/pull/69) | [`8ebf969`](https://github.com/eelhuevo/MapaInteractivo/commit/8ebf969) |
| 49 | [Adaptación a celular y tablet](https://github.com/eelhuevo/MapaInteractivo/issues/49) | `css/responsive.css` | ItsMegabo11 | `feature/responsive-pantallas` | [#70](https://github.com/eelhuevo/MapaInteractivo/pull/70) | [`3fa1959`](https://github.com/eelhuevo/MapaInteractivo/commit/3fa1959) |
| 50 | [Buscador de espacios y docentes](https://github.com/eelhuevo/MapaInteractivo/issues/50) | `js/map/busqueda.js` | ItsMegabo11 | `feature/buscador-espacios-docentes` | [#71](https://github.com/eelhuevo/MapaInteractivo/pull/71) | [`6cdcbba`](https://github.com/eelhuevo/MapaInteractivo/commit/6cdcbba) |
| 51 | [CHANGELOG del proyecto](https://github.com/eelhuevo/MapaInteractivo/issues/51) | `CHANGELOG.md` con el historial | eelhuevo | `docs/changelog` | [#53](https://github.com/eelhuevo/MapaInteractivo/pull/53) | [`c564cf0`](https://github.com/eelhuevo/MapaInteractivo/commit/c564cf0) |

Además, el equipo siguió modelando en 3D después de la entrega `v1.0.0`: la torre
antigua (baños) se integró en el PR [#72](https://github.com/eelhuevo/MapaInteractivo/pull/72)
y los modelos de la torre antigua y de la torre de innovación están en revisión en
los PR [#73](https://github.com/eelhuevo/MapaInteractivo/pull/73),
[#74](https://github.com/eelhuevo/MapaInteractivo/pull/74) y
[#75](https://github.com/eelhuevo/MapaInteractivo/pull/75).
