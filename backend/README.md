# 🗺️ Mapa Interactivo del Campus — Backend (API REST)

API REST en **Laravel 13 + PostgreSQL (Supabase) + PostGIS** para el Mapa
Interactivo del campus de la Universidad Privada del Valle.

- Autenticación por tokens con **Laravel Sanctum** (`Authorization: Bearer <token>`).
- Coordenadas geográficas en `geometry(Point, 4326)` (PostGIS) con índices GIST.
- Estado *abierto/cerrado* **derivado de los horarios** (no se guarda — 3FN).
- Todas las tablas y campos en **español camelCase**.

---

## ⚙️ Instalación

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Configura en `.env` la conexión de Supabase
(*Project Settings → Database → Connection info*):

```env
DB_CONNECTION=pgsql
DB_HOST=db.<referencia>.supabase.co   # o el pooler aws-0-<region>.pooler.supabase.com
DB_PORT=5432                          # 6543 si usas el pooler en modo sesión
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=<tu contraseña>
DB_SSLMODE=require
```

> **PostGIS:** la primera migración ejecuta `CREATE EXTENSION IF NOT EXISTS postgis`.
> Si el rol de conexión no tiene permisos, actívala antes en Supabase:
> *Database → Extensions → postgis*.

Luego:

```bash
php artisan migrate --seed
php artisan serve
```

### Extensiones PHP requeridas

`pdo_pgsql`, `pgsql`, `fileinfo`, `zip` (habilitarlas en `php.ini`).

### Usuarios de prueba (seeders)

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@univalle.edu.bo` | `Admin12345` | administrador |
| `gestion@univalle.edu.bo` | `Gestion12345` | personalAdministrativo |
| `docente@univalle.edu.bo` | `Docente12345` | docente |
| `estudiante@univalle.edu.bo` | `Estudiante12345` | estudiante |

---

## 📡 Endpoints

### Públicos (también para visitantes)

| Método | Endpoint | HU | Descripción |
|---|---|---|---|
| POST | `/api/auth/registro` | HU-17 | Registrar usuario (nombre, correo, contraseña, rol estudiante/docente) |
| POST | `/api/auth/login` | HU-16 | Iniciar sesión (correo + contraseña) → token |
| GET | `/api/espacios` | HU-01/02/19 | Espacios del mapa. Filtros: `idCategoriaServicio`, `idTipoEspacio`, `idTipoLaboratorio`, `idPiso`, `idEdificio`, `disponible`, `buscar` |
| GET | `/api/espacios/{id}` | HU-03 | Ficha: nombre, edificio, piso, horario, contacto y estado |
| GET | `/api/espacios/{id}/estado` | HU-09 | Solo el estado abierto/cerrado (derivado del horario) |
| GET | `/api/busqueda?q=` | HU-05 | Búsqueda por nombre / nro. de aula / nro. de laboratorio |
| GET | `/api/aulas?buscar=` | HU-18 | Aulas por nombre o número, con coordenadas |
| GET | `/api/edificios` | HU-01 | Edificios con coordenadas |
| GET | `/api/edificios/{id}` | HU-07 | Detalle + servicios del edificio |
| GET | `/api/edificios/{id}/pisos` | — | Pisos del edificio |
| GET | `/api/zonas?tipoZona=` | HU-08 | Entrada principal, estacionamientos, áreas deportivas |
| GET | `/api/codigos-qr/{codigo}` | HU-11 | Resuelve el QR → ficha del edificio |
| GET | `/api/rutas?latitudOrigen=&longitudOrigen=&idEspacioDestino=` | HU-10 | Ruta peatonal (GeoJSON + distancia + duración) |
| GET | `/api/catalogos/tipos-espacio` | — | Catálogo de tipos de espacio |
| GET | `/api/catalogos/categorias-servicio` | HU-02 | Catálogo de categorías |
| GET | `/api/catalogos/tipos-laboratorio` | HU-19 | Catálogo de tipos de laboratorio |
| GET | `/api/catalogos/carreras` | HU-20 | Catálogo de carreras |
| POST | `/api/eventos-consulta` | HU-14 | Registrar evento (`consulta`, `busqueda`, `ruta`) |

### Autenticados (`Authorization: Bearer <token>`)

| Método | Endpoint | HU | Descripción |
|---|---|---|---|
| POST | `/api/auth/logout` | — | Cerrar sesión |
| GET | `/api/auth/perfil` | — | Perfil del usuario |
| PUT | `/api/perfil/idioma` | HU-15 | Cambiar idioma (`es` / `en`) |
| GET | `/api/favoritos` | HU-12 | Listar favoritos del usuario |
| POST | `/api/favoritos` | HU-12 | Marcar favorito `{idEspacio}` |
| DELETE | `/api/favoritos/{idEspacio}` | HU-12 | Desmarcar favorito |
| GET | `/api/notificaciones?soloNoLeidas=` | HU-13 | Notificaciones de cambios |
| PATCH | `/api/notificaciones/{id}/leida` | HU-13 | Marcar como leída |
| PATCH | `/api/notificaciones/leer-todas` | HU-13 | Marcar todas como leídas |
| GET | `/api/sugerencias` | HU-20 | Sugerencias según carrera y semestre |

### Administración (`administrador` / `personalAdministrativo`)

| Método | Endpoint | HU | Descripción |
|---|---|---|---|
| POST | `/api/admin/espacios` | HU-06 | Crear oficina/servicio (con horarios y subtipo) |
| PUT/PATCH | `/api/admin/espacios/{id}` | HU-06/13 | Editar; si cambia ubicación/horario/contacto notifica a interesados |
| DELETE | `/api/admin/espacios/{id}` | HU-06 | Eliminar del mapa |
| GET | `/api/admin/usuarios` | — | Listar usuarios |
| POST | `/api/admin/usuarios` | HU-17 | Registrar usuario con cualquier rol |
| GET | `/api/admin/estadisticas/espacios-mas-consultados` | HU-14 | Ranking de espacios más consultados |

---

## 🧭 Rutas peatonales (HU-10) y pgRouting

`/api/rutas` funciona de inmediato con una línea recta de aproximación
(`tipoRuta: lineaRecta`). Para rutas reales sobre la red peatonal:

1. Activa pgRouting en Supabase (*Database → Extensions → pgrouting*).
2. Carga la red de vías del campus exportada de QGIS en la tabla
   `viasCampus` (con columnas `id`, `source`, `target`, `cost`,
   `reverse_cost`, `length_m`, `geom`) — por ejemplo con
   `pgr_createTopology`.
3. El endpoint detecta la tabla automáticamente y devuelve
   `tipoRuta: redPeatonal` con la geometría calculada por `pgr_dijkstra`.

---

## 🗄️ Esquema de base de datos (3FN)

```
roles 1───N usuarios 1───1 estudiantes N───1 carreras
                 └───1 docentes N───N materias (docenteMaterias)
zonas 1───N edificios 1───N pisos 1───N espacios N───1 tiposEspacio
                                          │        └───1 categoriasServicio
                                          ├───1 aulas
                                          ├───1 laboratorios N───1 tiposLaboratorio
                                          ├───1 oficinas
                                          └───N horariosEspacio
edificios 1───N codigosQr
usuarios N───N espacios (favoritos, notificaciones, eventosConsulta)
carreras N───N espacios (sugerenciasEspacio, por semestre)
```
