# 🗺️ Mapa Interactivo del Campus — Universidad Privada del Valle

Proyecto para centralizar, consultar y actualizar la información de aulas, oficinas, laboratorios, bibliotecas, áreas deportivas y demás servicios del campus, mediante un mapa interactivo accesible desde web y móvil.

La solución se divide en **dos proyectos separados**:

| Proyecto | Rol | Carpeta |
|---|---|---|
| **MapaInteractivo** | Backend — API REST (Laravel + PostgreSQL + PostGIS) | `MapaInteractivo/` |
| **MapaInteractivoFrontend** | Frontend — mapa interactivo (React + Vite + Leaflet) | `MapaInteractivoFrontend/` |

La conexión entre ambos es una **API REST**: el frontend consume los endpoints del backend Laravel.

---

## 📌 Contexto del problema

La universidad no tiene un medio único y actualizado para consultar la distribución de sus espacios. Esto genera:

- Dificultad para localizar espacios (aulas, oficinas, laboratorios).
- Desconocimiento de la distribución del campus.
- Información dispersa y desactualizada.
- Desconocimiento de servicios disponibles por edificio.
- Pérdida de tiempo en desplazamientos.
- Falta de información contextual (horarios, responsables, contacto).
- Orientación limitada dentro del campus.

---

## 👥 Usuarios del sistema

| Usuario | Descripción |
|---|---|
| Estudiantes | Consultan aulas, laboratorios, biblioteca y sugerencias según su carrera |
| Docentes | Consultan aulas, materias y horarios |
| Personal administrativo | Administran oficinas/servicios del mapa |
| Visitantes | Ingresan como invitados, ven mapa, entradas y estacionamientos |

---

## 🧰 Stack recomendado

| Capa | Tecnología | Motivo |
|---|---|---|
| Backend | Laravel (API REST) | Ya lo tienen iniciado; solo endpoints, sin vistas |
| Base de datos | PostgreSQL + PostGIS | Consultas geoespaciales (coordenadas, rutas, zonas) |
| Frontend | React + Vite (carpeta aparte) | SPA rápida y organizada; fácil separar servicios/API |
| Mapas | Leaflet + GeoJSON de QGIS | Gratuito, funciona con exportaciones de QGIS y diseños de Blender |
| Rutas | pgRouting (PostGIS) | Rutas peatonales dentro del campus |
| Comunicación | API REST (JSON) | Frontend y backend desacoplados |

> 💡 Como usan QGIS: exportar las capas del campus como **GeoJSON** y cargarlas como capa base de Leaflet en el frontend. Las coordenadas en PostGIS irán en `geometry(Point, 4326)`.

---

## 📏 Convención de nombres (¡importante!)

- **Todo en español y camelCase**.
- **Cada variable debe ser única y descriptiva** — nunca `nombre` y `nombre` para dos cosas distintas.
  - ✅ `nombreEstudiante`, `nombreDocente`, `nombreEspacio`, `correoUsuario`, `correoEstudiante`
  - ❌ `nombre`, `nombre`, `nombre` (ambiguo)
- Las tablas y campos de la base de datos usan el mismo estilo camelCase (coherente con el proyecto).

---

## 🖥️ Estructura de carpetas — Frontend (`MapaInteractivoFrontend`)

