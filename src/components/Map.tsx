"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import type { LatLng } from "@/lib/routeStore";
import { useRouteStore } from "@/lib/routeStore";

const defaultCenter: LatLng = { lat: -34.6037, lng: -58.3816 };

function createNumberedIcon(n: number) {
  const html = `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      background: #111827;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      border: 2px solid white;
      box-shadow: 0 6px 20px rgba(0,0,0,.25);
    ">${n}</div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

export function Map() {
  const stops = useRouteStore((s) => s.stops);
  const routeLine = useRouteStore((s) => s.routeLine);

  const [icons, setIcons] = useState<L.DivIcon[]>([]);

  useEffect(() => {
    setIcons(stops.map((_, idx) => createNumberedIcon(idx + 1)));
  }, [stops]);

  const center = useMemo(() => {
    if (!stops.length) return defaultCenter;
    return stops[0].position;
  }, [stops]);

  const polyline = useMemo(
    () => routeLine.map((p) => [p.lat, p.lng] as [number, number]),
    [routeLine]
  );

  return (
    <div className="w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="h-[520px] w-full">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          scrollWheelZoom
          className="h-full w-full"
        >
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
                {idx + 1}. {s.label}
              </Tooltip>
            </Marker>
          ))}

          {polyline.length >= 2 ? (
            <Polyline
              pathOptions={{ color: "#111827", weight: 5 }}
              positions={polyline}
            />
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
