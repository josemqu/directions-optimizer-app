"use client";

import { useMemo, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { nanoid } from "nanoid";
import type { Stop } from "@/lib/routeStore";
import { useRouteStore } from "@/lib/routeStore";

type GeocodeResult = {
  label: string;
  lat: number;
  lng: number;
};

export function AddressInput() {
  const addStop = useRouteStore((s) => s.addStop);
  const setStartStop = useRouteStore((s) => s.setStartStop);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = useMemo(() => query.trim().length >= 3, [query]);

  async function search() {
    if (!canSearch) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Geocoding failed");
      }
      const data = (await res.json()) as { results: GeocodeResult[] };
      setResults(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function addFromResult(r: GeocodeResult) {
    const stop: Stop = {
      id: nanoid(),
      label: r.label,
      position: { lat: r.lat, lng: r.lng },
      kind: "address",
    };
    addStop(stop);
    setQuery("");
    setResults([]);
  }

  async function useMyLocation() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocalización no disponible en este navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gpsStop: Stop = {
          id: "gps-start",
          label: "Mi ubicación",
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
          kind: "gps",
        };
        setStartStop(gpsStop);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Permiso de ubicación denegado. Habilítalo para usar el GPS."
            : "No se pudo obtener la ubicación actual."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  }

  return (
    <div className="w-full rounded-xl border border-white/10 bg-zinc-950/60 p-4 shadow-sm backdrop-blur">
      <div className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar dirección"
            className="h-10 w-full rounded-lg border border-white/10 bg-zinc-900 pl-9 pr-3 text-sm text-zinc-50 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-white/10"
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
          />
        </div>

        <div className="flex shrink-0 items-stretch gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-transparent text-zinc-100 hover:bg-white/5 sm:w-auto sm:px-3"
            aria-label="Usar mi ubicación"
            title="Usar mi ubicación"
          >
            <LocateFixed className="h-4 w-4" />
            <span className="hidden sm:ml-2 sm:inline text-sm font-medium">
              Mi ubicación
            </span>
          </button>

          <button
            type="button"
            onClick={search}
            disabled={!canSearch || loading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-zinc-950 disabled:opacity-50 sm:w-auto sm:px-3"
            aria-label="Buscar"
            title="Buscar"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:ml-2 sm:inline text-sm font-medium">
              {loading ? "Buscando..." : "Buscar"}
            </span>
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      {results.length ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
          {results.map((r, idx) => (
            <button
              key={`${r.label}-${idx}`}
              type="button"
              onClick={() => addFromResult(r)}
              className="block w-full border-b border-white/10 px-3 py-2 text-left text-sm text-zinc-50 hover:bg-white/5 last:border-b-0"
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-xs text-zinc-400">
        Tip: escribe al menos 3 caracteres y presiona Enter.
      </p>
    </div>
  );
}
