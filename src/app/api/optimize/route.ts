import { NextResponse } from "next/server";
import { spawnSync } from "node:child_process";
import path from "node:path";

type LatLng = { lat: number; lng: number };

export const runtime = "nodejs";

class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Stop = {
  id: string;
  label: string;
  position: LatLng;
  kind?: "gps" | "address";
  timeRestriction?: string; // HH:mm format, e.g. "09:00"
  timeRestrictionType?: "before" | "after"; // default "before"
};

type RouteMatrixElement = {
  originIndex?: number;
  destinationIndex?: number;
  duration?: string;
  distanceMeters?: number;
  condition?: string;
};

type ComputeRoutesResponse = {
  routes?: Array<{
    polyline?: {
      encodedPolyline?: string;
    };
  }>;
};

function decodePolyline(encoded: unknown, precision = 1e5): LatLng[] {
  if (typeof encoded !== "string") return [];

  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: LatLng[] = [];

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push({ lat: lat / precision, lng: lng / precision });
  }

  return coordinates;
}

function pointsToRouteLine(points: unknown): LatLng[] {
  if (!points) return [];

  if (typeof points === "string") {
    const line5 = decodePolyline(points, 1e5);
    if (line5.length >= 2) return line5;
    return decodePolyline(points, 1e6);
  }

  if (Array.isArray(points)) {
    const line: LatLng[] = [];
    for (const c of points) {
      if (!Array.isArray(c) || c.length < 2) continue;
      const a = c[0];
      const b = c[1];
      if (typeof a !== "number" || typeof b !== "number") continue;
      line.push({ lat: b, lng: a });
    }
    return line;
  }

  if (typeof points === "object" && points !== null) {
    const obj = points as Record<string, unknown>;
    const candidates: unknown[] = [
      obj.coordinates,
      (obj.points as any)?.coordinates,
      (obj.geometry as any)?.coordinates,
      (obj.points as any)?.points,
      (obj.points as any)?.points?.coordinates,
    ];

    for (const cand of candidates) {
      const line = pointsToRouteLine(cand);
      if (line.length >= 2) return line;
    }
  }

  return [];
}

function durationToSeconds(raw: unknown): number {
  if (typeof raw !== "string") return 0;
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const m = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)s$/);
  if (!m) return 0;
  return Math.round(Number(m[1]));
}

async function computeRouteMatrix(params: {
  apiKey: string;
  locations: LatLng[];
}) {
  const url =
    "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";

  const body = {
    origins: params.locations.map((p) => ({
      waypoint: {
        location: { latLng: { latitude: p.lat, longitude: p.lng } },
      },
    })),
    destinations: params.locations.map((p) => ({
      waypoint: {
        location: { latLng: { latitude: p.lat, longitude: p.lng } },
      },
    })),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": params.apiKey,
      "X-Goog-FieldMask":
        "originIndex,destinationIndex,duration,distanceMeters,condition",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new HttpError(
      rawText || "No se pudo obtener la matriz de tiempos de Google Routes API",
      res.status === 429 ? 429 : 502,
    );
  }

  let elements: RouteMatrixElement[] = [];
  try {
    const parsed = JSON.parse(rawText) as unknown;
    if (Array.isArray(parsed)) {
      elements = parsed as RouteMatrixElement[];
    } else if (parsed && typeof parsed === "object") {
      elements = [parsed as RouteMatrixElement];
    }
  } catch {
    elements = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l) as RouteMatrixElement;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as RouteMatrixElement[];
  }

  return elements;
}

async function computeRoutePolyline(params: {
  apiKey: string;
  orderedLocations: LatLng[];
}) {
  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

  if (params.orderedLocations.length < 2) {
    return [] as LatLng[];
  }

  const [origin, ...rest] = params.orderedLocations;
  const destination = rest.length ? rest[rest.length - 1] : origin;
  const intermediates = rest.length ? rest.slice(0, -1) : [];

  const body: Record<string, unknown> = {
    origin: {
      location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
    },
    destination: {
      location: {
        latLng: { latitude: destination.lat, longitude: destination.lng },
      },
    },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    polylineQuality: "OVERVIEW",
    polylineEncoding: "ENCODED_POLYLINE",
  };

  if (intermediates.length) {
    body.intermediates = intermediates.map((p) => ({
      location: { latLng: { latitude: p.lat, longitude: p.lng } },
    }));
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": params.apiKey,
      "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Google computeRoutes failed:", res.status, text);
    return [] as LatLng[];
  }

  let data: ComputeRoutesResponse;
  try {
    data = (await res.json()) as ComputeRoutesResponse;
  } catch {
    return [] as LatLng[];
  }

  const encoded = data.routes?.[0]?.polyline?.encodedPolyline;
  if (!encoded) {
    console.error("Google computeRoutes response missing polyline");
    return [] as LatLng[];
  }
  const line5 = decodePolyline(encoded, 1e5);
  return line5.length >= 2 ? line5 : decodePolyline(encoded, 1e6);
}

