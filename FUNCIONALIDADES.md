# Funcionalidades de la aplicación (UI / Usuario)

## 1. Objetivo de la app

**optiMapp** es una aplicación web (tipo PWA) para **planificar recorridos con múltiples paradas**.

Desde el punto de vista del usuario, permite:

- **Buscar direcciones** y agregarlas como paradas.
- **Usar tu ubicación actual (GPS)** como punto de inicio.
- **Reordenar paradas manualmente** (arrastrar y soltar).
- **Optimizar automáticamente** el orden del recorrido.
- **Visualizar el recorrido en un mapa**.
- **Exportar/compartir** el recorrido a Google Maps y por WhatsApp.
- **Personalizar el tema** (modo claro/oscuro y paleta de color).

---

## 2. Estructura general de la interfaz

La app se organiza en **dos vistas principales**:

- **Plan**: donde agregás y administrás las paradas y ejecutás la optimización/exportación.
- **Mapa**: donde se visualizan los puntos y el trazado del recorrido.

### 2.1 Encabezado (Header)

En la parte superior se muestra:

- **Nombre/identidad de la app**: `optiMapp`.
- **Subtítulo** con una guía de propósito: “Agrega paradas, reordena, optimiza y exporta a Google Maps / WhatsApp.”
- **Controles de tema** (paleta + modo claro/oscuro).

### 2.2 Navegación entre “Plan” y “Mapa”

- En pantallas chicas (móvil), hay una **barra de navegación inferior** con dos botones:
  - **Plan**
  - **Mapa**
- En pantallas grandes (desktop), ambas secciones pueden verse en paralelo (dependiendo del layout).

---

## 3. Vista “Plan”: búsqueda, agenda y gestión de paradas

La vista **Plan** está compuesta principalmente por:

- **Buscador de direcciones**.
- **Agenda** (lugares guardados).
- **Lista de paradas** con acciones (optimizar, limpiar, exportar, reordenar).

### 3.1 Buscar dirección

En la parte superior hay un **campo de texto** con placeholder “Buscar dirección”.

- **Qué hace**: permite escribir una dirección o referencia.
- **Cómo se usa**:
  - Escribís al menos **3 caracteres**.
  - Presionás **Enter** o el botón **Buscar**.
- **Resultados**:
  - Se muestra una **lista de coincidencias** debajo del buscador.
  - Cada resultado se puede:
    - **Agregar como parada** tocándolo/clickeándolo.
    - **Guardar en Agenda** (botón con ícono de “guardar”).

#### Estados y errores en la búsqueda

- **Buscando…**: el botón puede mostrar estado de carga mientras se consultan resultados.
- **Sin resultados**: si no hay coincidencias, simplemente no aparece listado.
- **Errores**: si el servicio de búsqueda falla, se muestra un mensaje de error en texto rojo.

### 3.2 Usar “Mi ubicación” (GPS)

Hay un botón **“Mi ubicación”**.

- **Qué hace**: intenta obtener tu ubicación actual (GPS del dispositivo/navegador) y la usa como **parada de inicio**.
- **Comportamiento esperado**:
  - Si el navegador pide permisos, debés aceptarlos.
  - Al obtener la ubicación, se agrega/actualiza una parada llamada **“Mi ubicación”** al comienzo del recorrido.

#### Estados y errores de geolocalización

- Si el navegador no soporta geolocalización: “Geolocalización no disponible en este navegador.”
- Si denegás el permiso: “Permiso de ubicación denegado. Habilítalo para usar el GPS.”
- Si falla la obtención por otros motivos: “No se pudo obtener la ubicación actual.”

### 3.3 Agenda (lugares guardados)

La app incluye una **Agenda** para guardar direcciones frecuentes con un nombre amigable (por ejemplo “Casa”, “Oficina”).

#### 3.3.1 Abrir Agenda

- Botón **Agenda** (ícono de marcador).
- Al abrirse, aparece un panel con:
  - **Título “Agenda”**.
  - Botón **Cerrar**.

#### 3.3.2 Guardar una dirección en Agenda

Podés guardar un lugar desde:

- **Un resultado de búsqueda** (botón “Guardar en agenda” en el resultado).
- **Una parada ya agregada** en la lista (botón “Guardar en agenda” en la fila de la parada).

Al guardar:

- Se muestra un formulario “Guardar dirección” con:
  - La dirección completa.
  - Un campo “Nombre (ej: Casa, Oficina)”.
  - Botón **Guardar**.

#### 3.3.3 Buscar dentro de Agenda

Cuando no estás guardando un nuevo lugar, la Agenda muestra un buscador “Buscar en agenda”.

- Filtra por:
  - **Nombre guardado**.
  - **Texto de la dirección**.

#### 3.3.4 Agregar una entrada de Agenda como parada

En la lista de Agenda, cada lugar tiene:

- Un botón principal (toda la fila) que **agrega ese lugar como una nueva parada**.

#### 3.3.5 Eliminar una entrada de Agenda

- Cada fila de la Agenda tiene un botón **Eliminar**.
- Al presionarlo, el lugar se borra de la Agenda.

#### Estado vacío de Agenda

Si no hay lugares guardados, se muestra:

- “Todavía no tenés lugares guardados.”

---

## 4. Lista de paradas (stops)

Debajo del módulo de entrada/búsqueda, la app muestra una **lista de paradas**.

### 4.1 Qué se ve en cada parada

Cada parada se presenta como una fila que incluye:

