import type { Stop } from "./routeStore";

export function buildGoogleMapsUrl(stops: Stop[]) {
  if (stops.length < 2) return null;

  const origin = `${stops[0].position.lat},${stops[0].position.lng}`;
  const destination = `${stops[stops.length - 1].position.lat},${
    stops[stops.length - 1].position.lng
  }`;

  const waypoints = stops
    .slice(1, -1)
    .map((s) => `${s.position.lat},${s.position.lng}`)
    .join("|");

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  if (waypoints) url.searchParams.set("waypoints", waypoints);
  url.searchParams.set("travelmode", "driving");
  return url.toString();
}

export function buildWhatsAppUrl(stops: Stop[]) {
  const gmaps = buildGoogleMapsUrl(stops);
  const lines = stops.map((s, idx) => {
    let line = `${idx + 1}. ${s.label}`;
    if (s.timeRestriction) {
      const typeLabel = s.timeRestrictionType === "after" ? "después de" : "antes de";
      line += ` (${typeLabel} ${s.timeRestriction})`;
    }
    return line;
  });
  if (gmaps) lines.push("", `Google Maps: ${gmaps}`);

  const text = lines.join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
