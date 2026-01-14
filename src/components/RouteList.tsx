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
  Clock,
  GripVertical,
  BookmarkPlus,
  Loader2,
  Navigation,
  Trash2,
  Wand2,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Tooltip } from "@/components/Tooltip";
import { TimeRestrictionEditor } from "@/components/TimeRestrictionEditor";
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

function formatTimeRestriction(stop: Stop): string | null {
  if (!stop.timeRestriction) return null;
  const typeLabel = stop.timeRestrictionType === "after" ? "Después de" : "Antes de";
  return `${typeLabel} ${stop.timeRestriction}`;
}

function SortableStopRow({ stop, index }: { stop: Stop; index: number }) {
  const removeStop = useRouteStore((s) => s.removeStop);
  const updateStopRestriction = useRouteStore((s) => s.updateStopRestriction);
  const addPlace = useAgendaStore((s) => s.addPlace);
  const places = useAgendaStore((s) => s.places);

  const [showTimeEditor, setShowTimeEditor] = useState(false);

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

  const timeRestrictionText = formatTimeRestriction(stop);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "relative flex items-start gap-3 rounded-lg border border-border bg-card/70 p-3" +
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
        {timeRestrictionText && (
          <div className="flex items-center gap-1 mt-1 text-xs text-primary font-medium">
            <Clock className="h-3 w-3" />
            <span>{timeRestrictionText}</span>
          </div>
        )}
      </div>

      <Tooltip content="Restricción horaria" side="top" align="end">
        <button
          type="button"
          className={
            "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring " +
            (stop.timeRestriction
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground hover:bg-muted hover:text-foreground")
          }
          onClick={() => setShowTimeEditor((v) => !v)}
          aria-label="Agregar restricción horaria"
        >
          <Clock className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Eliminar" side="top" align="end">
        <button
          type="button"
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => removeStop(stop.id)}
          aria-label="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Guardar en agenda" side="top" align="end">
        <button
          type="button"
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            const initial = stop.label?.trim() || "";
            const name = window.prompt(
              "Nombre para guardar en Agenda",
              initial
            );
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
        >
          <BookmarkPlus className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Arrastrar para reordenar" side="top" align="end">
        <button
          type="button"
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </Tooltip>

      {showTimeEditor && (
        <TimeRestrictionEditor
          time={stop.timeRestriction}
          type={stop.timeRestrictionType}
          onSave={(time, type) => updateStopRestriction(stop.id, time, type)}
          onClose={() => setShowTimeEditor(false)}
          stopLabel={agendaMatch ? agendaMatch.name : formatAddressShort(stop.label)}
        />
      )}
    </div>
  );
}

export function RouteList() {
  const stops = useRouteStore((s) => s.stops);
  const reorderStops = useRouteStore((s) => s.reorderStops);
  const setStops = useRouteStore((s) => s.setStops);
  const setRouteLine = useRouteStore((s) => s.setRouteLine);
  const latestDepartureTime = useRouteStore((s) => s.latestDepartureTime);
  const setLatestDepartureTime = useRouteStore((s) => s.setLatestDepartureTime);
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
        latestDepartureTime?: string | null;
      };

      const stopById = new Map(stops.map((s) => [s.id, s] as const));
      const ordered = data.orderedStopIds
        .map((id) => stopById.get(id))
        .filter(Boolean) as Stop[];

      if (ordered.length === stops.length) setStops(ordered);
      setRouteLine(data.routeLine);
      setLatestDepartureTime(data.latestDepartureTime || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <div
      className="flex w-full flex-1 min-h-0 flex-col rounded-xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur"
      data-tour="route-list"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="grid w-full grid-cols-4 gap-2">
          <Tooltip
            content={optimizing ? "Optimizando..." : "Optimizar"}
            side="bottom"
            disabled={stops.length < 3 || optimizing}
          >
            <button
              type="button"
              onClick={optimize}
              disabled={stops.length < 3 || optimizing}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              aria-label="Optimizar"
              data-tour="optimize-route"
            >
              {optimizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {optimizing ? "Optimizando..." : "Optimizar"}
              </span>
            </button>
          </Tooltip>

          <Tooltip content="Limpiar" side="bottom" disabled={!stops.length}>
            <button
              type="button"
              onClick={clearAll}
              disabled={!stops.length}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              aria-label="Limpiar"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          </Tooltip>

          <div
            className="col-span-2 grid grid-cols-2 gap-2"
            data-tour="export-actions-plan"
          >
            <Tooltip
              content="Abrir en Google Maps"
              side="bottom"
              disabled={!googleMapsUrl}
            >
              <a
                className={
                  "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 outline-none focus-visible:ring-2 focus-visible:ring-ring" +
                  (!googleMapsUrl ? " pointer-events-none opacity-50" : "")
                }
                href={googleMapsUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir en Google Maps"
              >
                <Navigation className="h-4 w-4" />
                <span className="hidden sm:inline">Navegar</span>
              </a>
            </Tooltip>

            <Tooltip
              content="Enviar por WhatsApp"
              side="bottom"
              disabled={!stops.length}
            >
              <a
                className={
                  "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 outline-none focus-visible:ring-2 focus-visible:ring-ring" +
                  (!stops.length ? " pointer-events-none opacity-50" : "")
                }
                href={stops.length ? whatsappUrl : "#"}
                target="_blank"
                rel="noreferrer"
                aria-label="Enviar por WhatsApp"
              >
                <FaWhatsapp className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </Tooltip>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {latestDepartureTime && !error ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <Clock className="h-4 w-4 text-primary" />
          <p className="text-sm text-foreground">
            <span className="font-medium">Horario de partida límite:</span>{" "}
            <span className="font-semibold text-primary">{latestDepartureTime}</span>
            {" "}para cumplir con las restricciones horarias
          </p>
        </div>
      ) : null}

      <div className="relative mt-4 flex-1 min-h-0">
        {optimizing ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/85 backdrop-blur-md">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card/90 px-4 py-3 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="text-sm font-medium text-foreground">
                Optimizando ruta...
              </div>
            </div>
          </div>
        ) : null}

        {showTopFade ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7 bg-linear-to-b from-card to-transparent" />
        ) : null}
        {showBottomFade ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-linear-to-t from-card to-transparent" />
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
