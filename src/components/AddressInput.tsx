"use client";

import { useMemo, useState } from "react";
import { BookmarkPlus, LocateFixed, Search, X } from "lucide-react";
import { nanoid } from "nanoid";
import { Tooltip } from "@/components/Tooltip";
import type { Stop } from "@/lib/routeStore";
import { useRouteStore } from "@/lib/routeStore";
import type { AgendaPlace } from "@/lib/agendaStore";
import { useAgendaStore } from "@/lib/agendaStore";
import { formatAddressShort } from "@/lib/formatAddress";

type GeocodeResult = {
  label: string;
  lat: number;
  lng: number;
};

export function AddressInput() {
  const addStop = useRouteStore((s) => s.addStop);
  const setStartStop = useRouteStore((s) => s.setStartStop);

  const places = useAgendaStore((s) => s.places);
  const addPlace = useAgendaStore((s) => s.addPlace);
  const removePlace = useAgendaStore((s) => s.removePlace);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaFilter, setAgendaFilter] = useState("");
  const [saveFor, setSaveFor] = useState<GeocodeResult | null>(null);
  const [saveName, setSaveName] = useState("");

  const canSearch = useMemo(() => query.trim().length >= 3, [query]);

  function closeAgenda() {
    setAgendaOpen(false);
    setSaveFor(null);
    setSaveName("");
  }

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

  function addFromAgendaPlace(p: AgendaPlace) {
    const stop: Stop = {
      id: nanoid(),
      label: p.label,
      position: p.position,
      kind: "address",
    };
    addStop(stop);
    setAgendaOpen(false);
  }

  function startSaveFromResult(r: GeocodeResult) {
    setSaveFor(r);
    setSaveName("");
    setAgendaOpen(true);
  }

  function confirmSave() {
    if (!saveFor) return;
    const name = saveName.trim();
    if (!name) return;

    const place: AgendaPlace = {
      id: nanoid(),
      name,
      label: saveFor.label,
      position: { lat: saveFor.lat, lng: saveFor.lng },
      createdAt: Date.now(),
    };
    addPlace(place);
    setSaveFor(null);
    setSaveName("");
    setAgendaFilter("");
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
    <div
      className="w-full rounded-xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur"
      data-tour="address-input"
    >
      <div className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar dirección"
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
          />
        </div>

        <div className="flex shrink-0 items-stretch gap-2">
          <Tooltip content="Ver ubicaciones guardadas" side="bottom">
            <button
              type="button"
              onClick={() => {
                setAgendaOpen((v) => !v);
                setSaveFor(null);
                setSaveName("");
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:px-3"
              aria-label="Abrir agenda"
            >
              <BookmarkPlus className="h-4 w-4" />
              <span className="hidden sm:ml-2 sm:inline text-sm font-medium">
                Agenda
              </span>
            </button>
          </Tooltip>

          <Tooltip content="Usar mi ubicación" side="bottom">
            <button
              type="button"
              onClick={useMyLocation}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:px-3"
              aria-label="Usar mi ubicación"
            >
              <LocateFixed className="h-4 w-4" />
              <span className="hidden sm:ml-2 sm:inline text-sm font-medium">
                Mi ubicación
              </span>
            </button>
          </Tooltip>

          <Tooltip
            content={loading ? "Buscando..." : "Buscar dirección"}
            side="bottom"
          >
            <button
              type="button"
              onClick={search}
              disabled={!canSearch || loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:w-auto sm:px-3"
              aria-label="Buscar"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:ml-2 sm:inline text-sm font-medium">
                {loading ? "Buscando..." : "Buscar"}
              </span>
            </button>
          </Tooltip>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {results.length ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-background">
          {results.map((r, idx) => (
            <div
              key={`${r.label}-${idx}`}
              className="flex items-stretch border-b border-border last:border-b-0"
            >
              <Tooltip
                content="Agregar como parada"
                side={idx === 0 ? "bottom" : "top"}
                align="start"
              >
                <button
                  type="button"
                  onClick={() => addFromResult(r)}
                  className="min-w-0 flex-1 px-3 py-2 text-left text-sm text-foreground hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block truncate">
                    {formatAddressShort(r.label)}
                  </span>
                </button>
              </Tooltip>

              <Tooltip
                content="Guardar en agenda"
                side={idx === 0 ? "bottom" : "top"}
                align="end"
              >
                <button
                  type="button"
                  onClick={() => startSaveFromResult(r)}
                  className="inline-flex w-11 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Guardar en agenda"
                >
                  <BookmarkPlus className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          ))}
        </div>
      ) : null}

      {agendaOpen ? (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={closeAgenda}
            aria-hidden
          />
          <div
            className="relative z-40 mt-3 overflow-hidden rounded-lg border border-border bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <div className="text-sm font-medium">Agenda</div>
              <Tooltip content="Cerrar" side="bottom" align="end">
                <button
                  type="button"
                  onClick={() => {
                    closeAgenda();
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Cerrar agenda"
                >
                  <X className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>

            {saveFor ? (
              <div className="border-b border-border p-3">
                <div className="text-xs text-muted-foreground">
                  Guardar dirección:
                </div>
                <div className="mt-1 truncate text-sm font-medium">
                  {saveFor.label}
                </div>

                <div className="mt-3 flex items-stretch gap-2">
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Nombre (ej: Casa, Oficina)"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmSave();
                      if (e.key === "Escape") {
                        setSaveFor(null);
                        setSaveName("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={confirmSave}
                    disabled={!saveName.trim()}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-b border-border p-3">
                <input
                  value={agendaFilter}
                  onChange={(e) => setAgendaFilter(e.target.value)}
                  placeholder="Buscar en agenda"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            <div className="max-h-64 overflow-y-auto">
              {places
                .filter((p) => {
                  const q = agendaFilter.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    p.name.toLowerCase().includes(q) ||
                    p.label.toLowerCase().includes(q)
                  );
                })
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-stretch border-b border-border last:border-b-0"
                  >
                    <Tooltip
                      content="Agregar como parada"
                      side="top"
                      align="start"
                    >
                      <button
                        type="button"
                        onClick={() => addFromAgendaPlace(p)}
                        className="min-w-0 flex-1 px-3 py-2 text-left hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="truncate text-sm font-medium">
                          {p.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {formatAddressShort(p.label)}
                        </div>
                      </button>
                    </Tooltip>
                    <Tooltip content="Eliminar" side="top" align="end">
                      <button
                        type="button"
                        onClick={() => removePlace(p.id)}
                        className="inline-flex w-11 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Eliminar de agenda"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                ))}

              {!places.length ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">
                  Todavía no tenés lugares guardados.
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
