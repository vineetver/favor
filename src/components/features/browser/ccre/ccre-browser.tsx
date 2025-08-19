"use client";

import React, { useState, useCallback, useEffect } from "react";
import { CCRETrackSelector } from "./ccre-track-selector";
import { GoslingCore } from "@/components/features/browser/genome-browser/gosling-core";
import { GenomeBrowserControls } from "@/components/features/browser/genome-browser/genome-browser-controls";
import { useDomainManager } from "@/lib/hooks/use-domain-manager";
import { useGoslingSpec } from "@/lib/hooks/use-gosling-spec";
import { COMPREHENSIVE_TRACK_REGISTRY } from "@/lib/tracks/registry";
import type { DynamicTrack } from "@/lib/tracks/dynamic-track-generator";
import { useTissueSpecificTracks } from "@/lib/hooks/use-tissue-specific-tracks";

interface CCREBrowserProps {
  vcfParam?: string;
  regionParam?: string;
  initialTracks?: string[];
}

export function CCREBrowser({
  vcfParam,
  regionParam,
  initialTracks = ["other_gene_annotation"], // Default to gene annotation
}: CCREBrowserProps) {
  const [enabledTrackIds, setEnabledTrackIds] =
    useState<string[]>(initialTracks);
  const [enabledDynamicTrackIds, setEnabledDynamicTrackIds] = useState<
    string[]
  >([]);

  // Get tissue-specific tracks
  const { tissueSpecificTracks, hasTissueSelection } =
    useTissueSpecificTracks();

  // Auto-enable tissue-specific tracks and remove generic ones when tissue is selected
  useEffect(() => {
    if (tissueSpecificTracks.length > 0) {
      const newDynamicTrackIds = tissueSpecificTracks.map((track) => track.id);
      setEnabledDynamicTrackIds(newDynamicTrackIds);

      // Remove generic single cell/tissue tracks when tissue-specific ones are available
      const genericTracksToRemove = [
        "single_cell_tissue_atac_seq_chromatin_accessibility",
        "single_cell_tissue_dnase_seq_chromatin_accessibility",
        "single_cell_tissue_ctcf_binding",
        "single_cell_tissue_h3k4me3_active_promoters",
        "single_cell_tissue_h3k27ac_enhancer_activity",
      ];

      setEnabledTrackIds((prev) =>
        prev.filter((trackId) => !genericTracksToRemove.includes(trackId)),
      );
    } else {
      setEnabledDynamicTrackIds([]);
      // Optionally re-enable generic tracks when no tissue is selected
      // (commented out to avoid automatically re-adding tracks)
    }
  }, [tissueSpecificTracks]);

  // Combine static and dynamic tracks
  const enabledStaticTracks = enabledTrackIds
    .map((trackId) => COMPREHENSIVE_TRACK_REGISTRY[trackId])
    .filter(Boolean);

  const enabledDynamicTracks = enabledDynamicTrackIds
    .map((trackId) =>
      tissueSpecificTracks.find((track) => track.id === trackId),
    )
    .filter((track): track is DynamicTrack => track !== undefined);

  const enabledTracks = [...enabledStaticTracks, ...enabledDynamicTracks];

  const domainManager = useDomainManager({
    vcfParam,
    regionParam,
    trackTypes: enabledTrackIds,
    initialPreset: "Focused",
  });

  // Gosling spec generation
  const goslingSpec = useGoslingSpec({
    enabledTracks,
    domain: domainManager.domain,
  });

  const handleTrackToggle = useCallback(
    (trackId: string) => {
      // Check if this is a dynamic track
      const isDynamicTrack = tissueSpecificTracks.some(
        (track) => track.id === trackId,
      );

      if (isDynamicTrack) {
        setEnabledDynamicTrackIds((prev) =>
          prev.includes(trackId)
            ? prev.filter((id) => id !== trackId)
            : [...prev, trackId],
        );
      } else {
        setEnabledTrackIds((prev) =>
          prev.includes(trackId)
            ? prev.filter((id) => id !== trackId)
            : [...prev, trackId],
        );
      }
    },
    [tissueSpecificTracks],
  );

  const handleClearAllTracks = useCallback(() => {
    setEnabledTrackIds(["other_gene_annotation"]);
    setEnabledDynamicTrackIds([]);
  }, []);

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Horizontal Track Selector - Collapsible */}
      <CCRETrackSelector
        enabledTracks={[...enabledTrackIds, ...enabledDynamicTrackIds]}
        onTrackToggle={handleTrackToggle}
        tissueSpecificTracks={tissueSpecificTracks}
      />

      <GenomeBrowserControls
        domain={domainManager.domain}
        enabledTracks={enabledTracks}
        selectedPreset={domainManager.selectedPreset}
        onZoom={domainManager.zoom}
        onPresetChange={domainManager.applyPreset}
        onClearAllTracks={handleClearAllTracks}
        compact={true} // Always compact to preserve space
      />

      {/* Genome Browser Visualization */}
      <div>
        <GoslingCore spec={goslingSpec} />
      </div>
    </div>
  );
}
