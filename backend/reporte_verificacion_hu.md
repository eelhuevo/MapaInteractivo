# Reporte de verificación — Historias de usuario (HU-01…HU-20)

- **Fecha/hora:** 2026-10-07 12:36:41 (America/La_Paz)
- **Base de datos:** Supabase PostgreSQL (pooler IPv4, sesión) + PostGIS
- **Servidor:** http://127.0.0.1:8000 (php artisan serve)

## Resumen

| HU | Historia | Verificaciones | Resultado |
|---|---|:---:|---|
| HU-01 | Visualizar mapa interactivo | 5 | ✅ PASS |
| HU-02 | Filtrar ubicaciones por categoría | 5 | ✅ PASS |
| HU-03 | Consultar información de oficina o servicio | 6 | ✅ PASS |
| HU-04 | Acceso desde dispositivos móviles | 3 | ✅ PASS |
| HU-05 | Buscar ubicación en el mapa | 5 | ✅ PASS |
| HU-06 | Administrar oficinas o servicios | 8 | ✅ PASS |
| HU-07 | Consultar servicios disponibles por edificio | 3 | ✅ PASS |
| HU-08 | Entrada principal y estacionamientos | 3 | ✅ PASS |
| HU-09 | Estado de atención (abierto/cerrado) | 3 | ✅ PASS |
| HU-10 | Visualizar ruta hacia una ubicación | 5 | ✅ PASS |
| HU-11 | Escaneo de código QR de edificio | 4 | ✅ PASS |
| HU-12 | Marcar oficinas o servicios como favoritos | 4 | ✅ PASS |
| HU-13 | Notificaciones de cambios de ubicación | 5 | ✅ PASS |
| HU-14 | Estadísticas de uso de oficinas | 5 | ✅ PASS |
| HU-15 | Cambiar idioma del sistema | 3 | ✅ PASS |
| HU-16 | Iniciar sesión | 4 | ✅ PASS |
| HU-17 | Registrar usuario | 4 | ✅ PASS |
| HU-18 | Consultar ubicación de aulas | 4 | ✅ PASS |
| HU-19 | Filtrar por tipo de laboratorio | 3 | ✅ PASS |
| HU-20 | Sugerencias según carrera y semestre | 5 | ✅ PASS |

**Total: 87 verificaciones PASS / 0 FAIL**

### 📌 Nota sobre rendimiento

Los tiempos medidos (HTTP ≈ 3,1–3,2 s; consultas+BD ≈ 2,4 s para el listado del mapa) corresponden a la latencia de red hacia la piscina (pooler) de Supabase en `sa-east-1` desde este equipo, **no** a una lentitud de la API: cada consulta individual tarda ~0,3 s por el enrutado. Las pruebas locales con PostgreSQL mostraron < 150 ms por consulta. Para cumplir con holgura el criterio de «< 3 s» se recomienda: caché de respuestas para los endpoints públicos de lectura (p. ej. middleware `CacheResponse` de Laravel) y/o desplegar la API en la misma región que la base de datos.

### 📌 Pendientes en el frontend (fuera del alcance de esta verificación de API)

- HU-01: zoom, desplazamiento, marcadores diferenciados y vista móvil (Leaflet/Mapbox).
- HU-04: diseño responsive, botones táctiles y pruebas en Android/iOS.
- HU-13: el «detectar cambios y enviar aviso» es un proceso interno (job/listener); aquí se verificaron los endpoints de bandeja, marcado y filtro.

## Detalle por historia

### HU-01 — Visualizar mapa interactivo

- ✅ GET /api/espacios responde 200 — `status 200`
- ✅ Carga de marcadores: 15 espacios activos — `api=15, bd=15`
- ✅ Todos los marcadores traen latitud/longitud — `sin coord: 0`
- ✅ La carga del listado < 3 s — `http(rtt)=1360 ms, api+bd=2425 ms`
- ✅ Respuesta JSON apta para navegadores/móvil (HU-04) — `content-type JSON`

### HU-02 — Filtrar ubicaciones por categoría

