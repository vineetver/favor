"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type {
  Modality,
  OverallScore,
  ParsedVcf,
  TissueGroup,
  TrackData,
} from "../types";
import {
  ALL_SCORER_KEYS,
  classificationColor,
  classificationLabel,
  DEFAULT_VARIANT_MODALITIES,
  MODALITIES,
  parseVariantVcf,
} from "../utils";
import { useScores } from "../hooks/use-scores";
import { useVariantTracks } from "../hooks/use-variant-tracks";
import { ScoresHeatmap } from "./scores-heatmap";
import { TrackChart } from "./track-chart";
import { ModalityPicker } from "./modality-picker";
import { TissueGroupPicker } from "./tissue-group-picker";

interface AlphaGenomeVariantViewProps {
  vcf: string;
}

export function AlphaGenomeVariantView({ vcf }: AlphaGenomeVariantViewProps) {
  const parsed = useMemo(() => parseVariantVcf(vcf), [vcf]);

  return (
    <div className="space-y-8">
      <ScoresSection parsed={parsed} />
      <TracksSection parsed={parsed} />
    </div>
  );
}

// ─── Scores section ──────────────────────────────────────────

function ScoresSection({ parsed }: { parsed: ParsedVcf }) {
  const { data, isLoading, error } = useScores({
    parsed,
    scorers: ALL_SCORER_KEYS,
  });

  return (
    <section className="space-y-6">
      {isLoading && <ImpactLoading />}

      {error && (
        <p className="text-sm text-destructive py-4">
          {error instanceof Error ? error.message : "Failed to load scores"}
        </p>
      )}

      {data && (
        <>
          <ImpactHero overall={data.overall} />
          <ScoresHeatmap scorers={data.scorers} />
        </>
      )}
    </section>
  );
}

// ─── Impact hero: badge + percentile ─────────────────────────

function ImpactHero({ overall }: { overall?: OverallScore }) {
  if (!overall) return null;

  const colorClasses = classificationColor(overall.classification);
  const rawLabel = classificationLabel(overall.classification);
  const impactLabel = rawLabel.toLowerCase().includes("impact")
    ? rawLabel
    : `${rawLabel} Impact`;
  const pctile = Math.round(overall.quantile * 100);

  return (
    <div className="flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center rounded-md border px-3 py-1 text-sm font-semibold cursor-help ${colorClasses}`}
          >
            {impactLabel}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p>Based on the max quantile score across all scorers and tissues.</p>
          <p className="mt-1 opacity-70">
            High ≥ 99th · Moderate ≥ 95th · Low ≥ 90th · Benign &lt; 90th
          </p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-sm text-muted-foreground tabular-nums cursor-help">
            Stronger effect than {pctile}% of common variants
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          Ranked against ~300k common variants (MAF &gt; 1% in gnomAD v3)
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function ImpactLoading() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Computing variant impact...
      </div>
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-4 w-80" />
    </div>
  );
}

// ─── Variant Tracks — always visible, no accordion ──────────

function TracksSection({ parsed }: { parsed: ParsedVcf }) {
  const [selectedModalities, setSelectedModalities] = useState<Modality[]>(
    DEFAULT_VARIANT_MODALITIES,
  );
  const [selectedTissueGroups, setSelectedTissueGroups] = useState<
    TissueGroup[]
  >([]);
  const [requestedModalities, setRequestedModalities] = useState<
    Modality[] | null
  >(null);
  const [requestedTissueGroups, setRequestedTissueGroups] = useState<
    TissueGroup[]
  >([]);

  const { data, isLoading, error } = useVariantTracks({
    parsed,
    modalities: requestedModalities,
    tissueGroups: requestedTissueGroups,
  });

  const handlePredict = useCallback(() => {
    setRequestedModalities([...selectedModalities]);
    setRequestedTissueGroups([...selectedTissueGroups]);
  }, [selectedModalities, selectedTissueGroups]);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Variant Tracks
        </h3>
        {!data && (
          <span className="text-xs text-muted-foreground">
            Compare reference vs alternate allele signals
          </span>
        )}
      </div>

      {/* Single toolbar: modality pills · tissue filter · predict */}
      <div className="flex items-center gap-2 flex-wrap">
        <ModalityPicker
          selected={selectedModalities}
          onChange={setSelectedModalities}
          disabled={isLoading}
        />
        <div className="w-px h-5 bg-border shrink-0" />
        <TissueGroupPicker
          selected={selectedTissueGroups}
          onChange={setSelectedTissueGroups}
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

      {isLoading && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            First predictions can take 1-10 minutes. Subsequent requests for the same variant are instant.
          </p>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load tracks"}
        </p>
      )}

      {data && <VariantTrackResults data={data} />}
    </section>
  );
}

// ─── Track results ───────────────────────────────────────────

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
          Reference (up)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-red-500 rounded" />
          Alternate (down)
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
            variantPos={data.input.position}
          />
        );
      })}
    </div>
  );
}

/** Transpose [positions][tracks] → [tracks][positions] once for all tracks. */
function transposeValues(values: number[][]): number[][] {
  if (values.length === 0) return [];
  const nTracks = values[0].length;
  const nPos = values.length;
  const out: number[][] = Array.from({ length: nTracks }, () => new Array<number>(nPos));
  for (let p = 0; p < nPos; p++) {
    const row = values[p];
    for (let t = 0; t < nTracks; t++) {
      out[t][p] = row[t];
    }
  }
  return out;
}

function formatCoord(pos: number): string {
  if (pos >= 1_000_000) return `${(pos / 1_000_000).toFixed(2)}Mb`;
  if (pos >= 1_000) return `${(pos / 1_000).toFixed(1)}Kb`;
  return String(pos);
}

function GenomicRuler({ start, end, variantPos }: { start: number; end: number; variantPos?: number }) {
  const ticks = 5;
  const step = (end - start) / (ticks - 1);
  const positions = Array.from({ length: ticks }, (_, i) => Math.round(start + i * step));

  return (
    <div className="flex items-center justify-between py-1.5 px-2 text-[10px] tabular-nums text-muted-foreground">
      {positions.map((pos, i) => (
        <span key={i}>{formatCoord(pos)}</span>
      ))}
    </div>
  );
}

function ModalityTrackGroup({
  modalityLabel,
  refTrack,
  altTrack,
  variantPos,
}: {
  modalityLabel: string;
  refTrack: TrackData;
  altTrack: TrackData;
  variantPos?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const trackCount = refTrack.tracks.length;
  const displayCount = showAll ? trackCount : Math.min(trackCount, 5);
  const numPositions = refTrack.values.length;
  const variantIndex = Math.floor(numPositions / 2);
  const interval = refTrack.interval;

  // Transpose once — O(positions × tracks), memoized
  const refByTrack = useMemo(() => transposeValues(refTrack.values), [refTrack.values]);
  const altByTrack = useMemo(() => transposeValues(altTrack.values), [altTrack.values]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {modalityLabel}
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {trackCount} {trackCount === 1 ? "track" : "tracks"}
        </span>
      </div>

      {interval && (
        <div className="mb-2">
          <GenomicRuler start={interval.start} end={interval.end} variantPos={variantPos} />
        </div>
      )}

      <div className="space-y-2">
        {refTrack.tracks.slice(0, displayCount).map((meta, idx) => (
          <TrackChart
            key={idx}
            label={meta.biosample_name}
            refValues={refByTrack[idx]}
            altValues={altByTrack[idx]}
            variantIndex={variantIndex}
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
