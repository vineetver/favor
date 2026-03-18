"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import type { Modality, ParsedVcf, ScorerKey, TrackData } from "../types";
import {
  DEFAULT_SCORERS,
  DEFAULT_VARIANT_MODALITIES,
  MODALITIES,
  parseVariantVcf,
} from "../utils";
import { useScores } from "../hooks/use-scores";
import { useVariantTracks } from "../hooks/use-variant-tracks";
import { ScoresHeatmap } from "./scores-heatmap";
import { TrackChart } from "./track-chart";
import { ModalityPicker } from "./modality-picker";
import { ScorerPicker } from "./scorer-picker";

interface AlphaGenomeVariantViewProps {
  vcf: string;
}

export function AlphaGenomeVariantView({ vcf }: AlphaGenomeVariantViewProps) {
  const parsed = useMemo(() => parseVariantVcf(vcf), [vcf]);

  return (
    <div className="space-y-6">
      <ScoresSection parsed={parsed} />
      <TracksSection parsed={parsed} />
    </div>
  );
}

// ─── Scores (auto-loads) ───────────────────────────────────────

function ScoresSection({ parsed }: { parsed: ParsedVcf }) {
  const [selectedScorers, setSelectedScorers] = useState<ScorerKey[]>(DEFAULT_SCORERS);

  const { data, cached, isLoading, error } = useScores({
    parsed,
    scorers: selectedScorers,
  });

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Impact Scores
        </h3>
        {cached && <CachedBadge />}
      </div>

      {/* Scorer picker */}
      <div className="mb-4">
        <label className="text-xs text-muted-foreground font-medium block mb-1">
          Scorers
        </label>
        <ScorerPicker
          selected={selectedScorers}
          onChange={setSelectedScorers}
          disabled={isLoading}
        />
      </div>

      {isLoading && <ScoresLoading />}

      {error && (
        <p className="text-sm text-destructive py-4">
          {error instanceof Error ? error.message : "Failed to load scores"}
        </p>
      )}

      {data && <ScoresHeatmap scorers={data.scorers} />}
    </section>
  );
}

function ScoresLoading() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Computing variant impact scores...
      </div>
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}

// ─── Tracks (on-demand) ────────────────────────────────────────

function TracksSection({ parsed }: { parsed: ParsedVcf }) {
  const [selectedModalities, setSelectedModalities] = useState<Modality[]>(
    DEFAULT_VARIANT_MODALITIES,
  );
  const [requestedModalities, setRequestedModalities] = useState<
    Modality[] | null
  >(null);
  const [expanded, setExpanded] = useState(false);

  const { data, cached, isLoading, error } = useVariantTracks({
    parsed,
    modalities: requestedModalities,
  });

  const handlePredict = useCallback(() => {
    setRequestedModalities([...selectedModalities]);
    setExpanded(true);
  }, [selectedModalities]);

  const hasResults = data != null;

  return (
    <section>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-3"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <h3 className="text-sm font-semibold text-foreground">
          Variant Tracks
        </h3>
        {hasResults && cached && <CachedBadge />}
        {!hasResults && (
          <span className="text-xs text-muted-foreground">
            Compare ref vs alt signals
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-4 pl-6">
          <div className="flex items-end gap-3 flex-wrap">
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

          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded" />
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">
              {error instanceof Error
                ? error.message
                : "Failed to load tracks"}
            </p>
          )}

          {data && <VariantTrackResults data={data} />}
        </div>
      )}
    </section>
  );
}

function VariantTrackResults({
  data,
}: {
  data: NonNullable<ReturnType<typeof useVariantTracks>["data"]>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-blue-500 rounded" />
          Reference
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 border-t border-dashed border-red-500" />
          Alternate
        </div>
      </div>

      {data.modalities.map((modality) => {
        const refTrack = data.reference[modality];
        const altTrack = data.alternate[modality];
        if (!refTrack || !altTrack) return null;

        const modalityLabel =
          MODALITIES.find((m) => m.id === modality)?.label ?? modality;

        return (
          <ModalityTrackGroup
            key={modality}
            modalityLabel={modalityLabel}
            refTrack={refTrack}
            altTrack={altTrack}
          />
        );
      })}
    </div>
  );
}

function ModalityTrackGroup({
  modalityLabel,
  refTrack,
  altTrack,
}: {
  modalityLabel: string;
  refTrack: TrackData;
  altTrack: TrackData;
}) {
  const [showAll, setShowAll] = useState(false);
  const trackCount = refTrack.tracks.length;
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
        {refTrack.tracks.slice(0, displayCount).map((meta, idx) => {
          const variantIndex = Math.floor(refTrack.values[idx].length / 2);
          return (
            <TrackChart
              key={meta.biosample_name}
              label={meta.biosample_name}
              refValues={refTrack.values[idx]}
              altValues={altTrack.values[idx]}
              variantIndex={variantIndex}
            />
          );
        })}
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

function CachedBadge() {
  return (
    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
      cached
    </Badge>
  );
}
