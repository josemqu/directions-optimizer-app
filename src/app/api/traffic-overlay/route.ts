import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await readFile(join(process.cwd(), ".local/osrm/traffic-overlay.geojson"), "utf8");
    return new Response(data, {
      headers: { "Content-Type": "application/geo+json", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("La capa todavía no está preparada. Ejecutá traffic-prepare en el piloto local.", { status: 503 });
  }
}
