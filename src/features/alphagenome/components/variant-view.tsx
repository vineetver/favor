"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, ArrowUpRight } from "lucide-react";
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
  ScorerBlock,
  ScorerKey,
  TissueGroup,
  TopTissueHit,
  TrackData,
} from "../types";
import {
  ALL_SCORER_KEYS,
  classificationColor,
  classificationLabel,
  DEFAULT_SCORERS,
  DEFAULT_VARIANT_MODALITIES,
  formatQuantile,
  formatScore,
  friendlyScorerDescription,
  friendlyScorerLabel,
  isValidScore,
  MODALITIES,
  parseVariantVcf,
  SCORERS,
} from "../utils";
import { useScores } from "../hooks/use-scores";
import { useVariantTracks } from "../hooks/use-variant-tracks";
import { ScoresHeatmap } from "./scores-heatmap";
import { TrackChart } from "./track-chart";
import { ModalityPicker } from "./modality-picker";
import { ScorerPicker } from "./scorer-picker";
import { TissueGroupPicker } from "./tissue-group-picker";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

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

// ─── Layer 1 + 2 + 3: Scores ─────────────────────────────────

function ScoresSection({ parsed }: { parsed: ParsedVcf }) {
  // Fetch ALL scorers once — picker is a client-side display filter, not a fetch trigger
  const { data, isLoading, error } = useScores({
    parsed,
    scorers: ALL_SCORER_KEYS,
  });

  const [visibleScorers, setVisibleScorers] = useState<ScorerKey[]>(DEFAULT_SCORERS);

  // Derive filtered scorer blocks from the full dataset
  const visibleScorerSet = useMemo(() => new Set(visibleScorers), [visibleScorers]);
  const filteredBlocks = useMemo(() => {
    if (!data) return [];
    return data.scorers.filter(block => {
      const match = SCORERS.find(s => block.scorer.toLowerCase().includes(s.id.replace(/_/g, "")));
      return match ? visibleScorerSet.has(match.id) : true;
    });
  }, [data, visibleScorerSet]);

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
          <ImpactHero
            overall={data.overall}
            scorers={data.scorers}
          />

          <TopHitsSection scorers={data.scorers} />

          {/* Layer 3: Full heatmap — picker filters locally, no refetch */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Tissue Heatmap
              </h3>
              <ScorerPicker
                selected={visibleScorers}
                onChange={setVisibleScorers}
              />
            </div>
            <ScoresHeatmap scorers={filteredBlocks} />
          </div>
        </>
      )}
    </section>
  );
}

// ─── Impact hero: big prominent classification ───────────────

function ImpactHero({
  overall,
  scorers,
}: {
  overall?: OverallScore;
  scorers: ScorerBlock[];
}) {
  // Find the single best hit across all scorers, filtering NaN
  const bestHit = useMemo(() => {
    let best: (TopTissueHit & { scorer: string }) | null = null;
    let bestVal = -1;
    for (const block of scorers) {
      if (!block.summary?.top_tissues?.length) continue;
      const scorer = friendlyScorerLabel(block.scorer);
      for (const hit of block.summary.top_tissues) {
        if (!isValidScore(hit.raw_score)) continue;
        const val = hit.quantile_score || Math.abs(hit.raw_score);
        if (isValidScore(val) && val > bestVal) {
          bestVal = val;
          best = { ...hit, scorer };
        }
      }
    }
    return best;
  }, [scorers]);

  if (!overall) {
    return bestHit ? (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Strongest predicted effect on{" "}
          <span className="text-foreground font-medium">
            {bestHit.gene_name}
          </span>{" "}
          in{" "}
          <span className="text-foreground font-medium">
            {bestHit.tissue_group || bestHit.biosample_name}
          </span>
          {" "}({bestHit.scorer}, {formatScore(bestHit.raw_score)})
        </p>
      </div>
    ) : null;
  }

  const colorClasses = classificationColor(overall.classification);
  const rawLabel = classificationLabel(overall.classification);
  const impactLabel = rawLabel.toLowerCase().includes("impact")
    ? rawLabel
    : `${rawLabel} Impact`;
  const pctile = Math.round(overall.quantile * 100);

  return (
    <div className="space-y-2">
      {/* Classification badge + percentile with quantile bar */}
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center rounded-md border px-3 py-1 text-sm font-semibold ${colorClasses}`}
        >
          {impactLabel}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground tabular-nums">
                {ordinal(pctile)} percentile
              </span>
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${pctile}%` }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Higher than {pctile}% of all scored variants
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Natural language summary */}
      {bestHit && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {bestHit.gene_name ? (
            <>
              Predicted to most strongly affect{" "}
              <span className="text-foreground font-medium">
                {bestHit.gene_name}
              </span>{" "}
              expression in{" "}
              <span className="text-foreground font-medium">
                {bestHit.tissue_group || bestHit.biosample_name}
              </span>{" "}
              tissue
            </>
          ) : (
            <>
              Strongest predicted regulatory effect in{" "}
              <span className="text-foreground font-medium">
                {bestHit.tissue_group || bestHit.biosample_name}
              </span>{" "}
              tissue
            </>
          )}
        </p>
      )}
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

// ─── Layer 2: Top tissue hits — ranked cards ──────────────────

interface RankedHit extends TopTissueHit {
  scorer: string;
  scorerRaw: string;
}

function TopHitsSection({ scorers }: { scorers: ScorerBlock[] }) {
  const hits = useMemo(() => {
    const all: RankedHit[] = [];
    for (const block of scorers) {
      if (!block.summary?.top_tissues) continue;
      const scorer = friendlyScorerLabel(block.scorer);
      for (const hit of block.summary.top_tissues) {
        if (!isValidScore(hit.raw_score)) continue;
        all.push({ ...hit, scorer, scorerRaw: block.scorer });
      }
    }
    all.sort((a, b) => (b.quantile_score || 0) - (a.quantile_score || 0));
    const seen = new Set<string>();
    const unique: RankedHit[] = [];
    for (const hit of all) {
      const key = `${hit.tissue_group || hit.biosample_name}:${hit.gene_name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(hit);
      if (unique.length >= 5) break;
    }
    return unique;
  }, [scorers]);

  if (hits.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Top Affected Tissues
      </h3>
      <div>
        {hits.map((hit, i) => (
          <TopHitRow key={i} hit={hit} />
        ))}
      </div>
    </div>
  );
}

function TopHitRow({ hit }: { hit: RankedHit }) {
  const hasQuantile = hit.quantile_score > 0;
  const tissue = hit.tissue_group || hit.biosample_name;
  const scoreLabel = hasQuantile
    ? `${ordinal(Math.round(hit.quantile_score * 100))} pctile`
    : formatScore(hit.raw_score);
  const scorerDesc = friendlyScorerDescription(hit.scorerRaw);

  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <span className="font-medium text-foreground w-28 truncate shrink-0">
        {tissue}
      </span>
      {hit.biosample_name !== tissue && (
        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
          {hit.biosample_name}
        </span>
      )}
      {hit.gene_name && (
        <span className="inline-flex items-center gap-0.5 text-xs text-primary shrink-0 ml-auto">
          {hit.gene_name}
          <ArrowUpRight className="h-3 w-3" />
        </span>
      )}
      <span className="text-xs tabular-nums text-muted-foreground shrink-0">
        {scoreLabel}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline cursor-help">
            {hit.scorer}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {scorerDesc}
        </TooltipContent>
      </Tooltip>
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
