"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Layers } from "lucide-react";
import { useRouteStore } from "@/lib/routeStore";

type Profile = "habitual" | "peak";
type Street = { name: string; highway: string; osmId: string; oneway: string; reasons?: string[]; habitual: number[]; peak: number[] };
type Streets = { metadata?: { profiles?: Partial<Record<Profile, { config?: { spatial?: { speed_factors?: Record<string, number> } } }>> }; type: "FeatureCollection"; features: { type: "Feature"; geometry: { type: "LineString"; coordinates: [number, number][] }; properties: Street }[] };
// Intensity is the spatial slowdown, independent of road class or legal limit.
function heat(street: Street, profile: Profile, data: Streets) {
  const factors = data.metadata?.profiles?.[profile]?.config?.spatial?.speed_factors;
  const keys: Record<string, string> = {
    Microcentro: "microcentro",
    "Cercanía a institución educativa": `school_${profile}`,
    "Cercanía a centro comercial": `retail_${profile}`,
  };
  if (!factors) return { color: "#94a3b8", intensity: 0, label: "Sin información espacial" };
  const factor = (street.reasons ?? []).reduce((value, reason) => value * (factors[keys[reason]] ?? 1), 1);
  const intensity = Math.max(0, Math.min(1, 1 - factor));
  if (intensity >= 0.35) return { color: "#dc2626", intensity, label: "Alta" };
  if (intensity >= 0.2) return { color: "#f97316", intensity, label: "Media-alta" };
  if (intensity >= 0.1) return { color: "#eab308", intensity, label: "Media" };
  if (intensity > 0) return { color: "#84cc16", intensity, label: "Leve" };
  return { color: "#94a3b8", intensity: 0, label: "Sin incremento espacial estimado" };
}

export function TrafficOverlay() {
  const map = useMap();
  const [enabled, setEnabled] = useState(false);
  const startTime = useRouteStore((state) => state.startTime);
  const hour = startTime ? Number(startTime.slice(0, 2)) : null;
  const profile: Profile = hour !== null && ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 20)) ? "peak" : "habitual";
  const [data, setData] = useState<Streets | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);




  useEffect(() => {
    if (!enabled || data) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/traffic-overlay", { signal: controller.signal });
        if (!response.ok) throw new Error(await response.text());
        const json = await response.json() as Streets;
        if (json.type !== "FeatureCollection" || !Array.isArray(json.features)) throw new Error("La capa tiene un formato inválido.");
        if (!controller.signal.aborted) setData(json);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "No se pudo cargar la capa.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [enabled, data]);

  useEffect(() => {
    if (!enabled || !data) return;
    const paneName = "traffic-assumptions";
    const pane = map.getPane(paneName) ?? map.createPane(paneName);
    pane.style.zIndex = "350"; // debajo de rutas y marcadores
    const renderer = L.canvas({ pane: paneName, padding: 0.2 });
    const halo = L.geoJSON(data, {
      pane: paneName,
      interactive: false,
      filter: (feature) => heat(feature.properties as Street, profile, data).intensity > 0,
      style: (feature) => {
        const h = heat(feature?.properties as Street, profile, data);
        return { renderer, color: h.color, weight: 12, opacity: 0.12 + h.intensity * 0.25 };
      },
    }).addTo(map);
    const layer = L.geoJSON(data, {
      pane: paneName,
      style: (feature) => {
        const h = heat(feature?.properties as Street, profile, data);
        return { renderer, color: h.color, weight: h.intensity > 0 ? 3.5 : 1, opacity: h.intensity > 0 ? 0.9 : 0.18 };
      },
      onEachFeature: (feature, street) => {
        const p = feature.properties;
        const speeds = p[profile];
        const h = heat(p as Street, profile, data);
        const content = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = p.name;
        content.append(title, document.createElement("br"));
        content.append(document.createTextNode(`Concurrencia estimada: ${h.label}. Reducción espacial de velocidad: ${Math.round(h.intensity * 100)}%.`), document.createElement("br"));
        content.append(document.createTextNode(`${profile === "peak" ? "Hora pico" : "Habitual"}: ${speeds[0]} / ${speeds[1]} km/h. Tipo: ${p.highway}.`));
        content.append(document.createElement("br"), document.createTextNode((p.reasons ?? []).length ? `Factores: ${(p.reasons ?? []).join(", ")}.` : "Sin factor espacial adicional."));
        content.append(document.createElement("br"), document.createTextNode("Rojo: mayor efecto espacial estimado; gris: sin incremento modelado. Supuestos sin calibrar, no mediciones de concurrencia."));
        street.bindPopup(content);
      },
    }).addTo(map);
    return () => { layer.remove(); halo.remove(); renderer.remove(); };
  }, [data, enabled, map, profile]);

  return createPortal(
    <button type="button" aria-pressed={enabled} onClick={(event) => { event.stopPropagation(); setEnabled(!enabled); }} aria-label="Mapa de concurrencia estimada" title={error ?? (loading ? "Cargando mapa de calor…" : `${enabled ? "Ocultar" : "Mostrar"} concurrencia estimada · ${profile === "peak" ? "Hora pico" : "Habitual"} · Supuestos sin calibrar`)} className={`absolute bottom-7 left-3 z-[1000] flex h-11 w-11 items-center justify-center rounded-full border shadow-lg ${enabled ? "border-sky-700 bg-sky-700 text-white" : "border-black/20 bg-white text-slate-800"}`}>
      <Layers aria-hidden="true" size={20} className={loading ? "animate-pulse" : ""} />
      {error && <span role="alert" className="sr-only">{error}</span>}
    </button>, map.getContainer(),
  );
}
