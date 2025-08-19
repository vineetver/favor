"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Info, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { COMPREHENSIVE_TRACK_REGISTRY } from "@/lib/tracks/registry";
import type { TrackMetadata } from "@/lib/tracks/types";
import type { DynamicTrack } from "@/lib/tracks/dynamic-track-generator";
import { TrackDetailsModal } from "@/components/features/genome-browser/track-details-modal";

interface CCRETrackSelectorProps {
  enabledTracks: string[];
  onTrackToggle: (trackId: string) => void;
  tissueSpecificTracks?: DynamicTrack[];
  className?: string;
}

interface TrackItemProps {
  track: TrackMetadata;
  isEnabled: boolean;
  onToggle: (trackId: string) => void;
  onShowDetails: (trackId: string) => void;
}

function TrackItem({
  track,
  isEnabled,
  onToggle,
  onShowDetails,
}: TrackItemProps) {
  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-all duration-200 ${
        isEnabled
          ? "border-primary/30 bg-primary/5 shadow-sm"
          : "border-border hover:border-muted-foreground/40 hover:bg-muted/20"
      }`}
    >
      <Switch
        checked={isEnabled}
        onCheckedChange={() => onToggle(track.id)}
        className="flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs sm:text-sm font-medium text-foreground truncate block leading-tight">
          {track.name}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onShowDetails(track.id)}
        className="h-6 w-6 sm:h-7 sm:w-7 p-0 flex-shrink-0"
        title="View details"
      >
        <Info className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface TrackGroupProps {
  title: string;
  tracks: TrackMetadata[];
  enabledTracks: string[];
  onTrackToggle: (trackId: string) => void;
  onShowDetails: (trackId: string) => void;
}

function TrackGroup({
  title,
  tracks,
  enabledTracks,
  onTrackToggle,
  onShowDetails,
}: TrackGroupProps) {
  const enabledCount = tracks.filter((track) =>
    enabledTracks.includes(track.id),
  ).length;

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" className="text-xs px-1.5">
          {enabledCount}/{tracks.length}
        </Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
        {tracks.map((track) => (
          <TrackItem
            key={track.id}
            track={track}
            isEnabled={enabledTracks.includes(track.id)}
            onToggle={onTrackToggle}
            onShowDetails={onShowDetails}
          />
        ))}
      </div>
    </div>
  );
}

export function CCRETrackSelector({
  enabledTracks,
  onTrackToggle,
  tissueSpecificTracks = [],
  className = "",
}: CCRETrackSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDetailTrack, setSelectedDetailTrack] = useState<string | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);

  // Filter for only Gene Annotation, Single Cell/Tissue tracks, and tissue-specific tracks
  const relevantTracks = useMemo(() => {
    const staticTracks = Object.values(COMPREHENSIVE_TRACK_REGISTRY).filter(
      (track) => {
        // Include Gene Annotation from Other category
        if (
          track.category === "other" &&
          track.id === "other_gene_annotation"
        ) {
          return true;
        }
        // Include all Single Cell/Tissue tracks
        if (track.category === "single-cell-tissue") {
          return true;
        }
        return false;
      },
    );

    // Combine static tracks with tissue-specific tracks
    return [...staticTracks, ...tissueSpecificTracks];
  }, [tissueSpecificTracks]);

  // Apply search filter
  const filteredTracks = useMemo(() => {
    if (!searchQuery) return relevantTracks;

    const query = searchQuery.toLowerCase();
    return relevantTracks.filter(
      (track) =>
        track.name.toLowerCase().includes(query) ||
        track.description?.toLowerCase().includes(query),
    );
  }, [relevantTracks, searchQuery]);

  const { geneAnnotation, singleCellTracks, tissueSpecificTracksList } =
    useMemo(() => {
      const gene = filteredTracks.filter(
        (track) =>
          track.category === "other" && track.id === "other_gene_annotation",
      );
      const singleCell = filteredTracks.filter(
        (track) => track.category === "single-cell-tissue",
      );
      const tissueSpecific = filteredTracks.filter(
        (track) => track.category === "tissue-specific",
      );

      return {
        geneAnnotation: gene,
        singleCellTracks: singleCell,
        tissueSpecificTracksList: tissueSpecific,
      };
    }, [filteredTracks]);

  const totalTracks = relevantTracks.length;
  const enabledCount = enabledTracks.filter((trackId) =>
    relevantTracks.some((track) => track.id === trackId),
  ).length;

  return (
    <>
      <div
        className={`bg-card rounded-lg border border-border/50 shadow-sm ${className} grid grid-cols-1`}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h2 className="font-semibold text-foreground text-sm truncate">
                  Tracks
                </h2>
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 sm:px-2 flex-shrink-0"
                >
                  {enabledCount}/{totalTracks}
                </Badge>
              </div>
              <div className="flex-shrink-0 ml-2">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-t border-border/30 p-3 sm:p-4 space-y-3 sm:space-y-4">
              {/* Track Groups */}
              <div className="space-y-4 sm:space-y-6">
                {/* Tissue-Specific Tracks - Show first when available */}
                {tissueSpecificTracksList.length > 0 && (
                  <TrackGroup
                    title="Tissue-Specific Tracks"
                    tracks={tissueSpecificTracksList}
                    enabledTracks={enabledTracks}
                    onTrackToggle={onTrackToggle}
                    onShowDetails={setSelectedDetailTrack}
                  />
                )}

                {/* Gene Annotation */}
                {geneAnnotation.length > 0 && (
                  <TrackGroup
                    title="Gene Annotation"
                    tracks={geneAnnotation}
                    enabledTracks={enabledTracks}
                    onTrackToggle={onTrackToggle}
                    onShowDetails={setSelectedDetailTrack}
                  />
                )}

                {/* Single Cell/Tissue Tracks */}
                {singleCellTracks.length > 0 && (
                  <TrackGroup
                    title="Regulatory Elements"
                    tracks={singleCellTracks}
                    enabledTracks={enabledTracks}
                    onTrackToggle={onTrackToggle}
                    onShowDetails={setSelectedDetailTrack}
                  />
                )}

                {/* No results */}
                {filteredTracks.length === 0 && searchQuery && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No tracks found matching "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Track Details Modal */}
      <TrackDetailsModal
        trackId={selectedDetailTrack}
        isOpen={selectedDetailTrack !== null}
        onClose={() => setSelectedDetailTrack(null)}
        onToggleTrack={onTrackToggle}
      />
    </>
  );
}
