"use client";

import { useEffect, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip as LeafletTooltip,
} from "react-leaflet";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { BiSolidFlagCheckered } from "react-icons/bi";
import { Navigation } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Tooltip } from "@/components/Tooltip";
import type { LatLng } from "@/lib/routeStore";
import { useRouteStore } from "@/lib/routeStore";
import { buildGoogleMapsUrl, buildWhatsAppUrl } from "@/lib/exportUtils";

const defaultCenter: LatLng = { lat: -38.0055, lng: -57.5426 };

function createPinIcon(params: {
  topFill: string;
  innerHtml: string;
  label: string;
  innerBg?: string;
  innerColor?: string;
}) {
  const innerBg = params.innerBg ?? "#0a0a0a";
  const innerColor = params.innerColor ?? "#ffffff";
  const svg = `
    <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg" aria-label="${params.label}">
      <path d="M17 44C17 44 2 27.4 2 17C2 7.6 9.6 0 19 0C28.4 0 34 7.6 34 17C34 27.4 17 44 17 44Z" fill="${params.topFill}"/>
      <path d="M17 41.2C20.2 37.4 31.2 23.6 31.2 17C31.2 9.2 25 3 17.2 3C9.4 3 3.2 9.2 3.2 17C3.2 23.6 14.2 37.4 17 41.2Z" fill="${params.topFill}"/>
      <circle cx="18" cy="16" r="10" fill="#0a0a0a" opacity="0.22"/>
      <circle cx="18" cy="16" r="9" fill="#0a0a0a" opacity="0.18"/>
      <foreignObject x="9" y="7" width="18" height="18">
        <div xmlns="http://www.w3.org/1999/xhtml" style="
          width:18px;height:18px;border-radius:9999px;
          background:${innerBg};
          display:flex;align-items:center;justify-content:center;
          color:${innerColor};font-weight:800;font-size:11px;
        ">
          ${params.innerHtml}
        </div>
      </foreignObject>
    </svg>
  `;

  return L.divIcon({
    html: `
      <div style="
        width: 34px;
        height: 44px;
        transform: translate3d(0,0,0);
        filter: drop-shadow(0 10px 18px rgba(0,0,0,.35));
      ">${svg}</div>
    `,
    className: "",
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    tooltipAnchor: [0, -30],
  });
}

function createNumberedIcon(n: number) {
  return createPinIcon({
    topFill: "#ffffff",
    innerHtml: String(n),
    label: `Stop ${n}`,
  });
}

function createStartIcon() {
  return createPinIcon({
    topFill: "#ffffff",
    innerHtml: "1",
    label: "Inicio",
    innerBg: "hsl(var(--primary))",
    innerColor: "hsl(var(--primary-foreground))",
  });
}

function createFinishIcon() {
  const flag = renderToStaticMarkup(
    <span style={{ color: "#ffffff", display: "inline-flex" }}>
      <BiSolidFlagCheckered size={14} />
    </span>,
  );
  return createPinIcon({
    topFill: "#a1a1aa",
    innerHtml: flag,
    label: "Finish",
  });
}

function FitBoundsToStops(props: {
  active: boolean;
  stops: { position: LatLng }[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!props.stops.length) return;

    const isMapVisible = () => {
      const container = map.getContainer?.();
      if (!container) return false;
      return container.offsetParent !== null;
    };

    const canFit = () => props.active || isMapVisible();

    const fit = () => {
      if (!canFit()) return;
      if (!props.stops.length) return;

      if (props.stops.length === 1) {
        const p = props.stops[0].position;
        map.setView([p.lat, p.lng], Math.max(map.getZoom(), 14), {
          animate: false,
        });
        return;
      }

      const bounds = L.latLngBounds(
        props.stops.map(
          (s) => [s.position.lat, s.position.lng] as [number, number],
        ),
      );
      map.fitBounds(bounds, {
        padding: [24, 24],
        maxZoom: 16,
        animate: false,
      });
    };

    let t1: number | undefined;
    let t2: number | undefined;
    let raf: number | undefined;

    const schedule = () => {
      if (!canFit()) return;
      map.invalidateSize({ animate: false });
      raf = window.requestAnimationFrame(() => {
        fit();
        t1 = window.setTimeout(fit, 0);
        t2 = window.setTimeout(fit, 250);
      });
    };

    map.whenReady(schedule);

    const onPageShow = () => {
      schedule();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") schedule();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const container = map.getContainer?.();
    if (container) {
      const ro = new ResizeObserver(() => {
        schedule();
      });
      ro.observe(container);

      return () => {
        ro.disconnect();
        window.removeEventListener("pageshow", onPageShow);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        if (typeof raf === "number") window.cancelAnimationFrame(raf);
        if (typeof t1 === "number") window.clearTimeout(t1);
        if (typeof t2 === "number") window.clearTimeout(t2);
      };
    }

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (typeof raf === "number") window.cancelAnimationFrame(raf);
      if (typeof t1 === "number") window.clearTimeout(t1);
      if (typeof t2 === "number") window.clearTimeout(t2);
    };
  }, [map, props.active, props.stops]);

  return null;
}

