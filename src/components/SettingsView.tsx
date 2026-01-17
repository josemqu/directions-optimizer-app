"use client";

import { Clock, X, Settings as SettingsIcon } from "lucide-react";
import { Tooltip } from "@/components/Tooltip";
import { useRouteStore } from "@/lib/routeStore";

export function SettingsView(props: { active?: boolean }) {
  const { active } = props;
  const startTime = useRouteStore((s) => s.startTime);
  const setStartTime = useRouteStore((s) => s.setStartTime);
  const serviceTimeMinutes = useRouteStore((s) => s.serviceTimeMinutes);
  const setServiceTimeMinutes = useRouteStore((s) => s.setServiceTimeMinutes);

  void active;

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col rounded-xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold tracking-tight">
          Configuraciones
        </h2>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2">
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

        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2">
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
      </div>
    </div>
  );
}
