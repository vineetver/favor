"use client";

import React, { useState, useCallback, useMemo, memo } from "react";
import { TrackSelector } from "@/components/features/browser/genome-browser/track-selector";
import { GoslingCore } from "@/components/features/browser/genome-browser/gosling-core";
import { GenomeBrowserControls } from "@/components/features/browser/genome-browser/genome-browser-controls";
import { useDomainManager } from "@/lib/hooks/use-domain-manager";
import { useGoslingSpec } from "@/lib/hooks/use-gosling-spec";
import { COMPREHENSIVE_TRACK_REGISTRY } from "@/lib/tracks/registry";

interface GenomeBrowserProps {
  vcfParam?: string;
  regionParam?: string;
  initialTracks?: string[];
}

const GenomeBrowserImpl = ({
  vcfParam,
  regionParam,
  initialTracks = [],
}: GenomeBrowserProps) => {
  const [enabledTrackIds, setEnabledTrackIds] =
    useState<string[]>(initialTracks);

  const enabledTracks = useMemo(
    () =>
      enabledTrackIds
        .map((trackId) => COMPREHENSIVE_TRACK_REGISTRY[trackId])
        .filter(Boolean),
    [enabledTrackIds],
  );

  const domainManagerConfig = useMemo(
    () => ({
      vcfParam,
      regionParam,
      trackTypes: enabledTrackIds,
    }),
    [vcfParam, regionParam, enabledTrackIds],
  );

  const domainManager = useDomainManager(domainManagerConfig);

  const goslingSpecConfig = useMemo(
    () => ({
      enabledTracks,
      domain: domainManager.domain,
    }),
    [enabledTracks, domainManager.domain],
  );

  const goslingSpec = useGoslingSpec(goslingSpecConfig);

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

  const controlsClassName = useMemo(
    () => (enabledTracks.length > 0 ? "mb-4" : ""),
    [enabledTracks.length],
  );

  return (
    <div className="w-full h-full flex flex-col md:flex-row">
      <TrackSelector
        enabledTracks={enabledTrackIds}
        onTrackToggle={handleTrackToggle}
        onCollectionToggle={handleCollectionToggle}
      />

      <div className="flex-1 flex flex-col overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="flex-1 flex flex-col">
          <GenomeBrowserControls
            domain={domainManager.domain}
            enabledTracks={enabledTracks}
            selectedPreset={domainManager.selectedPreset}
            onZoom={domainManager.zoom}
            onPresetChange={domainManager.applyPreset}
            onClearAllTracks={handleClearAllTracks}
            className={controlsClassName}
          />

          <div className="flex-1">
            <GoslingCore spec={goslingSpec} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const GenomeBrowser = memo(GenomeBrowserImpl);