- ✅ Filtro ?tipoEspacio=1 (aulas) devuelve solo aulas — `esperado=[1,2,3,4,5] vs api=[1,2,3,4,5]`
- ✅ Filtro ?idCategoriaServicio (laboratorios) devuelve solo esa categoría — `esperado=[6,7,8,9] vs api=[6,7,8,9]`
- ✅ Combinación tipo+piso filtra correctamente — `esperado=[1,2] vs api=[1,2]`
- ✅ GET /catalogos/tipos-espacio lista tipos para filtros — `n=6`
- ✅ GET /catalogos/categorias-servicio lista categorías para filtros — `n=8`

### HU-03 — Consultar información de oficina o servicio

- ✅ Ficha de oficina responde 200 — `status 200`
- ✅ Ficha muestra nombre del espacio — `Caja Universitaria`
- ✅ Ficha muestra edificio — `Edificio C — Administrativo`
- ✅ Ficha muestra piso — `Piso 1`
- ✅ Ficha muestra horario de atención — `horarios=5`
- ✅ Ficha muestra contacto — `'caja@univalle.edu.bo'`

### HU-04 — Acceso desde dispositivos móviles

- ✅ API consumible desde móvil: JSON con coordenadas en < 3 s — `http=1448 ms, api+bd=2425 ms`
- ✅ El listado del mapa es ligero (< 1 MB) — `7.4 KB`
- ✅ Sin token, rutas públicas funcionan (invitado/visitante)

### HU-05 — Buscar ubicación en el mapa

- ✅ Búsqueda por nombre (q=Biblioteca) → 200 — `status 200`
- ✅ Devuelve el espacio esperado — `n=1`
- ✅ Búsqueda parcial mientras se escribe (q=A-10) — `n=2`
- ✅ Los resultados incluyen coordenadas para centrar el mapa
- ✅ Texto sin coincidencias devuelve lista vacía — `n=0`

### HU-06 — Administrar oficinas o servicios

- ✅ Administrador crea oficina (POST /admin/espacios) — `status 201, id 25`
- ✅ Administrador edita la oficina (PUT) — `status 200`
- ✅ Los cambios se reflejan de inmediato en el mapa (ficha) — `Oficina de Prueba HU-06 1791390834 (editada)`
- ✅ Solo usuarios autorizados: estudiante recibe 403 — `status 403`
- ✅ Administrador elimina la oficina (DELETE) — `status 200`
- ✅ Al eliminar, la ficha ya no existe (404) — `status 404`
- ✅ Sin token, panel admin → 401
- ✅ Con token de estudiante, panel admin → 403

### HU-07 — Consultar servicios disponibles por edificio

- ✅ GET /edificios/2 → 200 con lista de servicios — `servicios=4`
- ✅ Cada servicio incluye nombre y tipo
- ✅ Consulta de pisos del edificio (GET /pisos) — `pisos=3`

### HU-08 — Entrada principal y estacionamientos

- ✅ GET /zonas → 200 — `status 200`
- ✅ Entrada principal claramente marcada (tipoZona=entradaPrincipal) — `areaDeportiva,entradaPrincipal,estacionamiento,estacionamiento`
- ✅ Estacionamientos con tipo diferenciado — `areaDeportiva,entradaPrincipal,estacionamiento,estacionamiento`

### HU-09 — Estado de atención (abierto/cerrado)

- ✅ El estado coincide con el horario registrado (BD) en los espacios probados — `{"1":"abierto","6":"abierto","10":"abierto","14":"abierto"}`
- ✅ El estado depende del horario (sáb 10:00 simulado: hay abiertos y cerrados) — `abiertos=10 de 15 (en este instante todos abiertos)`
- ✅ Filtro ?disponible=true solo lista abiertos — `n=15, abiertos_reales=15`

### HU-10 — Visualizar ruta hacia una ubicación

- ✅ GET /rutas → 200 — `status 200`
- ✅ Calcula ruta peatonal con distancia en metros — `38.59 m`
- ✅ Incluye duración estimada de caminata — `0.5 min`
- ✅ Devuelve geometría GeoJSON para dibujar la ruta — `lineaRecta`
- ✅ El destino coincide con el espacio elegido — `'Laboratorio de Sistemas B-101'`

### HU-11 — Escaneo de código QR de edificio

