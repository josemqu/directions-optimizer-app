"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  CircleHelp,
  ListChecks,
  Map as MapIcon,
  Navigation,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { AddressInput } from "@/components/AddressInput";
import { RouteList } from "@/components/RouteList";
import { AppShell } from "@/components/AppShell";
import { BottomNav, type BottomNavItem } from "@/components/BottomNav";
import { AppTour } from "@/components/AppTour";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip } from "@/components/Tooltip";
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

  const [isMobile, setIsMobile] = useState(false);

  const [tourOpen, setTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const tourSteps = useMemo(
    () =>
      [
        {
          key: "address",
          selector: "[data-tour='address-input']",
          title: "Agregá paradas",
          body: "Buscá una dirección, agregala como parada y repetí para armar tu lista.",
          placement: "bottom" as const,
        },
        {
          key: "route",
          selector: "[data-tour='route-list']",
          title: "Reordená la lista",
          body: "Podés arrastrar las paradas para cambiar el orden antes de optimizar.",
          placement: "top" as const,
        },
        {
          key: "optimize",
          selector: "[data-tour='optimize-route']",
          title: "Optimizá",
          body: "Cuando tengas al menos 3 paradas, tocá “Optimizar” para calcular un mejor orden.",
          placement: "bottom" as const,
        },
        ...(isMobile
          ? [
              {
                key: "map-tab",
                selector: "[data-tour='bottom-nav-map']",
                title: "Mirá el mapa",
                body: "Cambiá a la pestaña Mapa para ver la ruta y los pins.",
                placement: "top" as const,
              },
            ]
          : []),
        {
          key: "map",
          selector: "[data-tour='map']",
          title: "Visualizá la ruta",
          body: "Acá ves las paradas y la línea de ruta. Si optimizás, la polilínea se actualiza.",
          placement: "left" as const,
        },
        {
          key: "export",
          selector: isMobile
            ? "[data-tour='export-actions-map']"
            : "[data-tour='export-actions-plan']",
          title: "Exportá",
          body: "Abrí la navegación en Google Maps o compartí la lista por WhatsApp.",
          placement: "top" as const,
        },
      ].filter(Boolean),
    [isMobile]
  );

  const tourStepKey = tourSteps[tourStepIndex]?.key;

  function startTour() {
    setActive("plan");
    setTourStepIndex(0);
    setTourOpen(true);
  }

  useEffect(() => {
    if (!tourOpen) return;
    if (tourStepIndex < tourSteps.length) return;
    setTourStepIndex(Math.max(0, tourSteps.length - 1));
  }, [tourOpen, tourStepIndex, tourSteps.length]);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem("app-tour-seen");
      if (!seen) {
        startTour();
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!tourOpen) return;
    if (
      tourStepKey === "map" ||
      tourStepKey === "export" ||
      tourStepKey === "map-tab"
    ) {
      setActive("map");
    } else {
      setActive("plan");
    }
  }, [tourOpen, tourStepKey]);

  function openTour() {
    startTour();
  }

  function closeTour() {
    setTourOpen(false);
    try {
      window.localStorage.setItem("app-tour-seen", "1");
    } catch {
      // ignore
    }
  }

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
          <Tooltip content="Inicio" side="bottom">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Ir al inicio"
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
          </Tooltip>
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
      topRight={
        <div className="flex items-center gap-2">
          <Tooltip content="Guía paso a paso" side="bottom" align="end">
            <button
              type="button"
              onClick={openTour}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Guía paso a paso"
            >
              <CircleHelp className="h-4 w-4" />
              <span className="hidden sm:inline">Guía</span>
            </button>
          </Tooltip>
          <ThemeToggle />
        </div>
      }
      bottomNav={
        <BottomNav items={navItems} activeKey={active} onChange={setActive} />
      }
    >
      <AppTour
        open={tourOpen}
        stepIndex={tourStepIndex}
        onStepIndexChange={setTourStepIndex}
        onClose={closeTour}
        steps={tourSteps}
      />

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

            {active === "map" ? (
              <div
                className="sm:hidden absolute right-3 z-40"
                style={{ top: 104 }}
                aria-label="Acciones de mapa"
                data-tour="export-actions-map"
              >
                <div className="leaflet-bar">
                  <Tooltip
                    content="Navegar"
                    side="left"
                    disabled={stops.length < 2}
                  >
                    <a
                      className={
                        "inline-flex items-center justify-center" +
                        (stops.length < 2
                          ? " pointer-events-none opacity-50"
                          : "")
                      }
                      href={buildGoogleMapsUrl(stops) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Navegar"
                    >
                      <Navigation className="h-5 w-5" />
                    </a>
                  </Tooltip>

                  <Tooltip
                    content="Enviar por WhatsApp"
                    side="left"
                    disabled={!stops.length}
                  >
                    <a
                      className={
                        "inline-flex items-center justify-center" +
                        (!stops.length ? " pointer-events-none opacity-50" : "")
                      }
                      href={stops.length ? buildWhatsAppUrl(stops) : "#"}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Enviar por WhatsApp"
                    >
                      <FaWhatsapp className="h-5 w-5" />
                    </a>
                  </Tooltip>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
