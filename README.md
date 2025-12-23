# optiMapp

Aplicación web (PWA) para **planificar y optimizar recorridos**: agregás paradas (direcciones o GPS), las reordenás manualmente si querés, pedís una optimización automática y **exportás el resultado** a Google Maps y/o WhatsApp.

## Stack

- **Next.js (App Router)**
- **React**
- **Zustand** (persistencia de paradas en `localStorage`)
- **Leaflet + React Leaflet** (mapa y visualización de ruta)
- **@dnd-kit** (drag & drop de paradas)
- **GraphHopper** (optimización VRP y opcionalmente geocoding)
- **Nominatim** (geocoding por defecto)

## Requisitos

- Node.js (recomendado: versión moderna compatible con Next.js 16)
- `pnpm` (recomendado, porque el repo incluye `pnpm-lock.yaml`)
- API Key de **GraphHopper** (obligatoria para optimizar)

## Variables de entorno

Creá un archivo `.env.local` (no se commitea) en la raíz:

```bash
GRAPHHOPPER_API_KEY=tu_key
# opcional: "nominatim" (default) o "graphhopper"
GEOCODER_PROVIDER=nominatim
```

Notas:

- `GRAPHHOPPER_API_KEY` es **obligatoria** para `POST /api/optimize`.
- Si `GEOCODER_PROVIDER=graphhopper`, `GET /api/geocode` también usa GraphHopper y requiere `GRAPHHOPPER_API_KEY`.
- Si `GEOCODER_PROVIDER=nominatim`, se usa Nominatim con un sesgo/bounding-box hacia **Mar del Plata (AR)**.

## Instalación

```bash
pnpm install
```

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

## Funcionalidades

- **Búsqueda de direcciones** (autocompletado) vía `GET /api/geocode`.
- **Lista de paradas** con drag & drop.
- **Optimización del orden** vía `POST /api/optimize` (GraphHopper VRP).
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

- **Requiere**: `GRAPHHOPPER_API_KEY`.
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
  ]
}
```

- **Reglas**:
  - Se necesitan **al menos 3 paradas**.
  - La primera parada se toma como **start**.
  - La última parada se toma como **end**.
  - Las paradas intermedias son **services**.
- **Output**:
  - `{ orderedStopIds: string[]; routeLine: Array<{ lat: number; lng: number }> }`
- **Notas**:
  - Maneja `429` (rate limit) con mensaje explícito.
  - La polilínea se decodifica desde `route.points` cuando GraphHopper devuelve puntos encoded.

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
  - `optimize`: GraphHopper VRP (optimize + fetch solution con `wait=true`).

## Troubleshooting

- **`Missing GRAPHHOPPER_API_KEY`**
  - Definí la variable en `.env.local` y reiniciá el servidor (`pnpm dev`).
- **Error `429` de GraphHopper**
  - Estás en rate limit. Esperá un poco o usá un plan con más cuota.
- **El mapa no aparece / errores de `window`**
  - El mapa es client-only. Verificá que no se haya removido `ssr: false` del import dinámico.

## Notas de producto

Para ideas/roadmap del MVP ver `README-project.md`.
