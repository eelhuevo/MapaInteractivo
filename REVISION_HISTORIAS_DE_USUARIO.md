# Revisión de 20 Historias de Usuario — UniMap

**Fecha:** 2026-10-20 (actualizado tras la sesión de correcciones)
**Alcance:** Verificación e implementación de HU-01 a HU-20 (backlog en `backend/docs/product backlog resumido.txt`) en **frontend** (`frontend/`, `index.html`) y **backend** (Laravel en `backend/`).

## Resumen ejecutivo

| Estado | Cantidad | HU |
|---|---|---|
| Implementadas en ambos lados (con observaciones) | 17 | HU-01, 02, 03, 05, 06, 07, 08, 09, 11, 12, 14, 15, 16, 17, 18, 19, 20 |
| Parciales | 2 | HU-10 (ruta), HU-13 (notificaciones — limitación del medio) |
| Solo frontend aplica | 1 | HU-04 (responsive) |

---

## Correcciones aplicadas (continuación de la sesión interrumpida)

1. **HU-17 — Confirmación de registro exitoso** (criterio que faltaba):
   - `index.html`: nuevo bloque `#registro-exito` con `data-i18n="auth.registroExitoso"`.
   - `frontend/js/auth/auth.js`: tras registrar, se muestra la confirmación y **después de 1,6 s** se inicia sesión y se entra al mapa (antes redirigía sin avisar).
   - `frontend/css/auth.css`: estilo `.auth-exito` con animación.
   - **Verificado en navegador:** mensaje visible "Registro exitoso. Iniciando sesion..." antes de la redirección ✔.
2. **HU-17 — Registro por administrador** (faltaba en el panel):
   - `frontend/admin.html`: nueva pestaña **Usuarios** con tabla (nombre, correo, rol, fecha de registro, acciones) y modal de alta/edición `#modal-usuario`.
   - `frontend/js/admin/admin.js`: `pintarUsuarios`, `abrirModalUsuario`, `guardarUsuario` con validaciones (nombre/apellido mín. 2, correo válido y **único**, contraseña mín. 6, contraseña opcional al editar), borrado con confirmación i18n y **protección de la cuenta propia** (botón deshabilitado + comprobación). Tabs genéricos (espacios/usuarios/estadisticas).
   - **Verificado en navegador:** alta ✔, correo duplicado ("Este correo ya esta registrado") ✔, edición conservando contraseña ✔, borrado ✔, botón de borrar la cuenta propia deshabilitado ✔.
3. **HU-15 — Textos sin traducir** (completado):
   - `frontend/mapa.html`: `data-i18n-title` en conmutador 2D/3D, controles de zoom, controles de cámara y rotación; `data-i18n` en la leyenda (Entrada/Estacionamiento) y en los textos estáticos del cargador 3D.
   - `frontend/js/admin/admin.js`: mensajes de validación ("Min. 2 caracteres", "Requerido", "0 - 8") ahora usan `t('adm.errMin2'|'adm.errRequerido'|'adm.errPiso')`.
   - `frontend/js/view3d/viewer3d.js`: textos de carga ("Cargando campus…", "Descargando …", rotación automática) por i18n + listener `idioma:cambiado` que rehace el botón "Modelo: …".
   - Nuevas claves i18n ES/EN: `top.*` (vista/zoom/cámara), `ley.entrada`, `ley.estacionamiento`, `v3.*`, `adm.err*`, `adm.user*`, `auth.registroExitoso`.
   - **Verificado en navegador:** leyenda "E Entrance / P Parking", "Zoom in", "3D view", "Reset camera" en EN y vuelta a ES ✔; pestañas "Spaces/Users/Statistics" ✔; ficha dinámica (Tower/Floor/Open/Add to favorites) ✔; pantalla de acceso ✔.
