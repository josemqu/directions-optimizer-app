"use client";

import { useState } from "react";
import { Clock, Plus, Trash2, X } from "lucide-react";
import { Tooltip } from "@/components/Tooltip";
import type { OpeningHoursRange } from "@/lib/agendaStore";

type Props = {
  hours: OpeningHoursRange[];
  onChange: (hours: OpeningHoursRange[]) => void;
  onClose: () => void;
  placeName: string;
};

export function OpeningHoursEditor({ hours, onChange, onClose, placeName }: Props) {
  const [localHours, setLocalHours] = useState<OpeningHoursRange[]>(
    hours.length ? hours : [{ start: "09:00", end: "18:00" }]
  );

  function addRange() {
    setLocalHours((prev) => [...prev, { start: "09:00", end: "18:00" }]);
  }

  function removeRange(index: number) {
    setLocalHours((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRange(index: number, field: "start" | "end", value: string) {
    setLocalHours((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function handleSave() {
    // Filter out invalid ranges
    const validHours = localHours.filter((r) => r.start && r.end && r.start < r.end);
    onChange(validHours);
    onClose();
  }

  function handleClear() {
    onChange([]);
    onClose();
  }

  return (
    <div className="border-b border-border p-3">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Horarios de atención</span>
        </div>
        <Tooltip content="Cerrar" side="bottom" align="end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Cerrar editor de horarios"
          >
            <X className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      <div className="text-xs text-muted-foreground mb-2 truncate">
        {placeName}
      </div>

      <div className="space-y-2">
        {localHours.map((range, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="time"
              value={range.start}
              onChange={(e) => updateRange(index, "start", e.target.value)}
              className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-muted-foreground text-sm">a</span>
            <input
              type="time"
              value={range.end}
              onChange={(e) => updateRange(index, "end", e.target.value)}
              className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <Tooltip content="Eliminar rango" side="top">
              <button
                type="button"
                onClick={() => removeRange(index)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Eliminar rango horario"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Tooltip content="Agregar otro rango horario" side="bottom">
          <button
            type="button"
            onClick={addRange}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" />
            Agregar rango
          </button>
        </Tooltip>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sin horarios
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
