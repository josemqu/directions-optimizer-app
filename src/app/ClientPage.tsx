"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ListChecks, Map as MapIcon } from "lucide-react";
import { AddressInput } from "@/components/AddressInput";
import { RouteList } from "@/components/RouteList";
import { AppShell } from "@/components/AppShell";
import { BottomNav, type BottomNavItem } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";

const Map = dynamic(() => import("@/components/Map").then((m) => m.Map), {
  ssr: false,
});

export function ClientPage() {
  const [active, setActive] = useState<"plan" | "map">("plan");

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
      title="Optimizador de Rutas"
      subtitle="Agrega paradas, reordena, optimiza y exporta a Google Maps / WhatsApp."
      topRight={<ThemeToggle />}
      bottomNav={
        <BottomNav items={navItems} activeKey={active} onChange={setActive} />
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:h-full lg:min-h-0 lg:grid-cols-2 lg:gap-6">
        <section
          className={
            "flex flex-col gap-4 sm:gap-6 lg:min-h-0 lg:overflow-y-auto lg:pr-2 " +
            (active !== "plan" ? "hidden lg:flex" : "")
          }
          aria-label="Planificación"
        >
          <AddressInput />
          <RouteList />
        </section>

        <section
          className={
            "flex flex-col gap-3 sm:gap-6 " +
            (active !== "map" ? "hidden lg:flex" : "")
          }
          aria-label="Mapa"
        >
          <div className="lg:h-full lg:min-h-0">
            <Map active={active === "map"} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
