# AGENTS.md — UniMap (Mapa Interactivo de Campus)

> **Lee esto antes de tocar nada.** Es el estado real del proyecto y el plan de
> trabajo. Si acabas de llegar, empieza por «Orden de trabajo».

## Reglas duras (NO negociables)

1. **En esta máquina NO se instala ni se actualiza nada** (ni PHP, ni Composer,
   ni Boost, ni npm). Ignora las instrucciones de `backend/AGENTS.md` que piden
   instalar PHP 8.5 / `composer require laravel/boost`: aquí **prevalece esta
   regla**. Las instalaciones se hacen en OTRA máquina del usuario.
2. **NO tocar git**: sin commits, sin `git add`, sin `git rm --cached`. Solo
   responde lo que se le pregunte sobre git.
3. Los **datos falsos SOLO pueden vivir en los seeders del backend**. En el
   navegador: cero (ni cuentas, ni espacios, ni docentes, ni categorías).
4. `usuarios` está en **3FN**: `nombreUsuario`, `apellidoPaternoUsuario`,
   `apellidoMaternoUsuario` (+ `nombreCompleto` vía accessor).

## Cómo se valida aquí (sin PHP)

Esta máquina **no puede ejecutar Laravel** (`migrate`, `serve`, `artisan`).
Validación permitida:

- **Sintaxis PHP**: `C:\xampp\php\php.exe -l <archivo>` (PHP 8.0, sirve para
  chequear; NO ejecuta la app porque pide 8.4 + `pdo_pgsql`).
- **Base de datos**: SQL directo contra Supabase con
  `python "C:\Users\Marko\AppData\Local\Temp\opencode\pg.py" --archivo x.sql`
  (cliente SCRAM propio; identificadores camelCase van entre comillas dobles:
  `"horariosDocente"`, `"docentes"`, `"estudiantes"`…). Si `pg.py` no existe,
  está documentado en el historial: se recrea con `psycopg` + credenciales de
  `backend/.env`.
- **Frontend**: mock Python con la misma forma de respuesta que Laravel
  (datos reales de Supabase) + `python -m http.server 8080` desde la **raíz**
  del repo, y probar con el navegador integrado. Después: borrar mocks, cerrar
  puertos (8000, 8080) y pestañas.
- **Al terminar cada cambio de JS/HTML**: subir el sufijo `?v=` en los 3 HTML
  (`index.html`, `frontend/mapa.html`, `frontend/admin.html`).

## Estructura

- `frontend/` — HTML/CSS/JS puro (sin build). `js/data/*` está **vacío a
  propósito**: espacios, docentes y categorías salen del backend vía
  `js/core/api.js`. `js/data/edificios.js` sí conserva la estructura física
  del plano (TA pisos 4-17, TI 0,4,6-11 + `MODELOS_PISOS`): no es dato falso,
  sin ella no se dibuja nada.
- `backend/` — Laravel 13 + Sanctum + Supabase (PostgreSQL 17). Rutas en
  `backend/routes/api.php`.
- Docs: `MANUAL-USUARIO.md` (usuario final), `CHANGELOG.md` (Keep a Changelog,
  añadir entrada en `[Unreleased]`), `REVISION_HISTORIAS_DE_USUARIO.md`
  (auditoría por HU), `backend/README.md` (tabla de endpoints),
  `backend/docs/README-backend.md` (modelo de datos).

## Estado: endpoints y CRUD (auditoría hecha hoy)

**Completos (CRUD)**
| Entidad | Backend | Usado en la web |
|---|---|---|
| espacios | GET público + `POST/PUT/PATCH/DELETE /admin/espacios` (rol admin) | ✅ panel admin crea/edita/borra; el mapa los lee |
| usuarios | `GET/POST /admin/usuarios` + `PUT /admin/usuarios/{id}` + `PATCH /admin/usuarios/{id}/estado` | ✅ pestaña Usuarios del panel (alta/edición/activar-desactivar) |
| estudiantes | `GET /admin/estudiantes` + `PUT /admin/estudiantes/{id}` | ✅ pestaña Estudiantes |
| docentes | `GET /admin/docentes` + `PUT /admin/docentes/{id}` (sync `idMaterias`) | ✅ pestaña Docentes |
| materias | `GET /admin/materias` (con `idDocentes`) + `POST/PUT/DELETE /admin/catalogos/materias` | ✅ pestaña Materias |
| carreras | `GET /catalogos/carreras` + `POST/PUT/DELETE /admin/catalogos/carreras` | ✅ pestaña Carreras |
| roles | `GET /roles` + `POST/PUT/DELETE /admin/catalogos/roles` | ✅ pestaña Roles |
| catálogos simples | `tipos-espacio`, `categorias-servicio`, `tipos-laboratorio` (GET público + `POST/PUT/DELETE /admin/catalogos/{entidad}`) | ✅ pestaña Catálogos (selector de los 3) |
| favoritos | GET/POST/DELETE (token) | ❌ la web usa localStorage |
| notificaciones | GET + PATCH marcar leída (token) | ✅ GET en avisos |
| auth | registro/login/logout | ✅ |

