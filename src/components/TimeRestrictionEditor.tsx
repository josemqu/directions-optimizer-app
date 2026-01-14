"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
import { Tooltip } from "@/components/Tooltip";

type Props = {
  time?: string;
  type?: "before" | "after";
  onSave: (time: string | undefined, type: "before" | "after") => void;
  onClose: () => void;
  stopLabel: string;
};

export function TimeRestrictionEditor({ time, type = "before", onSave, onClose, stopLabel }: Props) {
  const [localTime, setLocalTime] = useState(time || "09:00");
  const [localType, setLocalType] = useState<"before" | "after">(type);

  function handleSave() {
    onSave(localTime, localType);
    onClose();
  }

  function handleClear() {
    onSave(undefined, "before");
    onClose();
  }

  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-background p-3 shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Restricción horaria</span>
        </div>
        <Tooltip content="Cerrar" side="bottom" align="end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      <div className="text-xs text-muted-foreground mb-3 truncate">
        {stopLabel}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <select
            value={localType}
            onChange={(e) => setLocalType(e.target.value as "before" | "after")}
            className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="before">Llegar antes de</option>
            <option value="after">Llegar después de</option>
          </select>
          <input
            type="time"
            value={localTime}
            onChange={(e) => setLocalTime(e.target.value)}
            className="h-9 w-28 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sin restricción
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
