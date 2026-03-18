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
  classificationColor,
  classificationLabel,
  DEFAULT_SCORERS,
  DEFAULT_VARIANT_MODALITIES,
  formatQuantile,
  formatScore,
  friendlyScorerLabel,
  MODALITIES,
  parseVariantVcf,
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
  const [selectedScorers, setSelectedScorers] = useState<ScorerKey[]>(DEFAULT_SCORERS);

  const { data, isLoading, error } = useScores({
    parsed,
    scorers: selectedScorers,
  });

  return (
    <section className="space-y-6">
      {/* Layer 1: "Should I care?" — hero classification */}
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

          {/* Layer 2: "What does it affect?" — top hits */}
          <TopHitsSection scorers={data.scorers} />

          {/* Layer 3: Full heatmap with inline scorer filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Tissue Heatmap
              </h3>
              <ScorerPicker
                selected={selectedScorers}
                onChange={setSelectedScorers}
                disabled={isLoading}
              />
            </div>
            <ScoresHeatmap scorers={data.scorers} />
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
  // Find the single best hit across all scorers
  const bestHit = useMemo(() => {
    let best: (TopTissueHit & { scorer: string }) | null = null;
    let bestVal = -1;
    for (const block of scorers) {
      if (!block.summary?.top_tissues?.length) continue;
      const scorer = friendlyScorerLabel(block.scorer);
      for (const hit of block.summary.top_tissues) {
        const val = hit.quantile_score || Math.abs(hit.raw_score);
        if (val > bestVal) {
          bestVal = val;
          best = { ...hit, scorer };
        }
      }
    }
    return best;
  }, [scorers]);

  if (!overall) {
    // No classification available — show a minimal summary
    return bestHit ? (
      <div className="rounded-lg border border-border bg-card p-5">
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
  // classificationLabel may return "Moderate Impact" or just "Moderate" —
  // normalize so we never double up "Impact Impact"
  const rawLabel = classificationLabel(overall.classification);
  const impactLabel = rawLabel.toLowerCase().includes("impact")
    ? rawLabel
    : `${rawLabel} Impact`;
  const pctile = Math.round(overall.quantile * 100);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          {/* Classification badge + percentile */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-md border px-3 py-1 text-sm font-semibold ${colorClasses}`}
            >
              {impactLabel}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {ordinal(pctile)} percentile
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Ranked against all variants across all tissues and scorers
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

      </div>
    </div>
  );
}

function ImpactLoading() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Computing variant impact...
      </div>
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-4 w-80" />
    </div>
  );
}

// ─── Layer 2: Top tissue hits — pre-computed by backend ──────

interface RankedHit extends TopTissueHit {
  scorer: string;
}

function TopHitsSection({ scorers }: { scorers: ScorerBlock[] }) {
  const hits = useMemo(() => {
    const all: RankedHit[] = [];
    for (const block of scorers) {
      if (!block.summary?.top_tissues) continue;
      const scorer = friendlyScorerLabel(block.scorer);
      for (const hit of block.summary.top_tissues) {
        all.push({ ...hit, scorer });
      }
    }
    // Sort by quantile (or raw if no quantile) and deduplicate by tissue+gene
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
      <h3 className="text-sm font-semibold text-foreground mb-2">
        Top Affected Tissues
      </h3>
      <div className="divide-y divide-border">
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
  const score = hasQuantile
    ? formatQuantile(hit.quantile_score)
    : formatScore(hit.raw_score);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-3 py-2 text-sm">
          <span className="font-medium text-foreground w-32 truncate shrink-0">
            {tissue}
          </span>
          {hit.gene_name && (
            <span className="text-xs text-muted-foreground truncate">
              {hit.gene_name}
            </span>
          )}
          <span className="ml-auto text-xs tabular-nums text-muted-foreground shrink-0">
            {score}
          </span>
          <span className="text-[11px] text-muted-foreground w-24 text-right shrink-0">
            {hit.scorer}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {hit.biosample_name !== tissue && <p>Top track: {hit.biosample_name}</p>}
        {hasQuantile && <p>Quantile: {formatQuantile(hit.quantile_score)}</p>}
        <p>Raw: {formatScore(hit.raw_score)}</p>
      </TooltipContent>
    </Tooltip>
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
