"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import { cn } from "@infra/utils";
import type { Modality, SupportedWidth, TrackData } from "../types";
import {
  DEFAULT_VARIANT_MODALITIES,
  MODALITIES,
  snapToInterval,
  SUPPORTED_WIDTHS,
  widthForGene,
} from "../utils";
import { useRegionTracks } from "../hooks/use-region-tracks";
import { TrackChart } from "./track-chart";
import { ModalityPicker } from "./modality-picker";

interface AlphaGenomeRegionViewProps {
  chromosome: string;
  start: number;
  end: number;
}

export function AlphaGenomeRegionView({
  chromosome,
  start,
  end,
}: AlphaGenomeRegionViewProps) {
  const chrWithPrefix = chromosome.startsWith("chr")
    ? chromosome
    : `chr${chromosome}`;

  // Default zoom: smallest width that covers the gene
  const defaultWidth = useMemo(() => widthForGene(start, end), [start, end]);
  const geneCenter = useMemo(
    () => Math.floor((start + end) / 2),
    [start, end],
  );

  const [width, setWidth] = useState<SupportedWidth>(defaultWidth);
  const [selectedModalities, setSelectedModalities] = useState<Modality[]>(
    DEFAULT_VARIANT_MODALITIES,
  );
  const [requestedState, setRequestedState] = useState<{
    modalities: Modality[];
    width: SupportedWidth;
  } | null>(null);

  // Snap interval to selected width centered on gene
  const interval = useMemo(
    () =>
      requestedState
        ? snapToInterval(geneCenter, requestedState.width)
        : null,
    [geneCenter, requestedState],
  );

  const { data, cached, isLoading, error } = useRegionTracks({
    chromosome: chrWithPrefix,
    start: interval?.start ?? 0,
    end: interval?.end ?? 0,
    modalities: requestedState?.modalities ?? null,
  });

  const handlePredict = useCallback(() => {
    setRequestedState({
      modalities: [...selectedModalities],
      width,
    });
  }, [selectedModalities, width]);

  const regionLabel = interval
    ? `${chrWithPrefix}:${interval.start.toLocaleString()}-${interval.end.toLocaleString()}`
    : `${chrWithPrefix}:${start.toLocaleString()}-${end.toLocaleString()}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">
          Region: {regionLabel}
        </p>
        {cached && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
            cached
          </Badge>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-end gap-4 flex-wrap">
        {/* Zoom selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">
            Zoom
          </label>
          <div className="inline-flex items-center p-0.5 bg-muted rounded-lg">
            {SUPPORTED_WIDTHS.map((w) => (
              <Button
                key={w.value}
                variant="ghost"
                size="sm"
                onClick={() => setWidth(w.value)}
                className={cn(
                  "h-6 px-2.5 text-xs font-medium rounded-md",
                  w.value === width
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {w.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Modality picker */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">
            Modalities
          </label>
          <ModalityPicker
            selected={selectedModalities}
            onChange={setSelectedModalities}
            disabled={isLoading}
          />
        </div>

        <Button
          size="sm"
          onClick={handlePredict}
          disabled={isLoading || selectedModalities.length === 0}
          className="h-7"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Predicting...
            </>
          ) : (
            "Predict"
          )}
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Computing region predictions...
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load tracks"}
        </p>
      )}

      {/* Results */}
      {data && <RegionTrackResults data={data} />}
    </div>
  );
}

function RegionTrackResults({
  data,
}: {
  data: NonNullable<ReturnType<typeof useRegionTracks>["data"]>;
}) {
  return (
    <div className="space-y-4">
      {data.modalities.map((modality) => {
        const track = data[modality] as TrackData | undefined;
        if (!track) return null;

        const modalityLabel =
          MODALITIES.find((m) => m.id === modality)?.label ?? modality;

        return (
          <RegionModalityGroup
            key={modality}
            modalityLabel={modalityLabel}
            track={track}
          />
        );
      })}
    </div>
  );
}

function RegionModalityGroup({
  modalityLabel,
  track,
}: {
  modalityLabel: string;
  track: TrackData;
}) {
  const [showAll, setShowAll] = useState(false);
  const trackCount = track.tracks.length;
  const displayCount = showAll ? trackCount : Math.min(trackCount, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {modalityLabel}
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {trackCount} {trackCount === 1 ? "track" : "tracks"}
        </span>
      </div>

      <div className="space-y-2">
        {track.tracks.slice(0, displayCount).map((meta, idx) => (
          <TrackChart
            key={meta.biosample_name}
            label={meta.biosample_name}
            refValues={track.values[idx]}
          />
        ))}
      </div>

      {trackCount > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-primary hover:underline mt-2"
        >
          Show all {trackCount} tracks
        </button>
      )}
    </div>
  );
}
