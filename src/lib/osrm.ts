type LatLng = { lat: number; lng: number };

export class OsrmError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function coordinates(locations: LatLng[]): string {
  if (locations.length < 2 || locations.length > 25) {
    throw new OsrmError("El piloto admite entre 2 y 25 puntos.", 400);
  }
  for (const { lat, lng } of locations) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -38.2 || lat > -37.9 || lng < -58.15 || lng > -57.45) {
      throw new OsrmError("El piloto local solo cubre Mar del Plata y alrededores.", 422);
    }
  }
  return locations.map(({ lat, lng }) => `${lng},${lat}`).join(";");
}

async function request(service: "table" | "route", locations: LatLng[]) {
  const coords = coordinates(locations);
  const baseUrl = process.env.OSRM_BASE_URL;
  if (!baseUrl) throw new OsrmError("Falta configurar OSRM_BASE_URL.", 500);
  let url: URL;
  try {
    url = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    url.pathname += `${service}/v1/driving/${coords}`;
  } catch {
    throw new OsrmError("OSRM_BASE_URL no es una URL HTTP válida.", 500);
  }
  // Evita ajustar un punto a una calle lejana fuera de la zona elegida.
  url.searchParams.set("radiuses", locations.map(() => "200").join(";"));
  if (service === "table") {
    url.searchParams.set("annotations", "duration");
  } else {
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("steps", "false");
  }
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new OsrmError("El motor local de rutas no responde. Conservá las paradas e intentá nuevamente.", 503);
  }
  let data: Record<string, unknown> | null;
  try {
    data = object(await response.json());
  } catch {
    throw new OsrmError("El motor local devolvió una respuesta inválida.", 502);
  }
  if (data?.code === "NoSegment" || data?.code === "NoRoute" || data?.code === "NoTable") {
    throw new OsrmError("No hay un camino por calles para conectar las paradas seleccionadas.", 422);
  }
  if (!response.ok || data?.code !== "Ok") {
    throw new OsrmError("No se pudo calcular el recorrido con el motor local.", 502);
  }
  return data;
}

export async function computeOsrmMatrix(locations: LatLng[]) {
  const data = await request("table", locations);
  const rows = data.durations;
  if (!Array.isArray(rows) || rows.length !== locations.length) {
    throw new OsrmError("El motor local devolvió una matriz incompleta.", 502);
  }
  return rows.flatMap((row: unknown, originIndex: number) => {
    if (!Array.isArray(row) || row.length !== locations.length) {
      throw new OsrmError("El motor local devolvió una matriz incompleta.", 502);
    }
    return row.map((duration: unknown, destinationIndex: number) => {
      if (duration === null) {
        throw new OsrmError("Hay paradas sin conexión vial entre sí.", 422);
      }
      if (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0) {
        throw new OsrmError("El motor local devolvió un tiempo de viaje inválido.", 502);
      }
      return { originIndex, destinationIndex, duration: `${Math.round(duration)}s` };
    });
  });
}

export async function computeOsrmPolyline(locations: LatLng[]): Promise<LatLng[]> {
  const data = await request("route", locations);
  const route = Array.isArray(data.routes) ? object(data.routes[0]) : null;
  const geometry = object(route?.geometry);
  const points = geometry?.coordinates;
  if (geometry?.type !== "LineString" || !Array.isArray(points) || points.length < 2) {
    throw new OsrmError("El motor local no devolvió un trazado por calles.", 502);
  }
  return points.map((point: unknown) => {
    if (!Array.isArray(point) || point.length < 2 ||
      typeof point[0] !== "number" || typeof point[1] !== "number" ||
      !Number.isFinite(point[0]) || !Number.isFinite(point[1]) ||
      Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) {
      throw new OsrmError("El motor local devolvió un trazado inválido.", 502);
    }
    return { lat: point[1], lng: point[0] };
  });
}
