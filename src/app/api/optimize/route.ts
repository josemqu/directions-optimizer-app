import { NextResponse } from "next/server";

type LatLng = { lat: number; lng: number };

type Stop = {
  id: string;
  label: string;
  position: LatLng;
  kind?: "gps" | "address";
  timeRestriction?: string; // HH:mm format, e.g. "09:00"
  timeRestrictionType?: "before" | "after"; // default "before"
};

type GraphHopperRoute = {
  activities?: Array<{
    type: string;
    address?: { location_id?: string };
    arr_time?: number; // arrival time in seconds since start
    end_time?: number; // end time in seconds since start
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
  type: "before" | "after" = "before"
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
function calculateLatestDepartureTime(
  stops: Stop[],
  activities: GraphHopperRoute["activities"]
): string | null {
  if (!activities || activities.length === 0) return null;

  // Create a map of location_id to stop for quick lookup
  const stopById = new Map(stops.map((s) => [s.id, s]));

  let latestDepartureSeconds: number | null = null;

  for (const activity of activities) {
    if (!activity.address?.location_id) continue;
    if (activity.type === "start" || activity.type === "end") continue;

    const stop = stopById.get(activity.address.location_id);
    if (!stop?.timeRestriction || stop.timeRestrictionType === "after") continue;

    // This is a "before" restriction
    const [hours, minutes] = stop.timeRestriction.split(":").map(Number);
    const restrictionSeconds = hours * 3600 + minutes * 60;
    
    // arrivalTimeAtRestriction is in seconds from departure
    const arrivalTimeFromStart = activity.arr_time ?? 0;
    
    // For this stop, we must depart at the latest by:
    const possibleDeparture = restrictionSeconds - arrivalTimeFromStart;

    if (latestDepartureSeconds === null || possibleDeparture < latestDepartureSeconds) {
      latestDepartureSeconds = possibleDeparture;
    }
  }

  if (latestDepartureSeconds === null) {
    return null;
  }

  // Handle negative times (would need to depart "yesterday")
  if (latestDepartureSeconds < 0) {
    return "00:00"; // Impossible to meet constraint starting today
  }

  // Convert back to HH:mm format
  const hours = Math.floor(latestDepartureSeconds / 3600);
  const minutes = Math.floor((latestDepartureSeconds % 3600) / 60);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
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
  // Now all stops from index 1 to the end are treated as services that can be reordered
  const servicesStops = stops.slice(1);

  const payload = {
    vehicles: [
      {
        vehicle_id: "vehicle_1",
        start_address: {
          location_id: start.id,
          lat: start.position.lat,
          lon: start.position.lng,
        },
        // We remove end_address to allow the optimizer to choose the best last stop
        earliest_start: 0,
        latest_end: 86400,
        return_to_depot: false,
      },
    ],
    services: servicesStops.map((s, idx) => {
      const service: any = {
        id: `service_${idx}_${s.id}`,
        name: s.label,
        address: {
          location_id: s.id,
          lat: s.position.lat,
          lon: s.position.lng,
        },
      };

      // Add time_windows if there's a time restriction
      if (s.timeRestriction) {
        const timeWindow = convertToTimeWindow(
          s.timeRestriction,
          s.timeRestrictionType || "before"
        );
        service.time_windows = [timeWindow];
      }

      return service;
    }),
    configuration: {
      routing: {
        calc_points: true,
        points_encoded: true,
      },
    },
  };

  console.log("GraphHopper Payload:", JSON.stringify(payload, null, 2));

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
    console.error("GraphHopper Rate Limit:", text);
    return new NextResponse(
      text ||
        "GraphHopper rate limit exceeded (429). Wait a bit or upgrade your plan.",
      { status: 429 }
    );
  }

  if (!res.ok) {
    const text = await res.text();
    console.error("GraphHopper Error Response:", text);
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

  const orderedStopIds = [start.id, ...orderedServiceLocationIds];

  // Calculate latest departure time based on time restrictions
  const latestDepartureTime = calculateLatestDepartureTime(stops, activities);

  return NextResponse.json({ 
    orderedStopIds, 
    routeLine,
    latestDepartureTime 
  });
}
