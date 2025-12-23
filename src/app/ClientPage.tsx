"use client";

import dynamic from "next/dynamic";
import { AddressInput } from "@/components/AddressInput";
import { RouteList } from "@/components/RouteList";

const Map = dynamic(() => import("@/components/Map").then((m) => m.Map), {
  ssr: false,
});

export function ClientPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Optimizador de Rutas (TSP)
          </h1>
          <p className="mt-2 text-sm text-zinc-300">
            Agrega paradas, reordena con drag & drop, optimiza con GraphHopper y
            exporta a Google Maps / WhatsApp.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <AddressInput />
            <RouteList />
          </div>

          <div className="flex flex-col gap-6">
            <Map />
            <p className="text-xs text-zinc-400">
              El mapa se renderiza solo del lado cliente (dynamic import) para
              evitar SSR issues con Leaflet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
