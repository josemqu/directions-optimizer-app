import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

export type LatLng = {
  lat: number;
  lng: number;
};

export type Stop = {
  id: string;
  label: string;
  position: LatLng;
  kind?: "gps" | "address";
  timeRestriction?: string; // HH:mm format, e.g. "09:00"
  timeRestrictionType?: "before" | "after"; // default "before"
};

type RouteStore = {
  stops: Stop[];
  routeLine: LatLng[];
  latestDepartureTime: string | null;
  startTime: string | null;
  serviceTimeMinutes: number;

  addStop: (stop: Stop) => void;
  setStartStop: (stop: Stop) => void;
  clearStartStop: () => void;
  removeStop: (id: string) => void;
  reorderStops: (activeId: string, overId: string) => void;
  setStops: (stops: Stop[]) => void;
  setRouteLine: (line: LatLng[]) => void;
  setLatestDepartureTime: (time: string | null) => void;
  setStartTime: (time: string | null) => void;
  setServiceTimeMinutes: (minutes: number) => void;
  clearRouteLine: () => void;
  updateStopRestriction: (
    id: string,
    time: string | undefined,
    type?: "before" | "after",
  ) => void;
  clearAll: () => void;
};

function arrayMove<T>(array: T[], from: number, to: number) {
  const copy = array.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

const noopStorage: StateStorage = {
  getItem: (name) => {
    void name;
    return null;
  },
  setItem: (name, value) => {
    void name;
    void value;
  },
  removeItem: (name) => {
    void name;
  },
};

export const useRouteStore = create<RouteStore>()(
  persist(
    (set, get) => ({
      stops: [],
      routeLine: [],
      latestDepartureTime: null,
      startTime: null,
      serviceTimeMinutes: 0,

      addStop: (stop) =>
        set((state) => ({
          stops: [...state.stops, stop],
          routeLine: [],
          latestDepartureTime: null,
          startTime: state.startTime,
        })),

      setStartStop: (stop) =>
        set((state) => {
          const withoutGps = state.stops.filter((s) => s.kind !== "gps");
          return {
            stops: [stop, ...withoutGps],
            routeLine: [],
            latestDepartureTime: null,
            startTime: state.startTime,
          };
        }),

      clearStartStop: () =>
        set((state) => ({
          stops: state.stops.filter((s) => s.kind !== "gps"),
          routeLine: [],
          latestDepartureTime: null,
          startTime: state.startTime,
        })),

      removeStop: (id) =>
        set((state) => ({
          stops: state.stops.filter((s) => s.id !== id),
          routeLine: [],
          latestDepartureTime: null,
          startTime: state.startTime,
        })),

      reorderStops: (activeId, overId) => {
        const { stops } = get();
        const from = stops.findIndex((s) => s.id === activeId);
        const to = stops.findIndex((s) => s.id === overId);
        if (from === -1 || to === -1 || from === to) return;

        set({
          stops: arrayMove(stops, from, to),
          routeLine: [],
          latestDepartureTime: null,
          startTime: get().startTime,
        });
      },

      setStops: (stops) => set({ stops }),

      setRouteLine: (line) => set({ routeLine: line }),

      setLatestDepartureTime: (time) => set({ latestDepartureTime: time }),

      setStartTime: (time) =>
        set({ startTime: time, routeLine: [], latestDepartureTime: null }),

      setServiceTimeMinutes: (minutes) =>
        set({
          serviceTimeMinutes:
            Number.isFinite(minutes) && minutes >= 0 ? minutes : 0,
          routeLine: [],
          latestDepartureTime: null,
        }),

      clearRouteLine: () => set({ routeLine: [], latestDepartureTime: null }),

      updateStopRestriction: (id, time, type = "before") =>
        set((state) => ({
          stops: state.stops.map((s) =>
            s.id === id
              ? { ...s, timeRestriction: time, timeRestrictionType: type }
              : s,
          ),
          routeLine: [],
          latestDepartureTime: null,
          startTime: state.startTime,
        })),

      clearAll: () =>
        set({
          stops: [],
          routeLine: [],
          latestDepartureTime: null,
          startTime: null,
          serviceTimeMinutes: 0,
        }),
    }),
    {
      name: "route-store-v1",
      storage: createJSONStorage(
        (): StateStorage =>
          typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      partialize: (state) => ({
        stops: state.stops,
        startTime: state.startTime,
        serviceTimeMinutes: state.serviceTimeMinutes,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.clearRouteLine();
      },
    },
  ),
);
