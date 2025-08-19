"use client";

import { useMemo } from "react";
import { useTissueStore } from "@/lib/stores/tissue-store";
import { TissueConfig } from "@/components/features/ccre/lib/tissue-config";
import {
  generateTissueSpecificTracks,
  type DynamicTrack,
} from "@/lib/tracks/dynamic-track-generator";

interface UseTissueSpecificTracksReturn {
  tissueSpecificTracks: DynamicTrack[];
  hasTissueSelection: boolean;
  selectedTissue: string;
  selectedSubtissue: string;
}

export function useTissueSpecificTracks(): UseTissueSpecificTracksReturn {
  const { selectedTissue, selectedSubtissue } = useTissueStore();

  const tissueSpecificTracks = useMemo((): DynamicTrack[] => {
    // Return empty array if no tissue or subtissue selected
    if (!selectedTissue || !selectedSubtissue) {
      return [];
    }

    // Get tissue configuration
    const tissueConfig = TissueConfig[selectedTissue];
    if (!tissueConfig) {
      console.warn(
        `No tissue configuration found for tissue: ${selectedTissue}`,
      );
      return [];
    }

    // Find the specific subtissue configuration
    const subtissueConfig = tissueConfig.find(
      (config) => config.name === selectedSubtissue,
    );

    if (!subtissueConfig) {
      console.warn(
        `No subtissue configuration found for subtissue: ${selectedSubtissue} in tissue: ${selectedTissue}`,
      );
      return [];
    }

    // Generate dynamic tracks from assays
    return generateTissueSpecificTracks(
      selectedTissue,
      selectedSubtissue,
      subtissueConfig.assays,
    );
  }, [selectedTissue, selectedSubtissue]);

  const hasTissueSelection = !!(selectedTissue && selectedSubtissue);

  return {
    tissueSpecificTracks,
    hasTissueSelection,
    selectedTissue,
    selectedSubtissue,
  };
}
