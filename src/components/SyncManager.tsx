"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { useAgendaStore } from "@/lib/agendaStore";
import { useRouteStore } from "@/lib/routeStore";

export function SyncManager() {
  const { user, loading: authLoading } = useAuth();
  const { places, setPlaces } = useAgendaStore();
  const { stops } = useRouteStore();
  
  const isFirstLoad = useRef(true);
  const skipNextPlacesUpdate = useRef(false);

  // 1. Initial Load from Supabase
  useEffect(() => {
    if (authLoading || !user) return;

    const loadData = async () => {
      // Load Agenda
      const { data: agendaData, error: agendaError } = await supabase
        .from("agendas")
        .select("*")
        .eq("user_id", user.id);

      if (!agendaError && agendaData) {
        const formattedPlaces = agendaData.map(p => ({
          id: p.id,
          name: p.name,
          label: p.label,
          position: p.position,
          createdAt: new Date(p.created_at).getTime(),
          openingHours: p.opening_hours
        }));
        
        if (formattedPlaces.length > 0) {
          skipNextPlacesUpdate.current = true;
          setPlaces(formattedPlaces);
        } else if (places.length > 0) {
          // If user has local data but nothing in cloud, upload local data
          for (const place of places) {
            await supabase.from("agendas").insert({
              user_id: user.id,
              name: place.name,
              label: place.label,
              position: place.position,
              opening_hours: place.openingHours
            });
          }
        }
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
      // This is a naive sync: delete all and re-insert or use upsert if IDs match
      // For simplicity in this phase, we'll use the IDs from the store
      for (const place of places) {
         await supabase.from("agendas").upsert({
          id: place.id,
          user_id: user.id,
          name: place.name,
          label: place.label,
          position: place.position,
          opening_hours: place.openingHours
        });
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
      await supabase.from("saved_routes").upsert({
        user_id: user.id,
        name: "current_route",
        stops: stops,
        route_line: null // We don't necessarily need to sync the line, it can be recomputed
      }, { onConflict: "user_id, name" });
    };

    const timer = setTimeout(syncStops, 2000);
    return () => clearTimeout(timer);
  }, [stops, user, authLoading]);

  // Load current route on login
  useEffect(() => {
    if (authLoading || !user) return;

    const loadRoute = async () => {
      const { data, error } = await supabase
        .from("saved_routes")
        .select("*")
        .eq("user_id", user.id)
        .eq("name", "current_route")
        .single();

      if (!error && data && data.stops) {
        // Use setStops from routeStore
        // Note: We need to ensure we don't overwrite if local is newer? 
        // For now, cloud wins on login.
        useRouteStore.getState().setStops(data.stops);
      }
    };

    loadRoute();
  }, [user, authLoading]);

  return null;
}