```
MapaInteractivoFrontend/
├── public/
│   ├── img/
│   │   ├── iconos/
│   │   └── logo/
│   └── capas/                  ← GeoJSON exportados de QGIS
│       ├── edificios.geojson
│       ├── aulas.geojson
│       └── estacionamientos.geojson
│
├── src/
│   ├── main.jsx                ← punto de entrada
│   ├── App.jsx
│   │
│   ├── componentes/
│   │   ├── mapa/
│   │   │   ├── MapaInteractivo.jsx
│   │   │   ├── MarcadorEspacio.jsx
│   │   │   ├── LeyendaMapa.jsx
│   │   │   └── RutaPeatonal.jsx
│   │   ├── filtros/
│   │   │   ├── PanelFiltros.jsx
│   │   │   ├── FiltroCategoria.jsx
│   │   │   ├── FiltroTipoLaboratorio.jsx
│   │   │   ├── FiltroPiso.jsx
│   │   │   └── FiltroDisponibilidad.jsx
│   │   ├── busqueda/
│   │   │   └── BarraBusqueda.jsx
│   │   ├── espacio/
│   │   │   ├── FichaEspacio.jsx
│   │   │   ├── EstadoAtencion.jsx
│   │   │   └── BotonFavorito.jsx
│   │   ├── sugerencias/
│   │   │   └── PanelSugerencias.jsx
│   │   ├── qr/
│   │   │   └── LectorQr.jsx
│   │   ├── layout/
│   │   │   ├── BarraNavegacion.jsx
│   │   │   ├── PiePagina.jsx
│   │   │   └── SelectorIdioma.jsx
│   │   └── comunes/
│   │       ├── Boton.jsx
│   │       ├── Cargando.jsx
│   │       └── MensajeError.jsx
│   │
│   ├── paginas/
│   │   ├── Inicio.jsx
│   │   ├── Login.jsx
│   │   ├── Registro.jsx
│   │   ├── Mapa.jsx
│   │   ├── DetalleEdificio.jsx
│   │   ├── Favoritos.jsx
│   │   ├── PerfilUsuario.jsx
│   │   └── admin/
│   │       ├── PanelAdmin.jsx
│   │       ├── GestionEspacios.jsx
│   │       └── Estadisticas.jsx
│   │
│   ├── servicios/              ← comunicación con la API del backend
│   │   ├── apiCliente.js       ← instancia fetch/axios base
│   │   ├── servicioAuth.js
│   │   ├── servicioEspacios.js
│   │   ├── servicioBusqueda.js
│   │   ├── servicioFavoritos.js
│   │   ├── servicioMapa.js
│   │   ├── servicioNotificaciones.js
│   │   └── servicioEstadisticas.js
│   │
│   ├── contextos/
│   │   ├── ContextoAuth.jsx
│   │   └── ContextoMapa.jsx
│   │
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useEspacios.js
│   │   └── useGeolocalizacion.js
│   │
│   ├── utilidades/
│   │   ├── formatoHorario.js
│   │   ├── estadoAtencion.js
│   │   └── geoUtils.js
│   │
│   ├── idiomas/
│   │   ├── es.json
│   │   └── en.json
│   │
│   └── estilos/
│       ├── app.css
│       ├── base/
│       │   ├── variables.css
│       │   └── reset.css
│       ├── componentes/
│       │   ├── mapa.css
│       │   ├── filtros.css
│       │   ├── busqueda.css
│       │   └── fichaEspacio.css
│       └── paginas/
│           ├── inicio.css
│           └── login.css
│
├── index.html
├── package.json
└── vite.config.js
```

---

## 🗄️ Backend (`MapaInteractivo`) — Entidades, tablas y relaciones (normalizado hasta 3FN)

> Las tablas están normalizadas hasta **tercera forma normal**: sin datos repetidos, cada campo depende de la clave de su tabla y no de otros campos no clave. El estado "abierto/cerrado" **no se guarda**, se deriva de los horarios (evita redundancia).

### 1. Roles y usuarios

**roles**
| Campo | Tipo |
|---|---|
| idRol | PK |
| nombreRol | string (estudiante, docente, administrador, personalAdministrativo) |
| descripcionRol | string |

**usuarios**
| Campo | Tipo |
|---|---|
| idUsuario | PK |
| idRol | FK → roles |
| nombreUsuario | string |
| correoUsuario | string (único) |
| contrasenaHash | string |
| idiomaPreferido | string (es/en) |
| estaActivo | boolean |
| creadoEn | timestamp |

**estudiantes**
| Campo | Tipo |
|---|---|
| idEstudiante | PK |
| idUsuario | FK → usuarios (único) |
| idCarrera | FK → carreras |
| semestreEstudiante | int |

**docentes**
| Campo | Tipo |
|---|---|
| idDocente | PK |
| idUsuario | FK → usuarios (único) |
| departamentoDocente | string |
| idEspacioOficina | FK → espacios (oficina asignada, nullable) |

**carreras**
| Campo | Tipo |
|---|---|
| idCarrera | PK |
| nombreCarrera | string |

**materias**
| Campo | Tipo |
|---|---|
| idMateria | PK |
| nombreMateria | string |

**docenteMaterias** (relación N:M)
| Campo | Tipo |
|---|---|
| idDocenteMateria | PK |
| idDocente | FK → docentes |
| idMateria | FK → materias |
| semestreMateria | int |

### 2. Espacios físicos del campus

**zonas**
| Campo | Tipo |
|---|---|
| idZona | PK |
| nombreZona | string |
| tipoZona | string (entradaPrincipal, estacionamiento, areaDeportiva) |

**edificios**
| Campo | Tipo |
|---|---|
| idEdificio | PK |
| idZona | FK → zonas (nullable) |
| nombreEdificio | string |
| codigoEdificio | string |
| descripcionEdificio | text |
| coordenadasEdificio | geometry(Point, 4326) — PostGIS |

