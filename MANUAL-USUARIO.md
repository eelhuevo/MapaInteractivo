# Manual de usuario — UniMap (Mapa Interactivo de Campus)

> Versión 1.1 · Mapa interactivo de campus con **vista 2D en plano** y **visor 3D**.
> Rama de entrega: [`beta`](https://github.com/eelhuevo/MapaInteractivo/tree/beta).

Este manual explica, paso a paso, cómo usar la aplicación. No es un manual técnico:
no hace falta saber programar.

![Pantalla de acceso de UniMap](docs/capturas/01-acceso.png)

---

## 1. ¿Qué es UniMap?

UniMap es el mapa del campus universitario. Permite:

- Ver el **plano de cada piso** (Planta Baja, Piso 1, Piso 2, Piso 3) en 2D.
- Ver el **edificio en 3D** y recorrerlo con la cámara.
- **Filtrar** los espacios por tipo, disponibilidad y piso.
- **Buscar** un aula, una oficina o un docente por su nombre.
- Consultar los **horarios** de los docentes y saltar a su aula.
- Guardar **favoritos** para llegar rápido a los espacios que más usas.

### Novedades de esta versión

| Novedad | Dónde se nota |
|---|---|
| El buscador **ignora tildes y mayúsculas** y **resalta** lo encontrado | Sección 8 |
| Se puede recorrer el buscador con las **flechas del teclado** | Sección 8 |
| La ficha del espacio es una **tarjeta flotante** que se cierra con `Escape` | Sección 6.3 |
| El campus **recuerda** el piso, la vista y los filtros de la última vez | Sección 12 |
| La interfaz se **adapta** a celular, tablet, pantalla ancha e impresión | Sección 13 |
| El correo se **normaliza** al entrar o registrarse | Sección 4.4 |
| Los modelos 3D llevan **metadatos** con su origen | Sección 11.5 |

---

## 2. Requisitos

| Requisito | Detalle |
|---|---|
| Navegador | Google Chrome, Edge o Firefox (versión reciente) |
| Python 3 | **Solo para la vista 3D**. Se instala desde <https://www.python.org> marcando *"Add Python to PATH"* |
| Sistema | Windows, macOS o Linux con un navegador moderno |
| Memoria | Suficiente para cargar los modelos 3D (recomendado 4 GB libres) |

> La vista 2D, los filtros, el buscador, los horarios y los favoritos funcionan
> **sin instalar nada**. La vista 3D necesita el servidor local.

---

## 3. Poner en marcha la aplicación

### Opción A — Con la vista 3D (recomendada)

1. Copia la carpeta del proyecto completa (el repositorio clonado) a tu disco.
2. Haz **doble clic en `INICIAR.bat`**.
3. Se abre una ventana negra con el servidor y, automáticamente, tu navegador en
   `http://localhost:8080`.
4. **No cierres esa ventana negra** mientras uses la aplicación: es el servidor.
5. Para detenerlo, cierra esa ventana.

Si Python no está instalado, el `.bat` te avisa y te ofrece la opción B.

### Opción B — Solo la vista 2D

Abre `index.html` con doble clic. Todo funciona salvo la vista 3D, porque el
navegador bloquea la descarga de los modelos por seguridad (política CORS).

---

## 4. Entrar a la aplicación

Al abrir la aplicación aparece la **pantalla de acceso** con tres opciones.

### 4.1 Cuenta de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@uni.edu` | `123456` | Administrador |

Escribe el correo y la contraseña, pulsa **Entrar** y accede al mapa.

### 4.2 Crear tu propia cuenta

1. Pulsa **Registrate** (abajo en el formulario de acceso).
2. Completa: **Nombre**, **Apellido**, **Correo electrónico**, **Rol** y **Contraseña**.
3. La contraseña debe tener **mínimo 6 caracteres**; debajo aparece una barra que
   indica si es débil o fuerte.
4. Repite la contraseña en **Confirmar contraseña**.
5. Pulsa **Crear Cuenta**.

> El botón **Mostrar** sirve para ver la contraseña mientras la escribes.

### 4.3 Entrar como invitado

Pulsa **Entrar como Invitado** para probar la aplicación sin cuenta.
Como invitado **no aparecen los favoritos** (el botón de la barra superior se oculta).

### 4.4 El correo se normaliza

El correo se guarda siempre en **minúsculas** y sin espacios, así que
`Ana.Perez@Campus.EDU` y `ana.perez@campus.edu` son **la misma cuenta**: no se
pueden crear dos cuentas que en realidad son la misma.

### 4.5 Sesión recordada y cierre de sesión

- Si ya habías iniciado sesión, la aplicación **entra directo al mapa**.
- El botón **Salir** (arriba a la derecha) cierra la sesión y vuelve al acceso.

---

## 5. La barra superior

De izquierda a derecha:

| Elemento | Para qué sirve |
|---|---|
| **Campo de búsqueda** | Escribe `Buscar aula, oficina, docente...` y pulsa la lupa o `Enter` |
| **2D / 3D** | Conmuta entre el plano y el visor tridimensional. El botón activo queda resaltado |
| **Filtros** | Abre el panel lateral de filtros |
| **Horarios** | Abre el panel de horarios de docentes |
| **Favoritos** | Abre tu lista de favoritos (no visible para invitados) |
| **Nombre + rol** | Muestra con qué cuenta entraste |
| **Salir** | Cierra la sesión |

---

## 6. La vista 2D (el plano)

![Vista 2D del campus con los botones de piso](docs/capturas/02-mapa-2d.png)

### 6.1 Cambiar de piso

En la parte superior del mapa están los botones de piso:

```
PB    P1    P2    P3
```

- **PB** = Planta Baja, **P1/P2/P3** = Pisos 1, 2 y 3.
- El piso activo aparece resaltado.
- Si un piso está **desactivado en los filtros**, su botón queda apagado y no se
  puede entrar a ese piso.

Debajo del mapa, a la izquierda, se indica el **piso actual** y, a la derecha, el
**nivel de zoom** (por ejemplo `100%`).

### 6.2 Mover y ampliar el plano

| Acción | Cómo |
|---|---|
| Zoom | Botones **`+`** y **`-`** de la esquina inferior derecha, o la rueda del ratón |
| Restablecer la vista | Botón ⟲ (tercero de la esquina inferior derecha) |
| Desplazar | Arrastra con el ratón, con un dedo o con el lápiz |
| Zoom táctil | Pellizca con dos dedos |

### 6.3 Ver la ficha de un espacio

La ficha es una **tarjeta flotante** que aparece sobre el mapa:

- **Ratón:** pasa el cursor sobre el espacio → aparece una etiqueta con su nombre.
- **Clic o toque** sobre el espacio (sin arrastrar) → se abre la **ficha completa**.

La ficha muestra:

- **Nombre** del espacio y su **estado** (Disponible / No disponible).
- **Tipo** (aula, laboratorio, oficina…).
- **Información**: planta, descripción y características.
- **Horario** de atención.
- **Docente** asignado y su horario.
- Botón de **favorito** (solo si no entraste como invitado).

![Ficha flotante de un espacio](docs/capturas/04-ficha-espacio.png)

> Arrastrar el mapa **no** abre fichas: solo un clic o toque sin desplazamiento.

> La ficha se cierra sola al pulsar `Escape`, al hacer clic fuera de ella o al
> cambiar de piso. Para los lectores de pantalla se anuncia como
> `role="tooltip"`: cuando está cerrada se marca con `aria-hidden="true"`, de modo
> que no se lee por error.

### 6.4 La leyenda "Usted aquí"

En el mapa 2D aparece un punto que marca tu posición. **En la vista 3D se oculta**,
porque ese marcador no existe en el modelo tridimensional.

---

## 7. Los filtros

Pulsa **Filtros** en la barra superior para abrir el panel. Contiene tres bloques:

![Panel de filtros](docs/capturas/05-filtros.png)

### 7.1 Tipo de espacio (puedes activar varios)

- Aulas
- Laboratorios
- Oficinas
- Biblioteca
- Auditorios
- Comedor
- Deportivo
- Salones

### 7.2 Disponibilidad

- **Disponibles**
- **No disponibles**

### 7.3 Piso

- Planta Baja
- Piso 1
- Piso 2
- Piso 3

### 7.4 Aplicar y restablecer

| Botón | Qué hace |
|---|---|
| **Aplicar Filtros** | Aplica lo que tengas marcado |
| **Restablecer** | Vuelve a los valores iniciales (todo activado) |

**Reglas importantes:**

- Si desmarcas todos los pisos, la aplicación **rechaza** la operación y avisa.
- Si el piso en el que estás queda oculto, la aplicación **salta** al primer piso
  permitido.
- Si intentas entrar a un espacio de un piso oculto (desde búsqueda, horarios o
  favoritos), aparece un **aviso** en lugar de navegar.
- Los espacios sin filtro (jardín, estacionamiento, sanitarios) se dibujan siempre,
  no abren ficha y no aparecen en los marcadores 3D.

---

## 8. El buscador

![Buscador con los resultados resaltados](docs/capturas/03-buscador.png)

1. Escribe en el campo de la barra superior: un aula, una oficina, un docente o un
   departamento.
2. Pulsa la lupa, `Enter` o haz clic en un resultado.

**Qué puedes buscar:** nombre del espacio, tipo de espacio, nombre del docente o
departamento.

### 8.1 No importan las tildes ni las mayúsculas

El buscador **normaliza** lo que escribes: `aula`, `Aula`, `ÁULA` y `aúlа` buscan
exactamente lo mismo. Solo hay que escribir una parte del nombre.

### 8.2 Los resultados se resaltan

La parte que coincide con tu búsqueda aparece **resaltada en amarillo** dentro del
resultado, para que veas de un vistazo por qué aparece.

### 8.3 Se puede recorrer con el teclado

| Tecla | Qué hace |
|---|---|
| `↓` | Baja al siguiente resultado y lo deja resaltado |
| `↑` | Sube al resultado anterior |
| `Enter` | Abre el resultado resaltado (o el primero, si no hay ninguno resaltado) |
| `Escape` | Cierra la lista de resultados |

### 8.4 Al elegir un resultado

- El mapa se centra en ese espacio.
- Se abre su ficha.
- Si estás en 3D, la cámara se enfoca sobre el espacio.

---

## 9. Los horarios de docentes

![Panel de horarios de docentes](docs/capturas/06-horarios.png)

1. Pulsa **Horarios** en la barra superior.
2. En el panel puedes buscar por nombre del docente (campo *Buscar docente...*).
3. Cada docente muestra su **rejilla de días y horas**.

Al pulsar sobre un bloque horario de un docente, la aplicación **te lleva a su aula**,
centrándose en el mapa y abriendo la ficha del espacio.

---

## 10. Los favoritos

1. Abre la ficha de cualquier espacio (clic sobre el espacio en 2D o sobre su
   marcador en 3D).
2. Pulsa el botón de favorito dentro de la ficha.
3. El icono se marca como seleccionado.

Para ver tu lista, pulsa **Favoritos** en la barra superior. Desde ahí puedes:

- Ver todos tus espacios guardados.
- Centrarte en cualquiera de ellos (la cámara se mueve sola en 3D).
- Quitarlo de la lista.

**Notas:**

- Los favoritos se guardan **por usuario**: cada persona tiene los suyos.
- Se conservan en el navegador (`localStorage`), incluso si cierras la aplicación.
- Si entraste **como invitado**, el botón de favoritos **no aparece**: los invitados
  no tienen favoritos.

---

## 11. La vista 3D

Pulsa **3D** en la barra superior. La primera carga tarda unos segundos porque se
descarga el modelo (la barra de progreso indica el avance).

![Visor 3D del modelo del edificio](docs/capturas/07-vista-3d.png)

### 11.1 Cambiar de modelo

El botón **"Modelo: Edificio"** (esquina superior izquierda del visor) abre la lista
de modelos disponibles:

| Modelo | Formato | Tarea |
|---|---|---|
| Edificio | GLB | #39 |
| Habitacion | GLB | #41 |
| Oficinas | GLB | #40 |
| Planta Baja Torre B | FBX | #42 |

### 11.2 Controles de cámara

| Botón | Qué hace |
|---|---|
| ⟲ (Restablecer cámara) | Devuelve la cámara a su posición inicial |
| Rotación automática | Activa o desactiva el giro solo de la cámara |

Además, con el ratón o el dedo: **arrastrar** gira la cámara, **rueda o pellizca**
acerca y aleja, **clic derecho** desplaza.

### 11.3 Los marcadores 3D

Sobre el modelo aparecen **marcadores** con la posición de cada espacio:

- Muestran el **estado** (disponible o no).
- Los **favoritos** aparecen destacados.
- **Respetan los filtros y el piso activo**: si filtras, desaparecen.
- Al pulsarlos se abre la **misma ficha** que en la vista 2D.

### 11.4 Avisos

Si algo falla (por ejemplo, abriste la aplicación con doble clic en `index.html` y
el navegador bloquea la descarga), el visor muestra un **aviso** en pantalla con la
solución. La causa más común es que la vista 3D se haya abierto desde `file://`:
cierra esa pestaña y entra por `http://localhost:8080`.

### 11.5 Los modelos llevan metadatos

Cada archivo `.glb` / `.fbx` guarda dentro del propio modelo dos datos de
procedencia (`unimap_modelo` y `unimap_tarea`): **el nombre del modelo** y **el
número de la tarea** del equipo que lo modeló. Sirve para saber, sin adivinar,
de qué tarea salió cada archivo y quién lo modeló.

---

## 12. Lo que el campus recuerda

La aplicación guarda en el navegador (`localStorage`, clave `unimap_preferencias`)
tres cosas de tu última visita:

| Se recuerda | Efecto al volver a abrir |
|---|---|
| **El piso** | El campus se abre en el mismo piso en el que estabas |
| **La vista** | Si te quedaste en 3D, se abre en 3D |
| **Los filtros** | Se mantienen los tipos de espacio y la disponibilidad que tenías marcados |

Para empezar de cero, abre **Filtros → Restablecer** y vuelve a un piso.

---

## 13. La interfaz se adapta a tu pantalla

| Tamaño de pantalla | Qué cambia |
|---|---|
| **≥ 1600 px** (pantalla ancha) | Los paneles se ensanchan (340 px), la leyenda y la ficha flotante crecen |
| **≤ 1100 px** | Los botones **2D / 3D** se estrechan para dejar más sitio a la barra |
| **≤ 1024 px** (tablet horizontal) | Paneles a 280 px, leyenda e información del mapa más pequeñas |
| **≤ 900 px** | La pantalla de acceso se simplifica: el formulario ocupa todo el ancho |
| **≤ 768 px** (tablet vertical) | La barra superior se compacta, se oculta el nombre de la app, los botones de piso y la ficha flotante se encogen y los marcadores 3D dejan de mostrar el texto |
| **≤ 520 px** | El buscador usa todo el ancho y se oculta el nombre del usuario |
| **≤ 480 px** (celular) | Se oculta la leyenda, los botones de piso se encogen y las ventanas se ajustan al 96 % del ancho |
| **Celular en horizontal** (alto ≤ 480 px) | Barra y botones más pequeños, y la ficha flotante se vuelve desplazable |
| **Impresión** | Se ocultan la barra, los paneles, el selector de piso, la leyenda y los controles 3D: solo se imprime el plano |

Además:

- **El foco siempre se ve**: al navegar con `Tab` se resalta el control en el que
  estás, con un borde de color.
- **Menos movimiento**: si en el sistema operativo pediste "reducir el movimiento",
  las animaciones se desactivan.
- El mapa se puede usar con **ratón, dedo o lápiz**.

---

## 14. Atajos de teclado

| Tecla | Acción |
|---|---|
| `Escape` | Cierra la ficha del espacio, los paneles (filtros, horarios, favoritos), los resultados de búsqueda y el selector de modelos |
| `Enter` | En el buscador, abre el resultado resaltado (o el primero) |
| `↑` / `↓` | En el buscador, recorren los resultados |
| `Tab` | Recorre los controles; el control enfocado queda resaltado |

---

## 15. Preguntas frecuentes

**No me carga el modelo 3D.**
Abre la aplicación con `INICIAR.bat` (es decir, en `http://localhost:8080`). Si la
abriste con doble clic en `index.html`, el navegador bloquea la descarga.

**No aparece el botón de Favoritos.**
Entraste como invitado. Los invitados no tienen favoritos; regístrate o entra con una
cuenta.

**El buscador no encuentra un aula.**
El buscador ignora tildes y mayúsculas, pero necesita **una parte** del nombre.
Prueba con el nombre del aula, el tipo ("aula") o el nombre del docente.

**¿Dónde se guardan mis datos?**
En el navegador de tu computadora (`localStorage`): usuarios, sesión, favoritos y
preferencias. No hay servidor central. Si borras los datos del navegador, se borran
también.

**¿Cambié de piso y desapareció mi espacio.**
Revisa el filtro de piso: si el piso está desmarcado, sus espacios se ocultan.

**¿Cómo vuelvo a ver todo?**
Abre **Filtros → Restablecer**.

**¿Cómo cierro la aplicación?**
Cierra la pestaña del navegador y, si usaste `INICIAR.bat`, cierra también la ventana
negra del servidor.

---

## 16. Glosario

| Término | Significado |
|---|---|
| **2D / 3D** | Las dos vistas del mapa: plano y modelo tridimensional |
| **Espacio** | Cualquier lugar del campus que aparece en el mapa (aula, oficina, laboratorio…) |
| **Marcador** | El ícono flotante que señala un espacio sobre el modelo 3D |
| **Ficha** | La tarjeta flotante con los datos de un espacio al hacer clic sobre él |
| **Panel** | La caja lateral de filtros, horarios o favoritos |
| **Vista 3D** | El visor con el modelo del edificio, las luces y la cámara orbital |
| **Preferencias** | El piso, la vista y los filtros que la aplicación recuerda entre visitas |

---

*¿Encontraste un error? Repórtalo como issue en el repositorio del proyecto:
<https://github.com/eelhuevo/MapaInteractivo/issues/new/choose>*