function sanitizeRouteLine(line: LatLng[]): LatLng[] {
  const cleaned = line
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .filter(
      (p) => p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180,
    );

  if (cleaned.length < 2) return [];

  const deduped: LatLng[] = [cleaned[0]];
  for (let i = 1; i < cleaned.length; i++) {
    const prev = deduped[deduped.length - 1];
    const cur = cleaned[i];
    if (prev.lat === cur.lat && prev.lng === cur.lng) continue;
    deduped.push(cur);
  }

  return deduped.length >= 2 ? deduped : [];
}

/**
 * Converts a time restriction to GraphHopper time_windows format.
 * GraphHopper uses timestamps in seconds since midnight (0-86400).
 *
 * @param timeRestriction - Time in HH:mm format (e.g., "09:00")
 * @param type - "before" means must arrive before this time, "after" means must arrive after
 * @returns Object with earliest and latest timestamps in seconds since midnight
 */
function convertToTimeWindow(
  timeRestriction: string,
  type: "before" | "after" = "before",
): { earliest: number; latest: number } {
  const [hours, minutes] = timeRestriction.split(":").map(Number);
  const timeInSeconds = hours * 3600 + minutes * 60;

  if (type === "before") {
    // Must arrive before this time: window from 00:00 to specified time
    return { earliest: 0, latest: timeInSeconds };
  } else {
    // Must arrive after this time: window from specified time to 23:59
    return { earliest: timeInSeconds, latest: 86400 }; // 86400 = 24 * 3600 (end of day)
  }
}

/**
 * Calculates the latest departure time based on time restrictions.
 * This finds the most restrictive "before" constraint and works backwards
 * from the arrival times to determine when you must depart.
 *
 * @param stops - Array of stops with potential time restrictions
 * @param activities - GraphHopper activities with arrival times
 * @returns Latest departure time in HH:mm format, or null if no restrictions
 */
