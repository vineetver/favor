import { create } from "zustand";

interface TissueState {
  selectedTissue: string;
  selectedSubtissue: string;
  setSelectedTissue: (tissue: string) => void;
  setSelectedSubtissue: (subtissue: string) => void;
  reset: () => void;
}

export const useTissueStore = create<TissueState>((set) => ({
  selectedTissue: "",
  selectedSubtissue: "",
  setSelectedTissue: (tissue) => set({ selectedTissue: tissue }),
  setSelectedSubtissue: (subtissue) => set({ selectedSubtissue: subtissue }),
  reset: () => set({ selectedTissue: "", selectedSubtissue: "" }),
}));