4. **HU-17 (tipo de columna) y HU-14 (distribución)** — bugs detectados durante la prueba:
   - `frontend/js/admin/admin.js`: la columna "Tipo" mostraba el valor crudo (`biblioteca`); ahora usa las claves i18n `tipo.*`.
   - `frontend/js/core/estadisticas.js`: `porTipo()` excluía la infraestructura solo si `map/filtros.js` estaba cargado (no lo está en `admin.html`) → la distribución incluía pasillos/sanitarios. Ahora usa la lista `TIPOS_INFRAESTRUCTURA` como fallback local.
   - **Verificado:** distribución = Aulas 45 + Oficinas 33 + Laboratorios 28 + Salones 14 + Biblioteca 5 + Comedor 2 + Auditorios 1 = **128** = total de espacios ✔.
5. **Endpoints fantasma corregidos** (el frontend apuntaba a rutas inexistentes):
   - `frontend/js/core/avisos.js`: `GET /avisos` → **`GET /notificaciones`** (ruta real del backend).
   - `frontend/js/core/estadisticas.js`: `POST /estadisticas` → **`POST /eventos-consulta`** con el payload real (`idEspacio` numérico + `tipoEvento: 'consulta'`); si el id no es numérico (caso del demo local) se omite sin errores.
6. **Sintaxis:** los 6 JS modificados pasan `node --check`.

---

## Verificación funcional ejecutada en navegador (sesión actual)

Página | Comprobación | Resultado
---|---|---
index.html | Carga sin errores de consola | ✔
index.html | Registro completo (HU-17) + confirmación + sesión + redirección | ✔
index.html | Login con credenciales incorrectas → "Correo o contrasena incorrectos" (HU-16) | ✔
index.html | Login admin correcto → mapa (HU-16) | ✔
index.html | i18n ES↔EN de la pantalla de acceso (HU-15) | ✔
mapa.html | Carga: 170 espacios, canvas, 0 errores de consola (HU-01) | ✔
mapa.html | Búsqueda "biblio" con resultados mientras se escribe y apertura de ficha (HU-05) | ✔
mapa.html | Ficha con torre/piso/capacidad/contacto/horario + estado "Abierto" (HU-03, HU-09) | ✔
mapa.html | Favorito guardado por usuario + panel (HU-12) | ✔
mapa.html | Ruta trazada (55 m) con origen/dibujo (HU-10, alcance demo) | ✔
mapa.html | QR generado (36.416 píxeles) + enlace + deep link `?espacio=ID` abre la ficha (HU-11) | ✔
mapa.html | Filtro de laboratorios por subtipo: al quedarse solo "química" aparece únicamente "Lab. Química" en su piso (HU-19) | ✔
mapa.html | Filtros por tipo/torre/piso/disponibilidad (HU-02) | ✔
mapa.html | Panel de servicios agrupado por piso con nombre y tipo (HU-07) | ✔
mapa.html | Entrada principal y 2 estacionamientos en PB (HU-08) | ✔
mapa.html | Búsqueda "Aula 101" → selección y centrado (HU-18) | ✔
mapa.html | Panel de notificaciones con contador y aviso "El horario de Biblioteca cambio…" (HU-13) | ✔ |
mapa.html | Panel "Para ti" con petición de perfil (HU-20; el rol docente no tiene carrera) | ✔
mapa.html | Estadísticas registradas al abrir fichas (HU-14) | ✔
mapa.html | Invitado: botón de favorito oculto (HU-12 requiere sesión) | ✔
mapa.html | Vista 3D abre sin errores, botón "Modelo: Campus (ambas torres)" | ✔
admin.html | Rol docente → "sin permisos" (HU-06) | ✔
admin.html | CRUD de espacios: editar horario → "Cambios guardados" + aviso generado (HU-06, HU-13) | ✔
admin.html | Pestaña Usuarios con alta/edición/borrado (HU-17) | ✔
admin.html | Estadísticas: total, consultas, ranking "Mas consultados", distribución por tipo (HU-14) | ✔
admin.html | i18n completo incluida la nueva pestaña (HU-15) | ✔

---

## Hallazgos transversales pendientes (no bloqueantes)

