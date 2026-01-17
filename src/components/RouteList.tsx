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
  X,
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

function formatTimeRestriction(stop: Stop): string | null {
  if (!stop.timeRestriction) return null;
  const typeLabel =
    stop.timeRestrictionType === "after" ? "Después de" : "Antes de";
  return `${typeLabel} ${stop.timeRestriction}`;
}

function SortableStopRow({ stop, index }: { stop: Stop; index: number }) {
  const removeStop = useRouteStore((s) => s.removeStop);
  const updateStopRestriction = useRouteStore((s) => s.updateStopRestriction);
  const addPlace = useAgendaStore((s) => s.addPlace);
  const places = useAgendaStore((s) => s.places);

  const [showTimeEditor, setShowTimeEditor] = useState(false);
  const [agendaSaveOpen, setAgendaSaveOpen] = useState(false);
  const [agendaSaveName, setAgendaSaveName] = useState("");

  const agendaMatch =
    stop.kind === "gps"
      ? null
      : (places.find(
          (p) =>
            p.position.lat === stop.position.lat &&
            p.position.lng === stop.position.lng,
        ) ?? null);

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

  useEffect(() => {
    if (!agendaSaveOpen) return;
    const initial = stop.label?.trim() || "";
    setAgendaSaveName(initial);
  }, [agendaSaveOpen, stop.label]);

  function confirmAgendaSave() {
    const name = agendaSaveName.trim();
    if (!name) return;

    const place: AgendaPlace = {
      id: nanoid(),
      name,
      label: stop.label,
      position: stop.position,
      createdAt: Date.now(),
    };
    addPlace(place);
    setAgendaSaveOpen(false);
    setAgendaSaveName("");
  }

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
          onClick={() => setAgendaSaveOpen(true)}
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
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setShowTimeEditor(false)}
            aria-hidden
          />
          <div
            className="relative w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <TimeRestrictionEditor
              time={stop.timeRestriction}
              type={stop.timeRestrictionType}
              onSave={(time, type) =>
                updateStopRestriction(stop.id, time, type)
              }
              onClose={() => setShowTimeEditor(false)}
              stopLabel={
                agendaMatch ? agendaMatch.name : formatAddressShort(stop.label)
              }
            />
          </div>
        </div>
      )}

      {agendaSaveOpen ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setAgendaSaveOpen(false)}
          />

          <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-lg font-semibold text-foreground">
              Guardar en agenda
            </div>
            <div className="mt-1 text-sm text-muted-foreground truncate">
              {formatAddressShort(stop.label)}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground">
                Nombre
              </label>
              <input
                value={agendaSaveName}
                onChange={(e) => setAgendaSaveName(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmAgendaSave();
                  if (e.key === "Escape") setAgendaSaveOpen(false);
                }}
              />
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={confirmAgendaSave}
                disabled={!agendaSaveName.trim()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setAgendaSaveOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RouteList() {
  const stops = useRouteStore((s) => s.stops);
  const reorderStops = useRouteStore((s) => s.reorderStops);
  const setStops = useRouteStore((s) => s.setStops);
  const setRouteLine = useRouteStore((s) => s.setRouteLine);
  const routeLine = useRouteStore((s) => s.routeLine);
  const savedRouteId = useRouteStore((s) => s.savedRouteId);
  const savedRouteName = useRouteStore((s) => s.savedRouteName);
  const setSavedRoute = useRouteStore((s) => s.setSavedRoute);
  const latestDepartureTime = useRouteStore((s) => s.latestDepartureTime);
  const setLatestDepartureTime = useRouteStore((s) => s.setLatestDepartureTime);
  const startTime = useRouteStore((s) => s.startTime);
  const setStartTime = useRouteStore((s) => s.setStartTime);
  const serviceTimeMinutes = useRouteStore((s) => s.serviceTimeMinutes);
  const setServiceTimeMinutes = useRouteStore((s) => s.setServiceTimeMinutes);
  const clearAll = useRouteStore((s) => s.clearAll);

  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  const hasTimeRestrictions = useMemo(
    () => stops.some((s) => Boolean(s.timeRestriction)),
    [stops],
  );

  useEffect(() => {
    if (!saveOpen) return;
    setSaveName(savedRouteName || "Mi Ruta");
  }, [saveOpen, savedRouteName]);

  async function saveAs() {
    const name = saveName.trim();
    if (!name) return;

    setSaving(true);
    try {
      const res = await fetch("/api/saved-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, stops, routeLine }),
      });
      if (res.status === 401) {
        alert("Debe iniciar sesión para guardar rutas");
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        alert("Error al guardar la ruta: " + (text || "Unknown error"));
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        route?: { id?: string; name?: string } | null;
      } | null;
      const id = String(data?.route?.id ?? "") || null;
      const routeName = String(data?.route?.name ?? "") || name;
      if (id) setSavedRoute(id, routeName);

      setSaveOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function saveOverwrite() {
    if (!savedRouteId) return;

    const name = saveName.trim();
    if (!name) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/saved-routes/${encodeURIComponent(savedRouteId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, stops, routeLine }),
        },
      );
      if (res.status === 401) {
        alert("Debe iniciar sesión para guardar rutas");
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        alert("Error al guardar la ruta: " + (text || "Unknown error"));
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        route?: { id?: string; name?: string } | null;
      } | null;
      const id = String(data?.route?.id ?? "") || savedRouteId;
      const routeName = String(data?.route?.name ?? "") || name;
      setSavedRoute(id, routeName);

      setSaveOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function optimize() {
    if (stops.length < 3) return;

    setOptimizing(true);
    setError(null);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops, startTime, serviceTimeMinutes }),
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
        <div className="grid w-full grid-cols-3 gap-2">
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

          <Tooltip
            content="Guardar Ruta"
            side="bottom"
            disabled={!stops.length}
          >
            <button
              type="button"
              onClick={() => setSaveOpen(true)}
              disabled={!stops.length}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              aria-label="Guardar Ruta"
            >
              <BookmarkPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Guardar</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-foreground">
          <span className="font-medium">Demora por parada (min):</span>
        </p>
        <input
          type="number"
          min={0}
          step={5}
          value={serviceTimeMinutes}
          onChange={(e) => setServiceTimeMinutes(Number(e.target.value))}
          className="ml-auto h-8 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Demora por parada en minutos"
        />
      </div>

      {hasTimeRestrictions ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-foreground">
            <span className="font-medium">Hora de inicio (opcional):</span>
          </p>
          <input
            type="time"
            value={startTime || ""}
            onChange={(e) => setStartTime(e.target.value || null)}
            className="ml-auto h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Hora de inicio"
          />
          <Tooltip content="Limpiar hora de inicio" side="bottom">
            <button
              type="button"
              onClick={() => setStartTime(null)}
              disabled={!startTime}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              aria-label="Limpiar hora de inicio"
            >
              <X className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      ) : null}

      {latestDepartureTime && !error && !startTime ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <Clock className="h-4 w-4 text-primary" />
          <p className="text-sm text-foreground">
            <span className="font-medium">Horario de partida límite:</span>{" "}
            <span className="font-semibold text-primary">
              {latestDepartureTime}
            </span>{" "}
            para cumplir con las restricciones horarias
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

      {saveOpen ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => (saving ? null : setSaveOpen(false))}
          />

          <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-lg font-semibold text-foreground">
              Guardar ruta
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {savedRouteId
                ? "Guardar cambios o guardar una copia"
                : "Elegí un nombre"}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground">
                Nombre
              </label>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                disabled={saving}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                placeholder="Mi Ruta"
              />
            </div>

            <div className="mt-6 flex flex-col gap-2">
              {savedRouteId ? (
                <button
                  type="button"
                  onClick={saveOverwrite}
                  disabled={saving || !saveName.trim()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Guardar
                </button>
              ) : null}

              <button
                type="button"
                onClick={saveAs}
                disabled={saving || !saveName.trim()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar como...
              </button>

              <button
                type="button"
                onClick={() => setSaveOpen(false)}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
