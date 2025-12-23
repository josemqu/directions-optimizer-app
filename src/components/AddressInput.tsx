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
    };
    addStop(stop);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="w-full rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar dirección (ej: Av. Corrientes 1234, CABA)"
          className="h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
          }}
        />
        <button
          type="button"
          onClick={search}
          disabled={!canSearch || loading}
          className="h-11 shrink-0 rounded-lg bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {results.length ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-black/10">
          {results.map((r, idx) => (
            <button
              key={`${r.label}-${idx}`}
              type="button"
              onClick={() => addFromResult(r)}
              className="block w-full border-b border-black/10 px-3 py-2 text-left text-sm hover:bg-black/5 last:border-b-0"
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-xs text-zinc-500">
        Tip: escribe al menos 3 caracteres y presiona Enter.
      </p>
    </div>
  );
}