1. **El frontend no consume el API del backend** (por diseño actual): `frontend/js/core/store.js` mantiene `UniMap.config.activa = false`; todo funciona con `frontend/js/data/*` + `localStorage` (comportamiento del modo `INICIAR.bat`). El backend tiene 35 endpoints funcionales y 2 rutas sincronizadas ahora apuntan a endpoints reales (`/notificaciones`, `/eventos-consulta`), listas para activarse. Credenciales divergentes: frontend `admin@uni.edu/123456` vs backend `admin@univalle.edu.bo/Admin12345`.
2. **HU-10 (backend):** la ruta peatonal real necesita la tabla `viasCampus` (pgRouting), que **no se crea en ninguna migración/seeder** → sin carga desde QGIS responde `tipoRuta: "lineaRecta"`. En frontend el origen GPS se coloca sobre el pasillo del plano (plano no georreferenciado).
3. **HU-13 (backend):** notificaciones solo en base de datos (sin correo/push) y solo vía `PUT` admin; sin observers.
4. **Pruebas automatizadas:** sigue sin haber PHPUnit real (solo `ExampleTest`) ni tests de frontend. En esta máquina **no hay PHP instalado** y las migraciones usan PostGIS (incompatibles con el `sqlite :memory:` de `phpunit.xml`), por lo que ejecutarlas requiere un PostgreSQL de prueba o guardar las migraciones PostGIS. Se mantiene como pendiente documentada.
5. **HU-11:** el escáner de cámara depende de `BarcodeDetector` (Chrome/Android); existe alternativa de pegar el enlace. El QR es por espacio, no por edificio.
6. **HU-04:** responsive verificado estáticamente (media queries 1100/900/768/520 px + pointer events); sin prueba en dispositivo físico.

## Estado por HU (detalle histórico)

| HU | Frontend | Backend | Observaciones |
|---|---|---|---|
| HU-01 Mapa interactivo | ✅ | ✅ | Canvas propio (sin Leaflet/Mapbox: tarea no hecha) |
| HU-02 Filtro por categoría | ✅ | ✅ | OK |
| HU-03 Ficha de oficina | ✅ | ✅ | OK |
| HU-04 Móvil/responsive | ✅ | N/A | Sin prueba en dispositivo real |
| HU-05 Búsqueda | ✅ | ✅ | Backend `/api/busqueda` sin consumir |
| HU-06 CRUD admin | ✅ | ✅ | Permisos cliente (modo demo); backend con middleware `rol` |
| HU-07 Servicios por edificio | ✅ | ✅ | OK |
| HU-08 Entrada/estacionamientos | ✅ | ✅ | Leyenda ya traducida |
| HU-09 Abierto/cerrado | ✅ | ✅ | OK |
| HU-10 Ruta | ⚠️ | ⚠️ | Heurística de pasillo + `viasCampus` ausente en backend |
| HU-11 QR | ✅ | ✅ | Cámara según navegador; QR por espacio |
| HU-12 Favoritos | ✅ | ✅ | Backend `/api/favoritos` listo para activarse |
| HU-13 Notificaciones | ✅ | ⚠️ | In-app local (verificado); backend sin canal externo |
| HU-14 Estadísticas | ✅ | ✅ | Distribución corregida; agregación global pendiente de API |
| HU-15 Idioma | ✅ | ✅ | **Textos faltantes completados** |
| HU-16 Login | ✅ | ✅ | Frontend demo en localStorage; backend Sanctum listo |
| HU-17 Registro | ✅ | ✅ | **Confirmación + gestión admin completadas** |
| HU-18 Aulas | ✅ | ✅ | OK |
| HU-19 Filtro laboratorio | ✅ | ✅ | OK |
| HU-20 Sugerencias | ✅ | ✅ | Reglas locales vs API real sin consumir |

## Recomendaciones siguientes

1. Activar `UniMap.config.activa` y crear `frontend/js/core/api.js` para conectar login/registro/favoritos/notificaciones/estadísticas/sugerencias con Laravel.
2. Crear migración+seeder de `viasCampus` (HU-10) o declarar oficialmente `lineaRecta`.
3. Añadir PHPUnit con base Postgres de prueba y una suite mínima de frontend.
4. Notificaciones push/email (HU-13) y agregación global de estadísticas.