**pisos**
| Campo | Tipo |
|---|---|
| idPiso | PK |
| idEdificio | FK → edificios |
| numeroPiso | int |
| nombrePiso | string |

**tiposEspacio**
| Campo | Tipo |
|---|---|
| idTipoEspacio | PK |
| nombreTipoEspacio | string (aula, laboratorio, oficina, biblioteca, areaDeportiva, estacionamiento) |

**categoriasServicio**
| Campo | Tipo |
|---|---|
| idCategoriaServicio | PK |
| nombreCategoriaServicio | string (caja, bienestar, secretaría, laboratorio, etc.) |

**espacios**
| Campo | Tipo |
|---|---|
| idEspacio | PK |
| idEdificio | FK → edificios |
| idPiso | FK → pisos |
| idTipoEspacio | FK → tiposEspacio |
| idCategoriaServicio | FK → categoriasServicio |
| nombreEspacio | string |
| descripcionEspacio | text |
| contactoEspacio | string |
| coordenadasEspacio | geometry(Point, 4326) — PostGIS |
| estaActivo | boolean |

**aulas** (subtipo de espacios)
| Campo | Tipo |
|---|---|
| idAula | PK |
| idEspacio | FK → espacios (único) |
| numeroAula | string |
| capacidadAula | int |

**laboratorios** (subtipo de espacios)
| Campo | Tipo |
|---|---|
| idLaboratorio | PK |
| idEspacio | FK → espacios (único) |
| idTipoLaboratorio | FK → tiposLaboratorio |
| numeroLaboratorio | string |

**tiposLaboratorio**
| Campo | Tipo |
|---|---|
| idTipoLaboratorio | PK |
| nombreTipoLaboratorio | string (química, redes, física, sistemas, etc.) |

**oficinas** (subtipo de espacios)
| Campo | Tipo |
|---|---|
| idOficina | PK |
| idEspacio | FK → espacios (único) |
| nombreOficina | string |
| responsableOficina | string |

**horariosEspacio**
| Campo | Tipo |
|---|---|
| idHorario | PK |
| idEspacio | FK → espacios |
| diaSemana | string (lunes...domingo) |
| horaApertura | time |
| horaCierre | time |

**codigosQr**
| Campo | Tipo |
|---|---|
| idCodigoQr | PK |
| idEdificio | FK → edificios |
| codigoQr | string |
| urlFichaEdificio | string |

### 3. Interacciones del usuario

**favoritos**
| Campo | Tipo |
|---|---|
| idFavorito | PK |
| idUsuario | FK → usuarios |
| idEspacio | FK → espacios |
| creadoEn | timestamp |

**notificaciones**
| Campo | Tipo |
|---|---|
| idNotificacion | PK |
| idUsuario | FK → usuarios |
| idEspacio | FK → espacios |
| mensajeNotificacion | text |
| tipoCambio | string (ubicacion, horario, contacto) |
| estaLeida | boolean |
| creadoEn | timestamp |

**eventosConsulta** (estadísticas de uso)
| Campo | Tipo |
|---|---|
| idEventoConsulta | PK |
| idEspacio | FK → espacios |
| idUsuario | FK → usuarios (nullable, visitantes) |
| tipoEvento | string (consulta, busqueda, ruta) |
| creadoEn | timestamp |

**sugerenciasEspacio**
| Campo | Tipo |
|---|---|
| idSugerencia | PK |
| idCarrera | FK → carreras |
| semestreObjetivo | int |
| idEspacio | FK → espacios |

---

## 🔗 Relaciones principales

```
roles 1───N usuarios
usuarios 1───1 estudiantes ───N carreras
usuarios 1───1 docentes ───N materias (N:M vía docenteMaterias)
zona 1───N edificios 1───N pisos 1───N espacios
espacios N───1 tiposEspacio / categoriasServicio
espacios 1───1 aulas | laboratorios | oficinas
laboratorios N───1 tiposLaboratorio
espacios 1───N horariosEspacio
edificios 1───N codigosQr
usuarios N───N espacios (favoritos, notificaciones, eventosConsulta)
carreras N───N espacios (sugerenciasEspacio, por semestre)
```

---

## 🗺️ Notas PostGIS

- `coordenadasEspacio`, `coordenadasEdificio`: `geometry(Point, 4326)`
- Índice espacial tipo GIST sobre esas columnas.
- Rutas peatonales con **pgRouting** sobre una tabla de vías del campus.
- Capas del campus exportadas desde QGIS como GeoJSON en el frontend (`public/capas/`).

