import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

export type AgendaPlace = {
  id: string;
  name: string;
  label: string;
  position: { lat: number; lng: number };
  createdAt: number;
};

type AgendaStore = {
  places: AgendaPlace[];

  addPlace: (place: AgendaPlace) => void;
  removePlace: (id: string) => void;
  renamePlace: (id: string, name: string) => void;
  clearAllPlaces: () => void;
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
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

export const useAgendaStore = create<AgendaStore>()(
  persist(
    (set) => ({
      places: [],

      addPlace: (place) =>
        set((state) => {
          const normalized = normalizeName(place.name);
          const exists = state.places.some(
            (p) =>
              p.id === place.id ||
              (normalizeName(p.name) === normalized &&
                p.position.lat === place.position.lat &&
                p.position.lng === place.position.lng)
          );
          if (exists) return state;
          return { places: [place, ...state.places] };
        }),

      removePlace: (id) =>
        set((state) => ({
          places: state.places.filter((p) => p.id !== id),
        })),

      renamePlace: (id, name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          return {
            places: state.places.map((p) =>
              p.id === id ? { ...p, name: trimmed } : p
            ),
          };
        }),

      clearAllPlaces: () => set({ places: [] }),
    }),
    {
      name: "agenda-store-v1",
      storage: createJSONStorage(
        (): StateStorage =>
          typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
      partialize: (state) => ({
        places: state.places,
      }),
    }
  )
);