function getThemePolylineColor() {
  if (typeof window === "undefined") return "#38bdf8";

  const root = document.documentElement;
  const css = window.getComputedStyle(root);
  const primary = css.getPropertyValue("--primary").trim();
  if (primary) return `hsl(${primary})`;
  return "#38bdf8";
}

function InvalidateSizeOnActive({ active }: { active: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;

    const invalidate = () => {
      map.invalidateSize({ animate: false });
    };

    const t1 = window.setTimeout(invalidate, 0);
    const t2 = window.setTimeout(invalidate, 250);

    window.addEventListener("resize", invalidate);
    window.addEventListener("orientationchange", invalidate);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("orientationchange", invalidate);
    };
  }, [active, map]);

  return null;
}

export function Map(props: { active?: boolean }) {
  const active = props.active ?? true;
  const stops = useRouteStore((s) => s.stops);
  const routeLine = useRouteStore((s) => s.routeLine);
  const legDurationsSeconds = useRouteStore((s) => s.legDurationsSeconds);

  const [polylineColor, setPolylineColor] = useState<string>(
    getThemePolylineColor(),
  );

  useEffect(() => {
    setPolylineColor(getThemePolylineColor());

    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setPolylineColor(getThemePolylineColor());
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === "theme-palette" || e.key === "theme-mode") {
        setPolylineColor(getThemePolylineColor());
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const icons = useMemo(() => {
    if (!stops.length) return [];
    if (stops.length === 1) return [createStartIcon()];

    return stops.map((_, idx) => {
      if (idx === 0) return createStartIcon();
      if (idx === stops.length - 1) return createFinishIcon();
      return createNumberedIcon(idx + 1);
    });
  }, [stops]);

  const center = useMemo(() => {
    if (!stops.length) return defaultCenter;
    return stops[0].position;
  }, [stops]);

  const polyline = useMemo(() => {
    const cleanedRouteLine = routeLine
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .filter(
        (p) => p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180,
      )
      .map((p) => [p.lat, p.lng] as [number, number]);

    if (cleanedRouteLine.length >= 2) {
      return cleanedRouteLine;
    }

    if (stops.length >= 2) {
      return stops.map(
        (s) => [s.position.lat, s.position.lng] as [number, number],
      );
    }

    return [];
  }, [routeLine, stops]);

  const routePoints = useMemo(() => {
    const pts = routeLine
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .filter(
        (p) => p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180,
      );
    return pts.length >= 2 ? pts : [];
  }, [routeLine]);

  function haversineMeters(a: LatLng, b: LatLng): number {
    const R = 6371000;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLng / 2);
    const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function findNearestIndex(points: LatLng[], target: LatLng): number {
    let bestIdx = 0;
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < points.length; i++) {
      const d = haversineMeters(points[i], target);
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  function pointHalfwayAlong(
    points: LatLng[],
    aIdx: number,
    bIdx: number,
  ): LatLng | null {
    if (points.length < 2) return null;
    if (aIdx === bIdx) return points[aIdx] ?? null;

    const start = Math.min(aIdx, bIdx);
    const end = Math.max(aIdx, bIdx);
    if (end - start < 1) return points[start] ?? null;

    let total = 0;
    for (let i = start; i < end; i++) {
      total += haversineMeters(points[i], points[i + 1]);
    }
    if (!Number.isFinite(total) || total <= 0)
      return points[Math.floor((start + end) / 2)] ?? null;

    const target = total / 2;
    let acc = 0;
    for (let i = start; i < end; i++) {
      const seg = haversineMeters(points[i], points[i + 1]);
      if (!Number.isFinite(seg) || seg <= 0) continue;
      if (acc + seg >= target) {
        const t = (target - acc) / seg;
        const p1 = points[i];
        const p2 = points[i + 1];
        return {
          lat: p1.lat + (p2.lat - p1.lat) * t,
          lng: p1.lng + (p2.lng - p1.lng) * t,
        };
      }
      acc += seg;
    }

    return points[Math.floor((start + end) / 2)] ?? null;
  }

  function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return "";
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  const durationLabels = useMemo(() => {
    if (stops.length < 2) return [] as Array<{ pos: LatLng; text: string }>;
    if (!Array.isArray(legDurationsSeconds) || !legDurationsSeconds.length)
      return [] as Array<{ pos: LatLng; text: string }>;

    const labels: Array<{ pos: LatLng; text: string }> = [];
    const count = Math.min(stops.length - 1, legDurationsSeconds.length);
    for (let i = 0; i < count; i++) {
      const sec = legDurationsSeconds[i];
      if (!Number.isFinite(sec) || sec <= 0) continue;
      const a = stops[i]?.position;
      const b = stops[i + 1]?.position;
      if (!a || !b) continue;

      let pos: LatLng = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
      if (routePoints.length >= 2) {
        const ai = findNearestIndex(routePoints, a);
        const bi = findNearestIndex(routePoints, b);
        const p = pointHalfwayAlong(routePoints, ai, bi);
        if (p) pos = p;
      }

      labels.push({ pos, text: formatDuration(sec) });
    }
    return labels;
  }, [stops, legDurationsSeconds, routePoints]);

  const durationIcons = useMemo(() => {
    return durationLabels.map((l) =>
      L.divIcon({
        html: `
          <div style="
            display:inline-flex;align-items:center;justify-content:center;
            padding:4px 10px;border-radius:9999px;
            background:rgba(255,255,255,.92);
            border:1px solid rgba(0,0,0,.18);
            box-shadow:0 6px 14px rgba(0,0,0,.18);
            font-size:12px;font-weight:700;color:#111827;
            backdrop-filter: blur(6px);
            white-space:nowrap;
          ">
            ${l.text}
          </div>
        `,
        className: "",
        iconSize: undefined,
      }),
    );
  }, [durationLabels]);

  const googleMapsUrl = buildGoogleMapsUrl(stops);
  const whatsappUrl = buildWhatsAppUrl(stops);

  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-border bg-card/70 shadow-sm backdrop-blur lg:h-full lg:min-h-0"
      data-tour="map"
    >
      <div className="h-[calc(100dvh-190px)] min-h-[360px] w-full sm:h-[50vh] sm:min-h-[320px] lg:h-full lg:min-h-0">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          scrollWheelZoom
          className="h-full w-full"
        >
          <InvalidateSizeOnActive active={active} />
          <FitBoundsToStops active={active} stops={stops} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {stops.map((s, idx) => (
            <Marker
              key={s.id}
              position={[s.position.lat, s.position.lng]}
              icon={icons[idx]}
            >
              <LeafletTooltip direction="top" offset={[0, -12]} opacity={1}>
                {idx === 0
                  ? `Inicio: ${s.label}`
                  : idx === stops.length - 1
                    ? `Fin: ${s.label}`
                    : `${idx + 1}. ${s.label}`}
              </LeafletTooltip>
            </Marker>
          ))}

          {polyline.length >= 2 ? (
            <Polyline
              pathOptions={{ color: polylineColor, weight: 5, opacity: 0.85 }}
              positions={polyline}
            />
          ) : null}

          {durationLabels.map((l, idx) => (
            <Marker
              key={`leg-${idx}`}
              position={[l.pos.lat, l.pos.lng]}
              icon={durationIcons[idx]}
              interactive={false}
              zIndexOffset={800}
            />
          ))}
        </MapContainer>
      </div>

      <div
        className="absolute right-3 top-[calc(0.75rem+92px)] z-[1000] flex flex-col gap-2"
        data-tour="export-actions-map"
      >
        <div className="leaflet-bar !border-none flex flex-col gap-0 overflow-hidden rounded-sm border border-black/20 bg-white shadow-[0_1px_5px_rgba(0,0,0,0.65)]">
          <a
            className={
              "flex h-[34px] w-[34px] items-center justify-center bg-white text-black hover:bg-gray-100 transition-colors" +
              (!googleMapsUrl ? " pointer-events-none opacity-50" : "")
            }
            href={googleMapsUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            aria-label="Navegar"
          >
            <Navigation className="h-5 w-5" />
          </a>

          <a
            className={
              "flex h-[34px] w-[34px] items-center justify-center bg-white text-black hover:bg-gray-100 transition-colors !border-0 border-t border-black/20" +
              (!stops.length ? " pointer-events-none opacity-50" : "")
            }
            href={stops.length ? whatsappUrl : "#"}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
          >
            <FaWhatsapp className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
}
