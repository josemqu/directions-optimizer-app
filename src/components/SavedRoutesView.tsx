"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { useRouteStore } from "@/lib/routeStore";
import { Trash2, Play, Calendar, MapPin, Loader2 } from "lucide-react";
import { formatAddressShort } from "@/lib/formatAddress";

export function SavedRoutesView({
  onLoaded,
  active,
}: {
  onLoaded?: () => void;
  active?: boolean;
}) {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const setStops = useRouteStore((s) => s.setStops);

  const fetchRoutes = async () => {
    if (!user) {
      setRoutes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_routes")
      .select("*")
      .eq("user_id", user.id)
      .neq("name", "current_route") // Don't show the auto-synced one
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRoutes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoutes();
  }, [user]);

  useEffect(() => {
    if (!active) return;
    fetchRoutes();
  }, [active]);

  const deleteRoute = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta ruta?")) return;
    const { error } = await supabase.from("saved_routes").delete().eq("id", id);
    if (!error) {
      setRoutes(routes.filter((r) => r.id !== id));
    }
  };

  const loadRoute = (route: any) => {
    setStops(route.stops);
    onLoaded?.();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center p-6 bg-card rounded-xl border border-dashed border-border">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No tienes rutas guardadas</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Guarda tus rutas optimizadas para acceder a ellas mas tarde desde
          cualquier dispositivo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold px-1">Mis Rutas Guardadas</h2>
      <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 no-scrollbar">
        {routes.map((route) => (
          <div
            key={route.id}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-foreground">{route.name}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(route.created_at).toLocaleDateString()}{" "}
                  {new Date(route.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => loadRoute(route)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Cargar
                </button>
                <button
                  onClick={() => deleteRoute(route.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{route.stops.length} paradas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {route.stops.slice(0, 3).map((stop: any, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground truncate max-w-[120px]"
                  >
                    {formatAddressShort(stop.label)}
                  </span>
                ))}
                {route.stops.length > 3 && (
                  <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">
                    +{route.stops.length - 3} más
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
