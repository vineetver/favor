import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GenomicBuild } from "@/features/search/stores/search-store";

export interface SavedSearchItem {
  id: string;
  name: string;
  query: string;
  genome: GenomicBuild;
  description?: string;
  createdAt: number;
}

interface SavedSearchesState {
  savedSearches: SavedSearchItem[];
  saveSearch: (
    query: string,
    name: string,
    genome: GenomicBuild,
    description?: string,
  ) => void;
  deleteSavedSearch: (id: string) => void;
  getSavedSearchItems: () => {
    type: "saved";
    value: string;
    id: string;
    data: SavedSearchItem;
  }[];
}

export const useSavedSearches = create<SavedSearchesState>()(
  persist(
    (set, get) => ({
      savedSearches: [],
      saveSearch: (query, name, genome, description) => {
        const newItem: SavedSearchItem = {
          id: crypto.randomUUID(),
          name,
          query,
          genome,
          description,
          createdAt: Date.now(),
        };
        set((state) => ({
          savedSearches: [newItem, ...state.savedSearches],
        }));
      },
      deleteSavedSearch: (id) => {
        set((state) => ({
          savedSearches: state.savedSearches.filter((item) => item.id !== id),
        }));
      },
      getSavedSearchItems: () => {
        const { savedSearches } = get();
        return savedSearches.map((item) => ({
          type: "saved" as const,
          value: item.query,
          id: item.id,
          data: item,
        }));
      },
    }),
    {
      name: "saved-searches",
    },
  ),
);
