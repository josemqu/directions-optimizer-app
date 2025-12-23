import { create } from "zustand";

export type LatLng = {
  lat: number;
  lng: number;
};

export type Stop = {
  id: string;
  label: string;
  position: LatLng;
};

type RouteStore = {
  stops: Stop[];
  routeLine: LatLng[];

  addStop: (stop: Stop) => void;
  removeStop: (id: string) => void;
  reorderStops: (activeId: string, overId: string) => void;
  setStops: (stops: Stop[]) => void;
  setRouteLine: (line: LatLng[]) => void;
  clearRouteLine: () => void;
  clearAll: () => void;
};

function arrayMove<T>(array: T[], from: number, to: number) {
  const copy = array.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export const useRouteStore = create<RouteStore>((set, get) => ({
  stops: [],
  routeLine: [],

  addStop: (stop) =>
    set((state) => ({
      stops: [...state.stops, stop],
    })),

  removeStop: (id) =>
    set((state) => ({
      stops: state.stops.filter((s) => s.id !== id),
      routeLine: state.routeLine.length ? [] : state.routeLine,
    })),

  reorderStops: (activeId, overId) => {
    const { stops } = get();
    const from = stops.findIndex((s) => s.id === activeId);
    const to = stops.findIndex((s) => s.id === overId);
    if (from === -1 || to === -1 || from === to) return;

    set({
      stops: arrayMove(stops, from, to),
      routeLine: [],
    });
  },

  setStops: (stops) => set({ stops }),

  setRouteLine: (line) => set({ routeLine: line }),

  clearRouteLine: () => set({ routeLine: [] }),

  clearAll: () => set({ stops: [], routeLine: [] }),
}));