function calculateLatestDepartureTime(params: {
  stops: Stop[];
  arrivalSecondsByStopId: Map<string, number>;
}): string | null {
  let latestDepartureSeconds: number | null = null;

  for (const stop of params.stops) {
    if (!stop.timeRestriction || stop.timeRestrictionType === "after") continue;
    const arrivalTimeFromStart = params.arrivalSecondsByStopId.get(stop.id);
    if (typeof arrivalTimeFromStart !== "number") continue;

    const [hours, minutes] = stop.timeRestriction.split(":").map(Number);
    const restrictionSeconds = hours * 3600 + minutes * 60;
    const possibleDeparture = restrictionSeconds - arrivalTimeFromStart;

    if (
      latestDepartureSeconds === null ||
      possibleDeparture < latestDepartureSeconds
    ) {
      latestDepartureSeconds = possibleDeparture;
    }
  }

  if (latestDepartureSeconds === null) return null;
  if (latestDepartureSeconds < 0) return "00:00";

  const hours = Math.floor(latestDepartureSeconds / 3600);
  const minutes = Math.floor((latestDepartureSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_ROUTES_API_KEY;
  if (!apiKey) {
    return new NextResponse("Missing GOOGLE_ROUTES_API_KEY", { status: 500 });
  }

  const body = (await req.json()) as { stops?: Stop[] };
  const stops = body.stops ?? [];

  if (stops.length < 3) {
    return new NextResponse("Need at least 3 stops to optimize", {
      status: 400,
    });
  }

  const start = stops[0];
  const dummyEndId = "__dummy_end__";
  const dummyEnd: Stop = {
    id: dummyEndId,
    label: "END",
    position: start.position,
    kind: "gps",
  };

  const realNodes = stops;
  const nodes = [...realNodes, dummyEnd];

  const realCount = realNodes.length;
  const n = nodes.length;
  const locations = realNodes.map((s) => s.position);

  let elements: RouteMatrixElement[];
  try {
    elements = await computeRouteMatrix({ apiKey, locations });
  } catch (e) {
    if (e instanceof HttpError) {
      return new NextResponse(e.message, { status: e.status });
    }
    return new NextResponse(
      e instanceof Error
        ? e.message
        : "Error inesperado al obtener la matriz de tiempos",
      { status: 502 },
    );
  }

  const timeMatrix: number[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => 86400),
  );
  for (let i = 0; i < n; i++) timeMatrix[i][i] = 0;

  for (const el of elements) {
    const oi = el.originIndex;
    const di = el.destinationIndex;
    if (typeof oi !== "number" || typeof di !== "number") continue;
    if (oi < 0 || di < 0 || oi >= realCount || di >= realCount) continue;
    const sec = durationToSeconds(el.duration);
    if (!sec) continue;
    timeMatrix[oi][di] = sec;
  }

  const dummyIndex = n - 1;
  for (let i = 0; i < realCount; i++) {
    timeMatrix[i][dummyIndex] = 0;
    timeMatrix[dummyIndex][i] = 0;
  }

  const timeWindows: Array<[number, number]> = nodes.map((s) => {
    if (!s.timeRestriction) return [0, 86400];
    const tw = convertToTimeWindow(
      s.timeRestriction,
      s.timeRestrictionType || "before",
    );
    return [tw.earliest, tw.latest];
  });

  const scriptPath = path.join(process.cwd(), "scripts", "optimize_ortools.py");
  const solverInput = {
    time_matrix: timeMatrix,
    time_windows: timeWindows,
    start_index: 0,
    end_index: dummyIndex,
  };

  const pythonBin = process.env.PYTHON_BIN || "python3";

  let solverStdout = "";

  if (process.env.VERCEL) {
    const solverUrl = new URL("/api/solve_ortools", req.url);
    const solverRes = await fetch(solverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(solverInput),
      cache: "no-store",
    });

    solverStdout = await solverRes.text();
    if (!solverRes.ok) {
      return new NextResponse(solverStdout || "Error ejecutando el solver", {
        status: 500,
      });
    }
  } else {
    const child = spawnSync(pythonBin, [scriptPath], {
      input: JSON.stringify(solverInput),
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });

    if (child.error) {
      return new NextResponse(
        `No se pudo ejecutar el solver (${pythonBin}). Asegurate de tener Python y ortools instalados.`,
        { status: 500 },
      );
    }

    if (child.status !== 0) {
      const stderr = child.stderr || "";
      if (
        /ModuleNotFoundError:\s+No module named ['\"]ortools['\"]/i.test(stderr)
      ) {
        return new NextResponse(
          `Falta instalar OR-Tools en el Python que está ejecutando el servidor (${pythonBin}). Instalá con: pip3 install ortools (o configurá PYTHON_BIN para apuntar al venv correcto).`,
          { status: 500 },
        );
      }

      if (child.stdout.trim().length === 0) {
        return new NextResponse(stderr || "Error ejecutando el solver", {
          status: 500,
        });
      }
    }

    solverStdout = child.stdout;
  }

  let solverOut: {
    ordered_nodes?: number[];
    arrivals?: Record<string, number>;
    error?: string;
  };
  try {
    solverOut = JSON.parse(solverStdout) as {
      ordered_nodes?: number[];
      arrivals?: Record<string, number>;
      error?: string;
    };
  } catch {
    return new NextResponse(
      "No se pudo interpretar la respuesta del solver de optimización.",
      { status: 500 },
    );
  }

  if (
    solverOut.error === "no_solution" ||
    !Array.isArray(solverOut.ordered_nodes)
  ) {
    return new NextResponse(
      "No se encontró una solución factible para las restricciones horarias.",
      { status: 422 },
    );
  }

  const orderedNodes = solverOut.ordered_nodes
    .map((x) => (typeof x === "number" ? x : null))
    .filter((x): x is number => typeof x === "number");

  const orderedStopIds = orderedNodes
    .map((idx) => nodes[idx]?.id)
    .filter((id): id is string => typeof id === "string")
    .filter((id) => id !== dummyEndId);

  const arrivalSecondsByStopId = new Map<string, number>();
  const arrivals = solverOut.arrivals ?? {};
  for (const [k, v] of Object.entries(arrivals)) {
    const idx = Number(k);
    if (!Number.isFinite(idx)) continue;
    const id = nodes[idx]?.id;
    if (!id) continue;
    if (id === dummyEndId) continue;
    if (typeof v !== "number") continue;
    arrivalSecondsByStopId.set(id, v);
  }

  const latestDepartureTime = calculateLatestDepartureTime({
    stops: realNodes,
    arrivalSecondsByStopId,
  });

  const orderedStops = orderedStopIds
    .map((id) => nodes.find((s) => s.id === id))
    .filter(Boolean) as Stop[];
  const orderedLocations = orderedStops.map((s) => s.position);

  let routeLine = await computeRoutePolyline({
    apiKey,
    orderedLocations,
  });

  routeLine = sanitizeRouteLine(routeLine);

  if (routeLine.length < 2) {
    routeLine = orderedLocations;
  }

  routeLine = sanitizeRouteLine(routeLine);

  return NextResponse.json({
    orderedStopIds,
    routeLine,
    latestDepartureTime,
  });
}
