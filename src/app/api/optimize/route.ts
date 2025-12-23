import { NextResponse } from "next/server";

type LatLng = { lat: number; lng: number };

type Stop = {
  id: string;
  label: string;
  position: LatLng;
  kind?: "gps" | "address";
};

type GraphHopperRoute = {
  activities?: Array<{
    type: string;
    address?: { location_id?: string };
  }>;
  points?: unknown;
};

type GraphHopperSolutionResponse = {
  status?: string;
  solution?: {
    routes?: GraphHopperRoute[];
  };
};

type GraphHopperOptimizeResponse =
  | {
      job_id?: string;
      status?: string;
    }
  | GraphHopperSolutionResponse;

function hasSolution(
  input: GraphHopperOptimizeResponse | GraphHopperSolutionResponse
): input is GraphHopperSolutionResponse {
  return (
    typeof input === "object" &&
    input !== null &&
    "solution" in input &&
    typeof (input as GraphHopperSolutionResponse).solution === "object"
  );
}

function decodePolyline(encoded: unknown): LatLng[] {
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

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
}

function pointsToRouteLine(points: unknown): LatLng[] {
  if (!points) return [];

  if (typeof points === "string") {
    return decodePolyline(points);
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

async function fetchGraphHopperSolution(params: {
  key: string;
  jobId: string;
}) {
  const solutionUrl = new URL(
    `https://graphhopper.com/api/1/vrp/solution/${encodeURIComponent(
      params.jobId
    )}`
  );
  solutionUrl.searchParams.set("key", params.key);
  solutionUrl.searchParams.set("wait", "true");

  const res = await fetch(solutionUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 429) {
    const text = await res.text();
    throw new Error(
      text ||
        "GraphHopper rate limit exceeded (429). Wait a bit or upgrade your plan."
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "GraphHopper solution fetch failed");
  }

  return (await res.json()) as GraphHopperSolutionResponse;
}

export async function POST(req: Request) {
  const key = process.env.GRAPHHOPPER_API_KEY;
  if (!key) {
    return new NextResponse("Missing GRAPHHOPPER_API_KEY", { status: 500 });
  }

  const body = (await req.json()) as { stops?: Stop[] };
  const stops = body.stops ?? [];

  if (stops.length < 3) {
    return new NextResponse("Need at least 3 stops to optimize", {
      status: 400,
    });
  }

  const start = stops[0];
  const end = stops[stops.length - 1];
  const servicesStops = stops.slice(1, -1);

  const payload = {
    vehicles: [
      {
        vehicle_id: "vehicle_1",
        start_address: {
          location_id: start.id,
          lat: start.position.lat,
          lon: start.position.lng,
        },
        end_address: {
          location_id: end.id,
          lat: end.position.lat,
          lon: end.position.lng,
        },
      },
    ],
    services: servicesStops.map((s, idx) => ({
      id: `service_${idx}_${s.id}`,
      name: s.label,
      address: {
        location_id: s.id,
        lat: s.position.lat,
        lon: s.position.lng,
      },
    })),
    configuration: {
      routing: {
        calc_points: true,
        points_encoded: true,
      },
    },
  };

  const res = await fetch(
    `https://graphhopper.com/api/1/vrp/optimize?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (res.status === 429) {
    const text = await res.text();
    return new NextResponse(
      text ||
        "GraphHopper rate limit exceeded (429). Wait a bit or upgrade your plan.",
      { status: 429 }
    );
  }

  if (!res.ok) {
    const text = await res.text();
    return new NextResponse(text || "GraphHopper optimization failed", {
      status: 502,
    });
  }

  const optimizeResponse = (await res.json()) as GraphHopperOptimizeResponse;

  const data =
    "job_id" in optimizeResponse && optimizeResponse.job_id
      ? await fetchGraphHopperSolution({ key, jobId: optimizeResponse.job_id })
      : optimizeResponse;

  const route: GraphHopperRoute | undefined = hasSolution(data)
    ? data.solution?.routes?.[0]
    : undefined;

  const activities = route?.activities ?? [];

  const orderedServiceLocationIds: string[] = [];

  for (const a of activities) {
    if (!a.address?.location_id) continue;
    if (a.type === "start" || a.type === "end") continue;
    orderedServiceLocationIds.push(a.address.location_id);
  }

  let routeLine: LatLng[] = [];
  try {
    routeLine = pointsToRouteLine(route?.points);
  } catch {
    routeLine = [];
  }

  const orderedStopIds = [start.id, ...orderedServiceLocationIds, end.id];

  return NextResponse.json({ orderedStopIds, routeLine });
}
