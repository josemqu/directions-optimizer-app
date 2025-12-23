"use client";

import { useMemo, useState } from "react";
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
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar dirección (ej: Av. Corrientes 1234, CABA)"
          className="h-11 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-50 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-white/10"
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
          }}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={useMyLocation}
            className="h-11 w-full shrink-0 rounded-lg border border-white/10 bg-transparent px-4 text-sm font-medium text-zinc-100 hover:bg-white/5 sm:w-auto"
          >
            Usar mi ubicación
          </button>

          <button
            type="button"
            onClick={search}
            disabled={!canSearch || loading}
            className="h-11 w-full shrink-0 rounded-lg bg-white px-4 text-sm font-medium text-zinc-950 disabled:opacity-50 sm:w-auto"
          >
            {loading ? "Buscando..." : "Buscar"}
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
