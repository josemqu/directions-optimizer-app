"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/useAuth";
import { useAgendaStore } from "@/lib/agendaStore";
import { useRouteStore } from "@/lib/routeStore";

export function SyncManager() {
  const { user, loading: authLoading } = useAuth();
  const { places, setPlaces } = useAgendaStore();
  const { stops } = useRouteStore();
  const { routeLine } = useRouteStore();

  const isFirstLoad = useRef(true);
  const skipNextPlacesUpdate = useRef(false);

  // 1. Initial Load from Supabase
  useEffect(() => {
    if (authLoading || !user) return;

    const loadData = async () => {
      const res = await fetch("/api/agendas", { cache: "no-store" });
      if (res.ok) {
        const payload = (await res.json()) as { places?: any[] };
        const agendaData = payload.places ?? [];

        const formattedPlaces = agendaData.map((p) => ({
          id: p.id,
          name: p.name,
          label: p.label,
          position: p.position,
          createdAt: new Date(p.created_at).getTime(),
          openingHours: p.opening_hours,
        }));

        if (formattedPlaces.length > 0) {
          skipNextPlacesUpdate.current = true;
          setPlaces(formattedPlaces);
        } else if (places.length > 0) {
          const putRes = await fetch("/api/agendas", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ places }),
          });
          if (!putRes.ok) {
            const text = await putRes.text().catch(() => "");
            // eslint-disable-next-line no-console
            console.error(
              "Agenda sync (initial upload) failed:",
              putRes.status,
              text,
            );
          }
        }
      } else {
        const text = await res.text().catch(() => "");
        // eslint-disable-next-line no-console
        console.error("Agenda load failed:", res.status, text);
      }

      isFirstLoad.current = false;
    };

    loadData();
  }, [user, authLoading]);

  // 2. Sync Agenda Changes to Supabase
  useEffect(() => {
    if (authLoading || !user || isFirstLoad.current) return;
    if (skipNextPlacesUpdate.current) {
      skipNextPlacesUpdate.current = false;
      return;
    }

    const syncPlaces = async () => {
      const res = await fetch("/api/agendas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ places }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // eslint-disable-next-line no-console
        console.error("Agenda sync failed:", res.status, text);
      }
    };

    const timer = setTimeout(syncPlaces, 1000);
    return () => clearTimeout(timer);
  }, [places, user, authLoading]);

  // 3. Sync Route Stops to Supabase (as a "Current Route")
  useEffect(() => {
    if (authLoading || !user || isFirstLoad.current) return;

    const syncStops = async () => {
      if (stops.length === 0) return;

      // We'll use a special name like "current_route" to identify the active stops
      await fetch("/api/saved-routes/current", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops, routeLine }),
      });
    };

    const timer = setTimeout(syncStops, 2000);
    return () => clearTimeout(timer);
  }, [stops, user, authLoading]);

  // Load current route on login
  useEffect(() => {
    if (authLoading || !user) return;

    const loadRoute = async () => {
      const res = await fetch("/api/saved-routes/current", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { route: any | null };

      if (data.route?.stops) {
        // Use setStops from routeStore
        // Note: We need to ensure we don't overwrite if local is newer?
        // For now, cloud wins on login.
        useRouteStore.getState().setStops(data.route.stops);
        useRouteStore
          .getState()
          .setRouteLine(
            Array.isArray(data.route.route_line) ? data.route.route_line : [],
          );
      }
    };

    loadRoute();
  }, [user, authLoading]);

  return null;
}
