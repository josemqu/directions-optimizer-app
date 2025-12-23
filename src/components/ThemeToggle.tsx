"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";
type ThemePalette = "slate" | "emerald" | "rose" | "violet";

function getPreferredMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const storedMode = window.localStorage.getItem("theme-mode");
  if (storedMode === "light" || storedMode === "dark") return storedMode;

  const legacy = window.localStorage.getItem("theme");
  if (legacy === "light" || legacy === "dark") return legacy;

  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getPreferredPalette(): ThemePalette {
  if (typeof window === "undefined") return "slate";

  const stored = window.localStorage.getItem("theme-palette");
  if (
    stored === "slate" ||
    stored === "emerald" ||
    stored === "rose" ||
    stored === "violet"
  ) {
    return stored;
  }
  return "slate";
}

function applyMode(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function applyPalette(palette: ThemePalette) {
  const root = document.documentElement;
  root.setAttribute("data-theme", palette);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [palette, setPalette] = useState<ThemePalette>("slate");

  useEffect(() => {
    const m = getPreferredMode();
    const p = getPreferredPalette();
    setMode(m);
    setPalette(p);
    applyPalette(p);
    applyMode(m);
  }, []);

  function toggle() {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyMode(next);
    window.localStorage.setItem("theme-mode", next);
    window.localStorage.removeItem("theme");
  }

  function onPaletteChange(next: ThemePalette) {
    setPalette(next);
    applyPalette(next);
    window.localStorage.setItem("theme-palette", next);
  }

  const isDark = mode === "dark";

  return (
    <div className="flex items-center gap-2">
      <select
        value={palette}
        onChange={(e) => onPaletteChange(e.target.value as ThemePalette)}
        className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        aria-label="Tema de color"
        title="Tema de color"
      >
        <option value="slate">Slate</option>
        <option value="emerald">Emerald</option>
        <option value="rose">Rose</option>
        <option value="violet">Violet</option>
      </select>

      <button
        type="button"
        onClick={toggle}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
        aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        title={isDark ? "Modo oscuro" : "Modo claro"}
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
    </div>
  );
}
