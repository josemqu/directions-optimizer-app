"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  ListChecks,
  Map as MapIcon,
  MessageCircle,
  Navigation,
} from "lucide-react";
import { AddressInput } from "@/components/AddressInput";
import { RouteList } from "@/components/RouteList";
import { AppShell } from "@/components/AppShell";
import { BottomNav, type BottomNavItem } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Stop } from "@/lib/routeStore";
import { useRouteStore } from "@/lib/routeStore";

const Map = dynamic(() => import("@/components/Map").then((m) => m.Map), {
  ssr: false,
});

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
  const lines = stops.map((s, idx) => `${idx + 1}. ${s.label}`);
  if (gmaps) lines.push("", `Google Maps: ${gmaps}`);

  const text = lines.join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function ClientPage() {
  const [active, setActive] = useState<"plan" | "map">("plan");
  const stops = useRouteStore((s) => s.stops);

  const navItems = useMemo(
    (): BottomNavItem<"plan" | "map">[] => [
      {
        key: "plan",
        label: "Plan",
        icon: <ListChecks className="h-5 w-5" />,
      },
      {
        key: "map",
        label: "Mapa",
        icon: <MapIcon className="h-5 w-5" />,
      },
    ],
    []
  );

  return (
    <AppShell
      title={
        <span className="inline-flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Ir al inicio"
            title="Inicio"
          >
            <Image
              src="/pwa-192.png"
              alt="optiMapp"
              width={28}
              height={28}
              className="h-6 w-6 rounded-sm sm:h-7 sm:w-7"
              priority
            />
            <span className="leading-none">optiMapp</span>
          </Link>
          <a
            href="https://github.com/josemqu"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
            title="GitHub: josemqu"
          >
            by josemqu
          </a>
        </span>
      }
      subtitle="Agrega paradas, reordena, optimiza y exporta a Google Maps / WhatsApp."
      topRight={<ThemeToggle />}
      bottomNav={
        <BottomNav items={navItems} activeKey={active} onChange={setActive} />
      }
    >
      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-6">
        <section
          className={
            "flex min-h-0 flex-col gap-4 sm:gap-6 lg:overflow-hidden lg:pr-2 " +
            (active !== "plan" ? "hidden lg:flex" : "")
          }
          aria-label="Planificación"
        >
          <AddressInput />
          <RouteList />
        </section>

        <section
          className={
            "flex flex-col gap-3 sm:gap-6 lg:min-h-0 lg:h-full " +
            (active !== "map" ? "hidden lg:flex" : "")
          }
          aria-label="Mapa"
        >
          <div className="relative flex-1 lg:min-h-0 lg:h-full">
            <Map active={active === "map"} />
          </div>

          {active === "map" ? (
            <div
              className="sm:hidden fixed right-4 z-40"
              style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
              aria-label="Acciones de mapa"
            >
              <div className="leaflet-bar leaflet-bar-horizontal">
                <a
                  className={
                    "inline-flex items-center justify-center" +
                    (stops.length < 2 ? " pointer-events-none opacity-50" : "")
                  }
                  href={buildGoogleMapsUrl(stops) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Navegar"
                  title="Navegar"
                >
                  <Navigation className="h-5 w-5" />
                </a>

                <a
                  className={
                    "inline-flex items-center justify-center" +
                    (!stops.length ? " pointer-events-none opacity-50" : "")
                  }
                  href={stops.length ? buildWhatsAppUrl(stops) : "#"}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Enviar por WhatsApp"
                  title="Enviar por WhatsApp"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
