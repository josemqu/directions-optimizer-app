"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
} from "react-leaflet";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLng } from "@/lib/routeStore";
import { useRouteStore } from "@/lib/routeStore";

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
      <circle cx="17" cy="17" r="10" fill="#0a0a0a" opacity="0.22"/>
      <circle cx="17" cy="17" r="9" fill="#0a0a0a" opacity="0.18"/>
      <foreignObject x="8" y="8" width="18" height="18">
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
  const flag = `
    <svg width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 3v18" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <path d="M8 4h11l-2.5 3L19 10H8V4Z" fill="#ffffff" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M10 6h2v2h-2V6Zm2 2h2v2h-2V8Zm2-2h2v2h-2V6Z" fill="#0a0a0a"/>
    </svg>
  `;
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
          (s) => [s.position.lat, s.position.lng] as [number, number]
        )
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

  const [polylineColor, setPolylineColor] = useState<string>(
    getThemePolylineColor()
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
    if (routeLine.length >= 2) {
      return routeLine.map((p) => [p.lat, p.lng] as [number, number]);
    }

    if (stops.length >= 2) {
      return stops.map(
        (s) => [s.position.lat, s.position.lng] as [number, number]
      );
    }

    return [];
  }, [routeLine, stops]);

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
              <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                {idx === 0
                  ? `Inicio: ${s.label}`
                  : idx === stops.length - 1
                  ? `Fin: ${s.label}`
                  : `${idx + 1}. ${s.label}`}
              </Tooltip>
            </Marker>
          ))}

          {polyline.length >= 2 ? (
            <Polyline
              pathOptions={{ color: polylineColor, weight: 5, opacity: 0.85 }}
              positions={polyline}
            />
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
