import { NextResponse } from "next/server";

const MDP_BIAS = "Mar del Plata, Buenos Aires, Argentina";

// Bounding box around Mar del Plata (approx)
// Nominatim expects: left,top,right,bottom (lon,lat,lon,lat)
const MDP_VIEWBOX = {
  left: -58.15,
  top: -37.9,
  right: -57.45,
  bottom: -38.2,
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawQ = url.searchParams.get("q")?.trim();

  if (!rawQ || rawQ.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const qLower = rawQ.toLowerCase();
  const q = qLower.includes("mar del plata") ? rawQ : `${rawQ}, ${MDP_BIAS}`;

  const provider = (process.env.GEOCODER_PROVIDER || "nominatim").toLowerCase();

  if (provider === "graphhopper") {
    const key = process.env.GRAPHHOPPER_API_KEY;
    if (!key) {
      return new NextResponse("Missing GRAPHHOPPER_API_KEY", { status: 500 });
    }

    const gh = new URL("https://graphhopper.com/api/1/geocode");
    gh.searchParams.set("q", q);
    gh.searchParams.set("limit", "6");
    gh.searchParams.set("key", key);

    const res = await fetch(gh.toString(), {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const rawText = await res.text();
      let providerMessage = rawText;
      try {
        const parsed = JSON.parse(rawText) as { message?: unknown };
        if (typeof parsed?.message === "string" && parsed.message.trim()) {
          providerMessage = parsed.message;
        }
      } catch {
        // ignore
      }

      const isMinuteLimit = /Minutely API limit heavily violated/i.test(
        providerMessage
      );
      const friendlyMessage = isMinuteLimit
        ? "Se alcanzó el límite de uso del buscador de direcciones. Probá de nuevo en unos minutos."
        : providerMessage || "GraphHopper geocoding failed";

      return new NextResponse(friendlyMessage, {
        status: res.status === 429 ? 429 : 502,
      });
    }

    const data = (await res.json()) as {
      hits?: Array<{
        name?: string;
        point?: { lat: number; lng: number };
        country?: string;
        city?: string;
        street?: string;
        housenumber?: string;
        state?: string;
        postcode?: string;
      }>;
    };

    const results = (data.hits ?? [])
      .filter((h) => h.point)
      .filter((h) => {
        const city = (h.city || "").toLowerCase();
        const name = (h.name || "").toLowerCase();
        return city.includes("mar del plata") || name.includes("mar del plata");
      })
      .map((h) => {
        const label =
          h.name ||
          [
            [h.street, h.housenumber].filter(Boolean).join(" "),
            h.city,
            h.state,
            h.postcode,
            h.country,
          ]
            .filter(Boolean)
            .join(", ");

        return {
          label,
          lat: h.point!.lat,
          lng: h.point!.lng,
        };
      });

    return NextResponse.json({ results });
  }

  const nom = new URL("https://nominatim.openstreetmap.org/search");
  nom.searchParams.set("q", q);
  nom.searchParams.set("format", "json");
  nom.searchParams.set("addressdetails", "1");
  nom.searchParams.set("limit", "6");
  nom.searchParams.set("countrycodes", "ar");
  nom.searchParams.set(
    "viewbox",
    `${MDP_VIEWBOX.left},${MDP_VIEWBOX.top},${MDP_VIEWBOX.right},${MDP_VIEWBOX.bottom}`
  );
  nom.searchParams.set("bounded", "1");

  const res = await fetch(nom.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "directions-optimizer-app (prototype)",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return new NextResponse(text || "Nominatim geocoding failed", {
      status: 502,
    });
  }

  const data = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;

  const results = data.map((r) => ({
    label: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));

  return NextResponse.json({ results });
}