- Un **número de orden** (1, 2, 3…).
- Un **título**:
  - Si la parada coincide con un lugar guardado en Agenda, se muestra el **nombre de Agenda**.
  - Si no, se muestra una versión corta de la dirección.
- Coordenadas **lat/lng** de la parada.

### 4.2 Acciones por parada

En cada fila hay acciones:

- **Eliminar**: quita esa parada del recorrido.
- **Guardar en agenda**: permite asignarle un nombre y guardarla en Agenda.
- **Reordenar**: un “handle” para **arrastrar y reordenar** la parada.

### 4.3 Reordenamiento manual (drag & drop)

- Podés **arrastrar una parada** para moverla a otra posición.
- Cuando cambias el orden manualmente, el trazado calculado previamente (si existía) puede dejar de reflejar la optimización anterior, por lo que normalmente necesitás **optimizar nuevamente** si querés el mejor orden automático.

### 4.4 Estado vacío

Si no hay paradas cargadas se muestra:

- “Agrega direcciones para comenzar.”

---

## 5. Acciones principales sobre la ruta

Sobre la lista de paradas hay una barra de acciones con 4 botones.

### 5.1 Optimizar

- Botón: **Optimizar**.
- **Cuándo está habilitado**: cuando hay **al menos 3 paradas**.
- **Qué hace**:
  - Reordena automáticamente las paradas para proponer un recorrido “mejor” (más eficiente).
  - Genera/actualiza el trazado del recorrido para el mapa.

#### Estados y errores

- Mientras se ejecuta:
  - El botón puede indicar “Optimizando…”
  - Aparece un overlay: “Optimizando ruta…”
- Si falla, se muestra un mensaje de error (texto rojo). Ejemplos típicos:
  - Falta de configuración del servicio de optimización.
  - Límite de uso del proveedor (rate limit).

### 5.2 Limpiar

- Botón: **Limpiar**.
- **Qué hace**: borra todas las paradas y resetea el recorrido.

### 5.3 Navegar (Google Maps)

- Botón: **Navegar**.
- **Qué hace**: abre Google Maps con:
  - Origen: primera parada.
  - Destino: última parada.
  - Paradas intermedias: el resto.

Si no hay suficientes datos para armar un recorrido (por ejemplo, menos de 2 paradas), el botón aparece deshabilitado.

### 5.4 WhatsApp

- Botón: **WhatsApp**.
- **Qué hace**: abre WhatsApp (o WhatsApp Web) con un mensaje prearmado que incluye:
  - Un listado numerado de las paradas en el orden actual.
  - Un link a Google Maps (si aplica).

Si no hay paradas, el botón aparece deshabilitado.

---

## 6. Vista “Mapa”: visualización del recorrido

La vista **Mapa** permite ver gráficamente el recorrido.

### 6.1 Marcadores (pines) de paradas

- Se dibuja un marcador por cada parada.
- Hay una diferenciación visual típica:
  - **Inicio** (primera parada).
  - **Fin** (última parada).
  - Paradas intermedias numeradas.

### 6.2 Tooltips informativos

Al interactuar con un marcador (hover/tap), se muestra un tooltip:

- Inicio: “Inicio: …”
- Fin: “Fin: …”
- Intermedias: “N. …”

### 6.3 Línea de ruta (polilínea)

- Si ya optimizaste, se muestra una **línea** que representa el recorrido optimizado.
- Si no hay optimización previa, el mapa puede mostrar una línea uniendo las paradas en el orden actual (dependiendo del estado de la ruta).

### 6.4 Ajuste automático de vista

- El mapa intenta ajustarse para **encuadrar** las paradas cuando corresponde.

---

## 7. Personalización visual (Tema)

En el header hay controles para personalizar el aspecto:

### 7.1 Paleta de color

Un selector con opciones:

- Slate
- Emerald
- Rose
- Violet
- Blue

### 7.2 Modo claro / oscuro

Un botón alterna entre:

- **Modo oscuro**
- **Modo claro**

La selección de tema se conserva para la próxima vez que abras la app.

---

## 8. Persistencia de datos (lo que “recuerda” la app)

Desde el punto de vista del usuario:

- Las **paradas** y los **lugares en Agenda** se conservan entre sesiones en el mismo dispositivo/navegador.
- El **trazado** (línea de ruta) puede resetearse cuando se cambia el orden o se vuelven a cargar las paradas, para evitar mostrar una ruta desactualizada.

---

## 9. Requisitos y consideraciones (orientado a uso)

- Para que **Optimizar** funcione, la instancia de la app debe estar configurada con acceso a un servicio de optimización.
- Si el proveedor alcanza un **límite de uso**, la app puede mostrar un error indicando que se excedió el rate limit y que hay que esperar.

---

## 10. Resumen de flujos típicos

### 10.1 Flujo “rápido”

1. Abrís la app.
2. Buscás una dirección y la agregás como parada.
3. Repetís para todas las paradas.
4. Tocás **Optimizar**.
5. Tocás **Navegar** para abrir Google Maps o **WhatsApp** para compartir.

### 10.2 Flujo con Agenda

1. Buscás una dirección.
2. La guardás en **Agenda** con un nombre.
3. Más adelante, abrís **Agenda** y la agregás como parada con un toque.

### 10.3 Flujo con GPS

1. Tocás **Mi ubicación**.
2. Aceptás permisos.
3. La app define el inicio como “Mi ubicación” y seguís agregando el resto de paradas.
