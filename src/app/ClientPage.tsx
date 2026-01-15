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
  Bookmark,
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
import { useAuth } from "@/lib/useAuth";
import { UserMenu } from "@/components/UserMenu";
import { AuthModal } from "@/components/AuthModal";
import { SyncManager } from "@/components/SyncManager";
import { SavedRoutesView } from "@/components/SavedRoutesView";
import { LogIn } from "lucide-react";

const Map = dynamic(() => import("@/components/Map").then((m) => m.Map), {
  ssr: false,
});

export function ClientPage() {
  const [active, setActive] = useState<"plan" | "map" | "saved">("plan");
  const stops = useRouteStore((s) => s.stops);

  const [isMobile, setIsMobile] = useState(false);

  const [savedModalOpen, setSavedModalOpen] = useState(false);

  const [tourOpen, setTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  const { user, loading: authLoading, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

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
          selector: "[data-tour='export-actions-map']",
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
    (): BottomNavItem<"plan" | "map" | "saved">[] => [
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
      {
        key: "saved",
        label: "Guardado",
        icon: <Bookmark className="h-5 w-5" />,
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
      topRight={
        <div className="flex items-center gap-2">
          {!isMobile && (
            <button
              type="button"
              onClick={() => setSavedModalOpen(true)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Ver rutas guardadas"
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Guardado</span>
            </button>
          )}
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

          {user ? <UserMenu user={user} signOut={signOut} /> : null}
          {!authLoading && !user && (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Ingresar</span>
            </button>
          )}
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

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {savedModalOpen && !isMobile ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSavedModalOpen(false)}
          />
          <div className="relative w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold tracking-tight">
                  Rutas Guardadas
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Cargá o eliminá rutas guardadas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSavedModalOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Cerrar"
              >
                Cerrar
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(100dvh-2rem-56px)]">
              <SavedRoutesView
                active={savedModalOpen}
                onLoaded={() => setSavedModalOpen(false)}
                onLogin={() => setAuthModalOpen(true)}
              />
            </div>
          </div>
        </div>
      ) : null}
      <SyncManager />

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
            "flex flex-col gap-4 min-h-0 lg:overflow-hidden lg:pr-2 sm:hidden " +
            (active !== "saved" ? "hidden" : "")
          }
          aria-label="Rutas Guardadas"
        >
          <SavedRoutesView
            active={active === "saved"}
            onLoaded={() => setActive("plan")}
            onLogin={() => setAuthModalOpen(true)}
          />
        </section>

        <section
          className={
            "flex flex-col gap-3 sm:gap-6 lg:min-h-0 lg:h-full " +
            (active !== "map" ? "hidden lg:flex" : "col-span-1")
          }
          aria-label="Mapa"
        >
          <div className="relative flex-1 lg:min-h-0 lg:h-full">
            <Map active={active === "map"} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
