# optiMapp

Aplicación web (PWA) para **planificar y optimizar recorridos**: agregás paradas (direcciones o GPS), las reordenás manualmente si querés, pedís una optimización automática y **exportás el resultado** a Google Maps y/o WhatsApp.

## Stack

- **Next.js (App Router)**
- **React**
- **Zustand** (persistencia de paradas en `localStorage`)
- **Leaflet + React Leaflet** (mapa y visualización de ruta)
- **@dnd-kit** (drag & drop de paradas)
- **OR-Tools + Python** (optimización del orden y restricciones horarias)
- **Google Routes** (matriz de tiempos por calles y trazado)
- **OSRM** (alternativa local de matriz y trazado para el piloto de Mar del Plata, sin tráfico en vivo)
- **GraphHopper** (geocoding opcional)
- **Nominatim** (geocoding por defecto)

## Requisitos

- Node.js (recomendado: versión moderna compatible con Next.js 16)
- `pnpm` (recomendado, porque el repo incluye `pnpm-lock.yaml`)
- Python 3 con las dependencias de `requirements.txt` para ejecutar el solver localmente
- API Key de **Google Routes**, con acceso a `computeRouteMatrix` y `computeRoutes`, si usás el proveedor predeterminado

## Variables de entorno

Creá un archivo `.env.local` (no se commitea) en la raíz:

```bash
GOOGLE_ROUTES_API_KEY=tu_key
# opcional: "google" (default) u "osrm"
ROUTING_PROVIDER=google
# obligatorio únicamente con ROUTING_PROVIDER=osrm
OSRM_BASE_URL=http://127.0.0.1:5001
# opcional: "nominatim" (default) o "graphhopper"
GEOCODER_PROVIDER=nominatim
# solo si usás el geocoder de GraphHopper
GRAPHHOPPER_API_KEY=tu_key
# opcional: ejecutable Python del entorno con OR-Tools instalado
PYTHON_BIN=/ruta/absoluta/al/venv/bin/python
```

Notas:

- `GOOGLE_ROUTES_API_KEY` es **obligatoria** con `ROUTING_PROVIDER=google`. El proveedor `osrm` no la requiere ni consulta Google como fallback.
- `PYTHON_BIN` usa `python3` por defecto. En Vercel, la app llama al endpoint Python `/api/solve_ortools` en lugar de ejecutar un proceso local.
- `OSRM_BASE_URL` identifica el motor de matriz y trazado; no cambia el proveedor de búsqueda de direcciones.
- Si `GEOCODER_PROVIDER=graphhopper`, `GET /api/geocode` también usa GraphHopper y requiere `GRAPHHOPPER_API_KEY`.
- Si `GEOCODER_PROVIDER=nominatim`, se usa Nominatim con un sesgo/bounding-box hacia **Mar del Plata (AR)**.

## Instalación

