# Cómo contribuir a UniMap (Mapa Interactivo)

Guía de trabajo del equipo. Si la lees, ya sabes qué hacer con tu tarea.

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

---

## 2. Nombres de rama

Formato: `feature/descripcion-corta-en-kebab-case`

| Prefijo | Para qué | Ejemplo |
|---|---|---|
| `feature/` | Funcionalidad nueva | `feature/buscador-espacios-docentes` |
| `fix/` | Corrección de un error | `fix/zoom-invertido-movil` |
| `docs/` | Documentación | `docs/manual-de-usuario` |

Nunca trabajes directamente en `main` ni en `Version2`.

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

Usa la plantilla automática (`.github/pull_request_template.md`) y complétala. En la
descripción **siempre** incluye:

```
Closes #45
```

Esa línea hace que el issue se cierre solo al fusionar.

### Revisión

- Necesita **1 aprobación** de otro miembro del equipo antes de fusionarse.
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

Detalle completo en el `README.md` del repositorio.

---

## 10. Configuración inicial de git (una sola vez)

```bash
git config --global user.name  "eelhuevo"
git config --global user.email "246075275+eelhuevo@users.noreply.github.com"
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

Y luego abre el Pull Request:

```bash
gh pr create --base main --title "Mi funcionalidad" --body "Closes #45"
```
