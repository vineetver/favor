"use client";

import { cn } from "@infra/utils";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useRegionTracks } from "../hooks/use-region-tracks";
import type { Modality, SupportedWidth, TrackData } from "../types";
import {
  DEFAULT_VARIANT_MODALITIES,
  MODALITIES,
  SUPPORTED_WIDTHS,
  snapToInterval,
  widthForGene,
} from "../utils";
import { ModalityPicker } from "./modality-picker";
import { TrackChart } from "./track-chart";

interface AlphaGenomeRegionViewProps {
  chromosome: string;
  start: number;
  end: number;
  /** Highlight a specific variant position with a vertical line */
  variantPosition?: number;
}

export function AlphaGenomeRegionView({
  chromosome,
  start,
  end,
  variantPosition,
}: AlphaGenomeRegionViewProps) {
  const chrWithPrefix = chromosome.startsWith("chr")
    ? chromosome
    : `chr${chromosome}`;

  // Default zoom: smallest width that covers the gene
  const defaultWidth = useMemo(() => widthForGene(start, end), [start, end]);
  const geneCenter = useMemo(() => Math.floor((start + end) / 2), [start, end]);

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
      requestedState ? snapToInterval(geneCenter, requestedState.width) : null,
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
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Region Tracks</h3>
        {!data && (
          <span className="text-xs text-muted-foreground">
            Predicted signals across the gene region
          </span>
        )}
        {cached && (
          <Badge
            variant="secondary"
            className="text-[10px] h-4 px-1.5 font-normal"
          >
            cached
          </Badge>
        )}
      </div>

      {/* Single toolbar: zoom · modalities · predict */}
      <div className="flex items-center gap-2 flex-wrap">
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
        <div className="w-px h-5 bg-border shrink-0" />
        <ModalityPicker
          selected={selectedModalities}
          onChange={setSelectedModalities}
          disabled={isLoading}
        />
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
          ) : data ? (
            "Re-predict"
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
      {data && <RegionTrackResults data={data} variantPosition={variantPosition} intervalStart={interval?.start} intervalEnd={interval?.end} />}
    </section>
  );
}

function RegionTrackResults({
  data,
  variantPosition,
  intervalStart,
  intervalEnd,
}: {
  data: NonNullable<ReturnType<typeof useRegionTracks>["data"]>;
  variantPosition?: number;
  intervalStart?: number;
  intervalEnd?: number;
}) {
  // Compute variant index within the track values array
  const variantIndex = useMemo(() => {
    if (variantPosition == null || intervalStart == null || intervalEnd == null) return undefined;
    if (variantPosition < intervalStart || variantPosition > intervalEnd) return undefined;
    const firstTrack = data.modalities[0] ? (data[data.modalities[0]] as TrackData | undefined) : undefined;
    if (!firstTrack?.values?.length) return undefined;
    const numPositions = firstTrack.values[0]?.length ?? firstTrack.values.length;
    const frac = (variantPosition - intervalStart) / (intervalEnd - intervalStart);
    return Math.round(frac * numPositions);
  }, [variantPosition, intervalStart, intervalEnd, data]);

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
            variantIndex={variantIndex}
          />
        );
      })}
    </div>
  );
}

function RegionModalityGroup({
  modalityLabel,
  track,
  variantIndex,
}: {
  modalityLabel: string;
  track: TrackData;
  variantIndex?: number;
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

      <div className="relative space-y-2">
        {/* Full-height variant position line */}
        {variantIndex != null && (
          <div
            className="absolute top-0 bottom-0 w-px border-l border-dashed border-red-500/60 z-10 pointer-events-none"
            style={{ left: `${(variantIndex / (track.values[0]?.length || 1)) * 100}%` }}
          />
        )}

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