**Borrado**: cuentas/estudiantes/docentes **no se borran** → `PATCH
/admin/usuarios/{id}/estado` (`estaActivo`). Los catálogos simples sí admiten
`DELETE`, con **409** si están en uso (roles→usuarios, carreras→estudiantes,
tipos-espacio→espacios, tipos-laboratorio→laboratorios).

**Motor del panel**: un único CRUD genérico en `frontend/js/admin/admin.js`
(config por entidad + modal genérico `#modal-registro`), no 7 módulos. Las 7
pestañas nuevas se cargan de forma perezosa desde `mostrarTab()`.

**Solo lectura (GET), sin CUD**
| Entidad | Ruta | ¿La web la usa? |
|---|---|---|
| docentes | `/api/docentes` | ✅ panel Horarios |
| edificios / pisos | `/api/edificios`, `/edificios/{id}/pisos` | ✅ |
| tipos de espacio | `/api/catalogos/tipos-espacio` | ✅ filtros |
| espacios (incluir inactivos) | `/api/espacios` | ✅ |
| estadísticas admin | `/api/admin/estadisticas/espacios-mas-consultados` | ✅ |
| **materias** | `/api/materias?buscar=` (público) | ❌ (el panel usa `/admin/materias`) |
| **estudiantes** | `/api/estudiantes?buscar=` (token) | ❌ (el panel usa `/admin/estudiantes`) |
| aulas, zonas, búsqueda, rutas, QR, sugerencias, perfil | — | ❌ (algunos sin usar) |

**Sin endpoint**: CRUD de **aulas, edificios y zonas** (estructura del plano,
`CampusSeeder`; no se han añadido para no tocar el dibujo del mapa).

## Orden de trabajo

1. **Pendiente inmediato (si el usuario lo pide):** que la web consuma los
   endpoints públicos que aún no usa → `/api/roles` en el selector del
   registro (`auth.js`, hoy los roles están hardcodeados en `i18n`), y valorar
   `/api/materias` en el panel de horarios/búsqueda.
2. **En la otra máquina (con PHP real):** `php artisan migrate --seed`. Esto
   aplica: migración 3FN de usuarios, `2026_11_02_000001_create_horarios_docente_table`,
   `DocenteSeeder` (10 docentes / 49 turnos / 14 vínculos) y **rellena los
   espacios**: la BD hoy tiene **17** (CampusSeeder antiguo) frente a ~164 que
   describe el repo. Es idempotente.
3. **Diferido / conocido**: pgRouting (`viasCampus` no existe → la ruta
   responde `tipoRuta: "lineaRecta"`); notificaciones sin correo/push; no hay
   PHPUnit real ni tests de frontend; CRUD de aulas/edificios/zonas (estructura
   del plano) sin endpoint todavía.

## Cómo se prueba el frontend (sin PHP real)

Mock de Python en `%TEMP%` (¡**nunca** dentro del repo!) con la MISMA forma de
respuesta que Laravel y datos **reales** de Supabase, más
`python -m http.server 8080` desde la raíz. Se prueba con el navegador
integrado (login `admin@univalle.edu.bo` / `Admin12345`). **Al terminar**:
borrar el mock, cerrar los puertos 8000/8080 y las pestañas, y limpiar
`localStorage` (`unimap_sesion`, `unimap_token_api`, …).

## Datos reales de la BD (Supabase)

Host `aws-1-sa-east-1.pooler.supabase.com:6543`, usuario
`postgres.tamxwusifywmdqaicitg`. Conteos: usuarios 15, espacios 166 (1
inactivo), docentes 10, horariosDocente 49, horariosEspacio 85, estudiantes 2,
roles 4, materias 8, carreras 8, aulas 5, pisos 31 (la tabla; 20 con filas),
zonas 4, docenteMaterias 14, edificios 4 (A/B/C/Biblioteca).

Cuentas demo (seeders): `admin@univalle.edu.bo`/`Admin12345`,
`gestion@`/`Gestion12345`, `docente@`/`Docente12345`,
`estudiante@`/`Estudiante12345`; `docente2..10@`/`Docente12345`.

## Gotchas conocidas

- `localStorage` siempre con `JSON.stringify`: el token crudo rompe
  `UniMap.api.token()`.
- La web solo dibuja espacios de edificios con `codigoEdificio` A/B; lo de C/BIB
  no aparece en el plano (oficinas fuera del plano, por diseño).
- Búsqueda **sin tildes** vía `util.normalizar()` (`js/core/store.js`).
- Sin backend: el plano queda vacío + aviso `mapa.sinBackend`, y el login
  muestra `err.sinBackend`. No «arreglar» eso metiendo datos locales.
- Credenciales locales inventadas: NO (se eliminó `admin@uni.edu/123456`).
