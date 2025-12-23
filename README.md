## 1. Lógica del MVP (Producto Mínimo Viable)

Para que el producto sea funcional desde el día 1, el MVP se centrará en resolver el "núcleo" del problema: **Entrar direcciones -> Optimizar -> Navegar.**

### Módulos Principales:

1. **Módulo de Entrada:** Un input simple donde el usuario agrega paradas. Usaremos una API de geocodificación (como Photon o la de GraphHopper) para convertir texto en coordenadas .
2. **Módulo de Optimización (Cerebro):** Una función que envíe la lista de coordenadas a la API de **GraphHopper Route Optimization**. Esta devolverá el orden óptimo de los puntos.
3. **Módulo de Mapa:** Visualizar los puntos y la línea de ruta (polylines) usando **React Leaflet**.
4. **Módulo de Gestión:** Una lista debajo del mapa con _Drag & Drop_ para reordenar manualmente.
5. **Módulo de Acción:** Botón para disparar la ruta hacia Google Maps/Waze y el botón de compartir por WhatsApp.

---

## 2. Estructura del Sistema (Arquitectura)

---

## 3. Detalles de las Features Críticas

### Reordenamiento Manual (Drag & Drop)

Para el MVP, te recomiendo usar **`@dnd-kit/core`**. Es mucho más ligero que `react-beautiful-dnd` y funciona mejor con arquitecturas modernas de React. Permitirá que si la IA decide que el punto C va después del A, pero el usuario sabe que el cliente C cierra temprano, pueda moverlo al principio con el dedo.

### Integración GPS y WhatsApp

La lógica de exportación es más sencilla de lo que parece. No necesitas una API compleja, solo construir una URL:

- **Google Maps:** Se construye un string concatenando las coordenadas separadas por `|` (pipe).
- **WhatsApp:** Usas el protocolo `https://wa.me/?text=MENSAJE_CODIFICADO`.
  > _Tip:_ El mensaje debe incluir el orden: "1. Calle A, 2. Calle B... Link: [https://d-maps.com/](https://d-maps.com/)".

### ¿Qué necesitas para empezar a probar el código?

1. **API Key de GraphHopper:** Tienen un tier gratuito para desarrollo.
2. **Instalar dependencias:** `npm install leaflet react-leaflet @dnd-kit/core lucide-react`.

¿Te gustaría que profundicemos en el código de la función que conecta con la API de GraphHopper o prefieres que armemos primero el diseño de la interfaz en Tailwind?