```bash
pnpm install
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

Si usás ese entorno virtual, configurá `PYTHON_BIN` con la ruta absoluta de `.venv/bin/python`.

## Ejecutar en desarrollo

```bash
pnpm dev
```

Abrí:

- [http://localhost:3000](http://localhost:3000)

## Scripts

- **`pnpm dev`**: servidor de desarrollo.
- **`pnpm build`**: build de producción.
- **`pnpm start`**: ejecutar el build.
- **`pnpm lint`**: correr ESLint.

## Piloto local sin Google Routes

Con Docker en funcionamiento y Python 3.11 o posterior:

```bash
bash scripts/osrm-local.sh prepare
bash scripts/osrm-local.sh start
bash scripts/osrm-local.sh app
```

Abrí [http://127.0.0.1:3101](http://127.0.0.1:3101). La configuración del piloto se aplica solo a ese proceso, usa un entorno Python propio y una carpeta de compilación separada. No modifica `.env.local`.

Para ejecutar las comprobaciones, ver [la guía del piloto y sus resultados](docs/planificacion/piloto-osrm-local.md).

## Funcionalidades

- **Búsqueda de direcciones** (autocompletado) vía `GET /api/geocode`.
- **Lista de paradas** con drag & drop.
- **Optimización del orden** vía `POST /api/optimize` (OR-Tools con tiempos del proveedor elegido).
- **Horarios**: salida opcional, llegada antes/después de una hora y tiempo de atención uniforme por parada.
- **Proveedor del resultado**: después de optimizar se muestra «OSRM propio» o «Google Routes API», según la respuesta del servidor. El dato se borra al cambiar paradas u horarios; las rutas guardadas sin ese metadato muestran «Proveedor de esta ruta no registrado».
- **Mapa** con marcadores + polilínea de la ruta (render client-only).
- **Exportación** a Google Maps y armado de texto para WhatsApp.

## Endpoints (API)

### `GET /api/geocode?q=...`

- **Input**:
  - `q` (string): texto a geocodificar (mínimo 3 caracteres).
- **Output**:
  - `{ results: Array<{ label: string; lat: number; lng: number }> }`
- **Proveedores**:
  - `GEOCODER_PROVIDER=nominatim` (default)
  - `GEOCODER_PROVIDER=graphhopper`

### `POST /api/optimize`

- **Requiere**: el proveedor configurado (`google` u `osrm`) y el solver Python con OR-Tools disponible.
- **Body**:

```json
{
  "stops": [
    {
      "id": "...",
      "label": "...",
      "position": { "lat": -38.0, "lng": -57.5 },
      "kind": "gps"
    }
  ],
  "startTime": "09:00",
  "serviceTimeMinutes": 5
}
```

- **Reglas**:
  - Se necesitan entre **3 y 25 puntos totales**, incluido el origen. El máximo proviene del control de 625 elementos de la matriz completa.
  - Un solo vehículo; la primera parada es el origen fijo.
  - El destino final es libre: no se fija la última parada de entrada ni se exige volver al origen.
  - Cada parada puede incluir `timeRestriction` (`HH:mm`) y `timeRestrictionType` (`before` o `after`; por defecto `before`).
  - `startTime` es opcional (`HH:mm`); `serviceTimeMinutes` es opcional y vale cero por defecto. El tiempo de atención se aplica a las visitas, excluyendo el origen.
  - El solver trabaja en un horizonte de 24 horas, permite hasta una hora de espera por parada y busca durante un máximo de cinco segundos, sin garantizar el óptimo global.
  - Cualquier orden de visita es admisible si cumple los horarios; no se impone orden de vencimiento.
- **Output**:
  - `{ routingProvider: "google" | "osrm"; orderedStopIds: string[]; routeLine: Array<{ lat: number; lng: number }>; latestDepartureTime: string | null; legDurationsSeconds: number[] }`
  - `latestDepartureTime` es una sugerencia calculada a partir de las llegadas cuando no se indicó salida; puede ser `null`.
- **Notas**:
  - Google aporta tiempos con `TRAFFIC_AWARE`; OSRM aporta estimaciones sin tráfico en vivo. OR-Tools decide el orden en ambos casos.
  - Devuelve `422` cuando el solver no encuentra una solución para las restricciones.
  - Con Google, la geometría se obtiene de `computeRoutes`. Si falla o no es utilizable, la respuesta conecta las paradas con segmentos rectos, sin representar el camino por calles.
  - Con OSRM, un fallo de matriz o trazado devuelve un error explícito; no se consulta Google ni se inventa una geometría. Si todas las paradas coinciden, el trazado puede contener un único punto y los tiempos de traslado ser cero.
  - El piloto OSRM limita los puntos al rectángulo de latitudes `[-38.2, -37.9]` y longitudes `[-58.15, -57.45]`, y exige una calle a menos de 200 metros.

## Arquitectura (alto nivel)

- **UI**: `src/app/ClientPage.tsx`
  - Layout con dos vistas: **Plan** y **Mapa**.
  - El mapa se carga con `dynamic(..., { ssr: false })` para evitar SSR de Leaflet.
- **Estado**: `src/lib/routeStore.ts`
  - `stops`: paradas actuales.
  - `routeLine`: polilínea actual.
  - Persistencia parcial (`stops`) en `localStorage`.
  - Cada cambio de orden/paradas limpia `routeLine` para evitar inconsistencias.
- **API routes**: `src/app/api/*`
  - `geocode`: Nominatim o GraphHopper.
  - `optimize`: matriz del proveedor elegido → OR-Tools → trazado del mismo proveedor.
- **Adaptador OSRM**: `src/lib/osrm.ts` valida cobertura, tiempos y geometría, con timeout de diez segundos por consulta.
- **Solver**: `scripts/optimize_ortools.py` para ejecución local y `api/solve_ortools.py` para Vercel. Las dos implementaciones deben mantenerse alineadas.
  - Localmente se ejecuta sin bloquear Node, con timeout del proceso de treinta segundos.

## Troubleshooting

- **`Missing GOOGLE_ROUTES_API_KEY`**
  - Definí la variable en `.env.local` y reiniciá el servidor (`pnpm dev`).
- **No se puede ejecutar Python o falta OR-Tools**
  - Instalá `requirements.txt` en el entorno seleccionado y revisá `PYTHON_BIN`.
- **`Missing GRAPHHOPPER_API_KEY`**
  - Solo aplica si elegiste GraphHopper para buscar direcciones; configurá su clave o usá Nominatim.
- **Error `429` de GraphHopper**
  - Estás en rate limit. Esperá un poco o usá un plan con más cuota.
- **El mapa no aparece / errores de `window`**
  - El mapa es client-only. Verificá que no se haya removido `ssr: false` del import dinámico.

## Notas de producto

Para ideas/roadmap del MVP ver `README-project.md`.

La [evaluación del reemplazo de Google Routes](docs/planificacion/reemplazo-google-routes.md) registra el alcance acordado. El piloto OSRM está implementado y probado localmente; Google sigue siendo el proveedor predeterminado y todavía no se cambió producción. `README-project.md` conserva la propuesta original del MVP y no describe la integración actual.