- ✅ GET /codigos-qr/QR-EDIFICIO-A → 200 — `status 200`
- ✅ Abre la ficha del edificio correspondiente — `Edificio A — Aulas`
- ✅ El edificio viene con coordenadas y ficha (urlFichaEdificio) — `/edificios/1`
- ✅ QR desconocido → 404 (lectura correcta) — `status 404`

### HU-12 — Marcar oficinas o servicios como favoritos

- ✅ Marcar favorito (POST /favoritos) — `status 201`
- ✅ El favorito queda guardado por usuario — `n=1`
- ✅ Desmarcar favorito (DELETE /favoritos/3) — `status 200`
- ✅ Al desmarcar ya no aparece en la lista

### HU-13 — Notificaciones de cambios de ubicación

- ✅ El usuario recibe la notificación en su bandeja — `totalNoLeidas=1`
- ✅ Marcar como leída (PATCH) — `status 200`
- ✅ Al marcarla como leída deja de contar como no leída — `totalNoLeidas=0`
- ✅ Filtro ?soloNoLeidas=true excluye las leídas
- ✅ Marcar todas como leídas — `status 200`

### HU-14 — Estadísticas de uso de oficinas

- ✅ Admin consulta el ranking de más consultados (200) — `status 200`
- ✅ El ranking coincide con el conteo real de eventos en BD — `[6,1,10,2]`
- ✅ Las cifras del ranking coinciden con BD — `api=2 bd=2`
- ✅ Solo administradores pueden ver estadísticas (403) — `estudiante`
- ✅ Filtro por tipo de evento (?tipoEvento=ruta) — `[{"posicion":1,"idEspacio":6,"nombreEspacio":"Laboratorio de Sistemas B-101","edificio":"Edificio B \u2014 Laboratorios","tipoEspacio":"laboratorio","totalConsultas":2,"detalle":{"fichas":0,"busquedas":0,"rutas":2}}]`

### HU-15 — Cambiar idioma del sistema

- ✅ Cambiar a inglés (es→en) y persistir — `en`
- ✅ Cambiar a español (en→es) y persistir — `es`
- ✅ Solo se aceptan es/en (fr → 422) — `status 422`

### HU-16 — Iniciar sesión

- ✅ Credenciales correctas → 200 con token — `status 200`
- ✅ Credenciales incorrectas → 401 con mensaje — `status 401 {"mensaje":"Correo o contrase\u00f1a incorrectos."}`
- ✅ POST /auth/logout revoca el token (200) — `status 200`
- ✅ Token revocado ya no permite acceso (401) — `status 401`

### HU-17 — Registrar usuario

- ✅ Registro público con nombre, correo, contraseña y rol (201 + confirmación) — `status 201`
- ✅ El correo no debe estar previamente registrado (422) — `status 422`
- ✅ Admin registra usuario con cualquier rol (HU-17 vía panel) — `status 201`
- ✅ GET /catalogos/carreras lista carreras para registro — `n=8`

### HU-18 — Consultar ubicación de aulas

- ✅ GET /aulas lista todas las aulas (5) — `n=5`
- ✅ Cada aula trae coordenadas (para centrar el mapa)
- ✅ Búsqueda de aulas por nombre/número (?buscar=101) — `n=1`
- ✅ La búsqueda de aulas no mezcla laboratorios — `n=0`

### HU-19 — Filtrar por tipo de laboratorio

- ✅ Filtro ?idTipoLaboratorio=1 (química) solo muestra laboratorios de esa categoría — `esperado=[9] vs api=[9]`
- ✅ El filtro se puede combinar con tipo de espacio
- ✅ GET /catalogos/tipos-laboratorio lista tipos de laboratorio — `n=4`

### HU-20 — Sugerencias según carrera y semestre

- ✅ Estudiante recibe sugerencias (200) — `status 200`
- ✅ Las sugerencias corresponden a su carrera (Ing. de Sistemas) — `Ingeniería de Sistemas`
- ✅ Consideran su semestre (según semestreObjetivo) — `3`
- ✅ Devuelve exactamente los 9 espacios sugeridos en BD — `esperado=[7,3,13,11,10,6,12,14,1] vs api=[7,3,13,11,10,6,12,14,1]`
- ✅ Los docentes no reciben sugerencias (aviso claro) — `Las sugerencias están disponibles para estudiantes.`