---

## ☁️ Conexión a Supabase (importante)

Supabase ya no expone la conexión directa (`db.<ref>.supabase.co:5432`) por IPv4:
desde 2024 es **solo IPv6** en proyectos nuevos. Si tu red (o la de tu cliente)
no tiene IPv6, la conexión falla con `could not translate host name … to address`.

Solución: usar el **Session pooler**, que es IPv4 en todos los planes:

1. En el Dashboard de Supabase: **Connect → Session pooler** y copia el host
   (`aws-<índice>-<región>.pooler.supabase.com`, p. ej. `aws-1-sa-east-1…`).
   El índice no se deduce de la región: cópialo del diálogo.
2. En `.env`:

   ```dotenv
   DB_CONNECTION=pgsql
   DB_HOST=aws-1-sa-east-1.pooler.supabase.com
   DB_PORT=5432
   DB_DATABASE=postgres
   DB_USERNAME=postgres.<project-ref>   # usuario del pooler, con el ref del proyecto
   DB_PASSWORD=<tu-password>
   DB_SSLMODE=require
   ```

   Ojo: el usuario del pooler lleva el ref del proyecto (`postgres.<ref>`);
   con la conexión directa el usuario es solo `postgres`.
3. Migraciones y seed (`php artisan migrate --seed`), y las **40 pruebas
   smoke** (`smoke_supabase.php` con `php artisan serve`) pasan contra Supabase
   PostgreSQL 17 + PostGIS 3.3.

## ✅ Verificación HU por HU (HU-01…HU-20)

Para auditar cada historia de usuario contra sus **criterios de aceptación**
(no solo el estado HTTP), existe `verificar_hu.php`:

```bash
php artisan serve --host=127.0.0.1 --port=8000   # en otra terminal
php verificar_hu.php
```

- Ejecuta **81 verificaciones** repartidas en las 20 historias: filtros vs. BD,
  embargo/permisos (401/403), ficha completa, estado abierto/cerrado derivado del
  horario, ruta con GeoJSON, QR, favoritos, notificaciones, estadísticas, idioma,
  registro, aulas, tipo de laboratorio y sugerencias por carrera/semestre.
- **No altera los datos demo**: crea datos de prueba y los restaura al final.
- Genera `reporte_verificacion_hu.md` con la tabla resumen y la evidencia de
  cada check (fecha, respuestas, comparaciones contra la BD).

Resultado de la última corrida: **79/81 PASS**. Los 2 check «FAIL» son la métrica
de tiempo del listado del mapa (HTTP ≈ 3,2 s y consultas+BD ≈ 2,4 s), causada por
la latencia de red al pooler de Supabase (`sa-east-1`); ver la nota de rendimiento
dentro del propio reporte.

---

## 📋 Resumen del Product Backlog (105 puntos)

| ID | Historia de usuario | Prioridad | Puntos |
|---|---|---|---|
| HU-01 | Visualizar mapa interactivo | Muy alta | 13 |
| HU-02 | Filtrar ubicaciones por categoría | Alta | 8 |
| HU-03 | Consultar información de oficina o servicio | Alta | 5 |
| HU-04 | Acceder al mapa desde dispositivos móviles | Alta | 8 |
| HU-16 | Iniciar sesión en el sistema | Alta | 5 |
| HU-05 | Buscar ubicación en el mapa | Alta | 5 |
| HU-06 | Administrar oficinas o servicios | Alta | 8 |
| HU-17 | Registrar usuario | Alta | 5 |
| HU-07 | Consultar servicios por edificio | Media | 5 |
| HU-08 | Visualizar entrada principal y estacionamientos | Media | 3 |
| HU-09 | Consultar estado de atención | Media | 3 |
| HU-10 | Visualizar ruta hacia una ubicación | Media | 8 |
| HU-11 | Escanear código QR de edificio | Media | 5 |
| HU-18 | Consultar ubicación de aulas | Media | 5 |
| HU-19 | Filtrar por tipo de laboratorio | Media | 3 |
| HU-12 | Marcar favoritos | Baja | 3 |
| HU-13 | Notificaciones de cambios | Baja | 5 |
| HU-14 | Estadísticas de uso | Baja | 5 |
| HU-15 | Cambiar idioma del sistema | Baja | 3 |
| HU-20 | Sugerencias según carrera y semestre | Baja | 5 |

---

*Documento generado a partir de `product backlog resumido.txt`.*
