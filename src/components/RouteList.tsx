"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  BookmarkPlus,
  Navigation,
  Trash2,
  Wand2,
  MessageCircle,
} from "lucide-react";
import type { Stop } from "@/lib/routeStore";
import { useRouteStore } from "@/lib/routeStore";
import type { AgendaPlace } from "@/lib/agendaStore";
import { useAgendaStore } from "@/lib/agendaStore";
import { nanoid } from "nanoid";
import { formatAddressShort } from "@/lib/formatAddress";

function buildGoogleMapsUrl(stops: Stop[]) {
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

function buildWhatsAppUrl(stops: Stop[]) {
  const gmaps = buildGoogleMapsUrl(stops);
  const lines = stops.map((s, idx) => `${idx + 1}. ${s.label}`);
  if (gmaps) lines.push("", `Google Maps: ${gmaps}`);

  const text = lines.join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function SortableStopRow({ stop, index }: { stop: Stop; index: number }) {
  const removeStop = useRouteStore((s) => s.removeStop);
  const addPlace = useAgendaStore((s) => s.addPlace);
  const places = useAgendaStore((s) => s.places);

  const agendaMatch =
    stop.kind === "gps"
      ? null
      : places.find(
          (p) =>
            p.position.lat === stop.position.lat &&
            p.position.lng === stop.position.lng
        ) ?? null;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "flex items-start gap-3 rounded-lg border border-border bg-card/70 p-3" +
        (isDragging ? " opacity-70" : "")
      }
    >
      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {index + 1}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {agendaMatch ? agendaMatch.name : formatAddressShort(stop.label)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {agendaMatch ? formatAddressShort(stop.label) : null}
          {agendaMatch ? (
            <span className="ml-2">
              {stop.position.lat.toFixed(6)}, {stop.position.lng.toFixed(6)}
            </span>
          ) : (
            <>
              {stop.position.lat.toFixed(6)}, {stop.position.lng.toFixed(6)}
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => removeStop(stop.id)}
        aria-label="Eliminar"
        title="Eliminar"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <button
        type="button"
        className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => {
          const initial = stop.label?.trim() || "";
          const name = window.prompt("Nombre para guardar en Agenda", initial);
          if (!name) return;
          const trimmed = name.trim();
          if (!trimmed) return;

          const place: AgendaPlace = {
            id: nanoid(),
            name: trimmed,
            label: stop.label,
            position: stop.position,
            createdAt: Date.now(),
          };
          addPlace(place);
        }}
        aria-label="Guardar en agenda"
        title="Guardar en agenda"
      >
        <BookmarkPlus className="h-4 w-4" />
      </button>

      <button
        type="button"
        className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Reordenar"
        title="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

export function RouteList() {
  const stops = useRouteStore((s) => s.stops);
  const reorderStops = useRouteStore((s) => s.reorderStops);
  const setStops = useRouteStore((s) => s.setStops);
  const setRouteLine = useRouteStore((s) => s.setRouteLine);
  const clearAll = useRouteStore((s) => s.clearAll);

  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const googleMapsUrl = useMemo(() => buildGoogleMapsUrl(stops), [stops]);
  const whatsappUrl = useMemo(() => buildWhatsAppUrl(stops), [stops]);

  function updateFades() {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const canScroll = scrollHeight > clientHeight + 1;
    if (!canScroll) {
      setShowTopFade(false);
      setShowBottomFade(false);
      return;
    }

    setShowTopFade(scrollTop > 0);
    setShowBottomFade(scrollTop + clientHeight < scrollHeight - 1);
  }

  useEffect(() => {
    updateFades();
    const t = window.setTimeout(updateFades, 0);
    return () => window.clearTimeout(t);
  }, [stops.length]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;
    reorderStops(String(active.id), String(over.id));
  }

  async function optimize() {
    if (stops.length < 3) return;

    setOptimizing(true);
    setError(null);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Optimization failed");
      }

      const data = (await res.json()) as {
        orderedStopIds: string[];
        routeLine: { lat: number; lng: number }[];
      };

      const stopById = new Map(stops.map((s) => [s.id, s] as const));
      const ordered = data.orderedStopIds
        .map((id) => stopById.get(id))
        .filter(Boolean) as Stop[];

      if (ordered.length === stops.length) setStops(ordered);
      setRouteLine(data.routeLine);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col rounded-xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="grid w-full grid-cols-4 gap-2">
          <button
            type="button"
            onClick={optimize}
            disabled={stops.length < 3 || optimizing}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            aria-label="Optimizar"
            title="Optimizar"
          >
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {optimizing ? "Optimizando..." : "Optimizar"}
            </span>
          </button>

          <button
            type="button"
            onClick={clearAll}
            disabled={!stops.length}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-50"
            aria-label="Limpiar"
            title="Limpiar"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>

          <a
            className={
              "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80" +
              (!googleMapsUrl ? " pointer-events-none opacity-50" : "")
            }
            href={googleMapsUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            title="Abrir en Google Maps"
          >
            <Navigation className="h-4 w-4" />
            <span className="hidden sm:inline">Navegar</span>
          </a>

          <a
            className={
              "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80" +
              (!stops.length ? " pointer-events-none opacity-50" : "")
            }
            href={stops.length ? whatsappUrl : "#"}
            target="_blank"
            rel="noreferrer"
            title="Enviar por WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="relative mt-4 flex-1 min-h-0">
        {showTopFade ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7 bg-gradient-to-b from-card to-transparent" />
        ) : null}
        {showBottomFade ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-card to-transparent" />
        ) : null}

        <div
          ref={scrollRef}
          onScroll={updateFades}
          className="relative z-0 h-full overflow-y-auto no-scrollbar"
        >
          {stops.length ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={stops.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2 pr-2">
                  {stops.map((stop, index) => (
                    <SortableStopRow key={stop.id} stop={stop} index={index} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-sm text-muted-foreground">
              Agrega direcciones para comenzar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
