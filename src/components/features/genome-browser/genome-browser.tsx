"use client";

import React, { useState, useCallback } from "react";
import { TrackSelector } from "@/components/features/genome-browser/track-selector";
import { GoslingCore } from "@/components/features/genome-browser/gosling-core";
import { GenomeBrowserControls } from "@/components/features/genome-browser/genome-browser-controls";
import { useDomainManager } from "@/lib/hooks/use-domain-manager";
import { useGoslingSpec } from "@/lib/hooks/use-gosling-spec";
import { COMPREHENSIVE_TRACK_REGISTRY } from "@/lib/tracks/registry";

interface GenomeBrowserProps {
  vcfParam?: string;
  regionParam?: string;
  initialTracks?: string[];
}

export function GenomeBrowser({
  vcfParam,
  regionParam,
  initialTracks = [],
}: GenomeBrowserProps) {
  const [enabledTrackIds, setEnabledTrackIds] =
    useState<string[]>(initialTracks);

  // Get actual track metadata from IDs
  const enabledTracks = enabledTrackIds
    .map((trackId) => COMPREHENSIVE_TRACK_REGISTRY[trackId])
    .filter(Boolean);

  // Domain management
  const domainManager = useDomainManager({
    vcfParam,
    regionParam,
    trackTypes: enabledTrackIds,
  });

  // Gosling spec generation
  const goslingSpec = useGoslingSpec({
    enabledTracks,
    domain: domainManager.domain,
  });

  const handleTrackToggle = useCallback((trackId: string) => {
    setEnabledTrackIds((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId],
    );
  }, []);

  const handleCollectionToggle = useCallback(
    (trackIds: string[], enabled: boolean) => {
      setEnabledTrackIds((prev) => {
        if (enabled) {
          // Add new tracks to the end, avoiding duplicates
          const newTracks = trackIds.filter((id) => !prev.includes(id));
          return [...prev, ...newTracks];
        } else {
          return prev.filter((id) => !trackIds.includes(id));
        }
      });
    },
    [],
  );

  const handleClearAllTracks = useCallback(() => {
    setEnabledTrackIds([]);
  }, []);

  return (
    <div className="w-full h-full flex flex-col md:flex-row">
      {/* Track Selector - Responsive */}
      <TrackSelector
        enabledTracks={enabledTrackIds}
        onTrackToggle={handleTrackToggle}
        onCollectionToggle={handleCollectionToggle}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="flex-1 flex flex-col">
          {/* Controls - only show when tracks are enabled */}
          <GenomeBrowserControls
            domain={domainManager.domain}
            enabledTracks={enabledTracks}
            selectedPreset={domainManager.selectedPreset}
            onZoom={domainManager.zoom}
            onPresetChange={domainManager.applyPreset}
            onClearAllTracks={handleClearAllTracks}
            className={enabledTracks.length > 0 ? "mb-4" : ""}
          />

          {/* Genome Browser Visualization */}
          <div className="flex-1">
            <GoslingCore spec={goslingSpec} />
          </div>
        </div>
      </div>
    </div>
  );
}
