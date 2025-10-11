"use client";

import React, { useState, useCallback, useMemo, memo } from "react";
import { TrackSelector } from "@/components/features/browser/genome-browser/track-selector";
import { GoslingCore } from "@/components/features/browser/genome-browser/gosling-core";
import { GenomeBrowserControls } from "@/components/features/browser/genome-browser/genome-browser-controls";
import { useDomainManager } from "@/lib/hooks/use-domain-manager";
import { useGoslingSpec } from "@/lib/hooks/use-gosling-spec";
import { COMPREHENSIVE_TRACK_REGISTRY } from "@/lib/tracks/registry";
import { useTissueSpecificTracks } from "@/lib/hooks/use-tissue-specific-tracks";
import type { DynamicTrack } from "@/lib/tracks/dynamic-track-generator";
import { TissueConfig } from "@/lib/variant/ccre/tissue-config";
import { generateTissueSpecificTracks } from "@/lib/tracks/dynamic-track-generator";

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
  const [enabledDynamicTrackIds, setEnabledDynamicTrackIds] = useState<
    string[]
  >([]);
  const [isStatic, setIsStatic] = useState(false);

  const { tissueSpecificTracks } = useTissueSpecificTracks();

  const allPossibleTissueTracks = useMemo(() => {
    const tracks: DynamicTrack[] = [];
    const tissues = Object.keys(TissueConfig);
    tissues.forEach((tissue) => {
      const subtissues = TissueConfig[tissue];
      subtissues.forEach((subtissue) => {
        const generatedTracks = generateTissueSpecificTracks(
          tissue,
          subtissue.name,
          subtissue.assays
        );
        tracks.push(...generatedTracks);
      });
    });
    return tracks;
  }, []);

  const enabledStaticTracks = useMemo(
    () =>
      enabledTrackIds
        .map((trackId) => COMPREHENSIVE_TRACK_REGISTRY[trackId])
        .filter(Boolean),
    [enabledTrackIds],
  );

  const enabledDynamicTracks = useMemo(
    () =>
      enabledDynamicTrackIds
        .map((trackId) =>
          allPossibleTissueTracks.find((track) => track.id === trackId)
        )
        .filter((track): track is DynamicTrack => track !== undefined),
    [enabledDynamicTrackIds, allPossibleTissueTracks],
  );

  const enabledTracks = useMemo(
    () => [...enabledStaticTracks, ...enabledDynamicTracks],
    [enabledStaticTracks, enabledDynamicTracks],
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
      isStatic,
    }),
    [enabledTracks, domainManager.domain, isStatic],
  );

  const goslingSpec = useGoslingSpec(goslingSpecConfig);

  const handleTrackToggle = useCallback(
    (trackId: string) => {
      const isDynamicTrack = allPossibleTissueTracks.some(
        (track) => track.id === trackId
      );

      if (isDynamicTrack) {
        setEnabledDynamicTrackIds((prev) =>
          prev.includes(trackId)
            ? prev.filter((id) => id !== trackId)
            : [...prev, trackId]
        );
      } else {
        setEnabledTrackIds((prev) =>
          prev.includes(trackId)
            ? prev.filter((id) => id !== trackId)
            : [...prev, trackId]
        );
      }
    },
    [allPossibleTissueTracks]
  );

  const handleCollectionToggle = useCallback(
    (trackIds: string[], enabled: boolean) => {
      const dynamicTrackIds = trackIds.filter((id) =>
        allPossibleTissueTracks.some((track) => track.id === id)
      );
      const staticTrackIds = trackIds.filter(
        (id) => !dynamicTrackIds.includes(id)
      );

      if (dynamicTrackIds.length > 0) {
        setEnabledDynamicTrackIds((prev) => {
          if (enabled) {
            const newIds = [...prev];
            dynamicTrackIds.forEach((id) => {
              if (!newIds.includes(id)) {
                newIds.push(id);
              }
            });
            return newIds;
          } else {
            return prev.filter((id) => !dynamicTrackIds.includes(id));
          }
        });
      }

      if (staticTrackIds.length > 0) {
        setEnabledTrackIds((prev) => {
          if (enabled) {
            const newTracks = staticTrackIds.filter((id) => !prev.includes(id));
            return [...prev, ...newTracks];
          } else {
            return prev.filter((id) => !staticTrackIds.includes(id));
          }
        });
      }
    },
    [allPossibleTissueTracks]
  );

  const handleClearAllTracks = useCallback(() => {
    setEnabledTrackIds([]);
    setEnabledDynamicTrackIds([]);
  }, []);

  const handleStaticToggle = useCallback(() => {
    setIsStatic((prev) => !prev);
  }, []);

  const controlsClassName = useMemo(
    () => (enabledTracks.length > 0 ? "mb-4" : ""),
    [enabledTracks.length],
  );

  return (
    <div className="w-full h-full flex flex-col md:flex-row">
      <TrackSelector
        enabledTracks={[...enabledTrackIds, ...enabledDynamicTrackIds]}
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
            isStatic={isStatic}
            onStaticToggle={handleStaticToggle}
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
