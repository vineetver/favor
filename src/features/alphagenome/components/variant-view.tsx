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

function GeneLink({ gene }: { gene: string }) {
  // Ensembl IDs link directly; gene symbols need the symbol path
  const isEnsembl = gene.startsWith("ENSG");
  return (
    <Link
      href={`/hg38/gene/${isEnsembl ? gene : encodeURIComponent(gene)}`}
      className="text-primary hover:underline"
    >
      {gene}
    </Link>
  );
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

  // Single ranked list — hero and top hits derive from the same source of truth
  const rankedHits = useMemo(
    () => (data ? computeRankedHits(data.scorers) : []),
    [data],
  );

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
            bestHit={rankedHits[0] ?? null}
          />

          <TopHitsSection hits={rankedHits} />

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

/**
 * Scorer priority for ranking top hits.
 * Expression Change (LFC) is most directly interpretable ("changes gene X by Y"),
 * Gene Activation ("gene switches on/off") is second.
 * RNA processing scorers are specialized — important but shouldn't dominate the summary.
 */
function scorerPriority(scorer: string): number {
  const l = scorer.toLowerCase();
  if (l.includes("genemask") && l.includes("lfc")) return 5; // Expression Change — most interpretable
  if (l.includes("genemask") && l.includes("active")) return 4; // Gene Activation
  if (l.includes("contactmap")) return 3; // 3D structure
  if (l.includes("centermask")) return 2; // Positional disruption
  return 1; // Splicing, polyA, junction — specialized
}

/** Expression/activation scorers name the affected gene — they're the headline. */
function isExpressionScorer(scorer: string): boolean {
  const l = scorer.toLowerCase();
  return l.includes("genemask") && (l.includes("lfc") || l.includes("active"));
}

/**
 * Ranking score with conditional expression boost.
 *
 * When `boostExpr` is true, expression/activation hits with strong raw signals
 * get tier 1 (2.0+) — above any quantile-based hit. This is only activated when
 * expression scorers surface genes NOT found in quantile-validated hits (e.g.
 * CCAT2 for rs6983267 only appears in Expression Change with null quantiles).
 *
 * When `boostExpr` is false (e.g. rs7412 where APOE appears in both Gene
 * Activation AND RNA Processing), everything ranks by quantile — the calibrated
 * signal wins.
 */
function rankScore(quantile: number, raw: number, scorer: string, boostExpr: boolean): number {
  const q = isValidScore(quantile) && quantile > 0 ? quantile : 0;
  const priority = scorerPriority(scorer);
  const rawMag = isValidScore(raw) ? Math.abs(raw) : 0;

  // Expression/activation with a real raw signal → tier 1 (only when boost active)
  if (boostExpr && isExpressionScorer(scorer) && rawMag > 0.01) {
    const scaled = rawMag <= 1 ? rawMag : 1 + Math.log10(rawMag);
    return 2.0 + scaled + priority * 0.1;
  }

  // Quantile-based → tier 2
  if (q > 0) return q + priority * 0.01;

  // Raw-only fallback
  return rawMag > 0 ? Math.min(rawMag, 1) * 0.5 + priority * 0.01 : 0;
}

/**
 * Build a single ranked list of top tissue hits — used by both the hero summary
 * and the top-hits section so they never contradict each other.
 *
 * First determines whether expression scorers add unique gene information that
 * quantile-validated hits don't have. If so, boosts them and uses a two-pass
 * strategy (expression first, then quantile). Otherwise, ranks purely by quantile.
 */
function computeRankedHits(scorers: ScorerBlock[]): RankedHit[] {
  const all: RankedHit[] = [];
  for (const block of scorers) {
    if (!block.summary?.top_tissues) continue;
    const scorer = friendlyScorerLabel(block.scorer);
    for (const hit of block.summary.top_tissues) {
      const hasQ = isValidScore(hit.quantile_score) && hit.quantile_score > 0;
      const hasRaw = isValidScore(hit.raw_score) && hit.raw_score !== 0;
      if (!hasQ && !hasRaw) continue;
      all.push({ ...hit, scorer, scorerRaw: block.scorer });
    }
  }

  // Determine if expression scorers surface genes absent from quantile-validated hits.
  // e.g. rs6983267: CCAT2/CASC19 only appear in expression (quantiles null),
  //      POU5F1B only in RNA Processing (quantile 0.998) — expression boost needed.
  // e.g. rs7412: APOE appears in BOTH Gene Activation AND RNA Processing —
  //      quantile ranking is sufficient, no boost needed.
  const quantileGenes = new Set<string>();
  let topExprGene: string | null = null;
  let topExprRaw = 0;
  for (const hit of all) {
    const gene = hit.gene_name;
    if (!gene || gene === "?") continue;
    if (isValidScore(hit.quantile_score) && hit.quantile_score > 0 && !isExpressionScorer(hit.scorerRaw)) {
      quantileGenes.add(gene);
    }
    if (isExpressionScorer(hit.scorerRaw)) {
      const rawMag = Math.abs(hit.raw_score);
      if (rawMag > topExprRaw) {
        topExprRaw = rawMag;
        topExprGene = gene;
      }
    }
  }
  const boostExpr = topExprGene !== null && !quantileGenes.has(topExprGene);

  all.sort((a, b) =>
    rankScore(b.quantile_score, b.raw_score, b.scorerRaw, boostExpr) -
    rankScore(a.quantile_score, a.raw_score, a.scorerRaw, boostExpr),
  );

  const result: RankedHit[] = [];
  const geneCount = new Map<string, number>();

  // Pass 1 (only when expression boost active): up to 2 expression hits
  if (boostExpr) {
    const exprTissues = new Set<string>();
    const exprGenes = new Set<string>();
    for (const hit of all) {
      if (result.length >= 2) break;
      if (!isExpressionScorer(hit.scorerRaw)) continue;
      const tissue = hit.tissue_group || hit.biosample_name;
      const gene = hit.gene_name || "";
      if (exprTissues.has(tissue) || (gene && exprGenes.has(gene))) continue;
      exprTissues.add(tissue);
      if (gene) {
        exprGenes.add(gene);
        geneCount.set(gene, (geneCount.get(gene) || 0) + 1);
      }
      result.push(hit);
    }
  }

  // Pass 2: fill remaining slots (dedup by tissue, max 2 per gene)
  const tissues = new Set<string>();
  for (const hit of all) {
    if (result.length >= 5) break;
    if (boostExpr && isExpressionScorer(hit.scorerRaw)) continue;
    const tissue = hit.tissue_group || hit.biosample_name;
    if (tissues.has(tissue)) continue;
    const gene = hit.gene_name && hit.gene_name !== "?" ? hit.gene_name : null;
    if (gene && (geneCount.get(gene) || 0) >= 2) continue;
    tissues.add(tissue);
    if (gene) geneCount.set(gene, (geneCount.get(gene) || 0) + 1);
    result.push(hit);
  }

  return result;
}

// ─── Impact hero: big prominent classification ───────────────

function ImpactHero({
  overall,
  bestHit,
}: {
  overall?: OverallScore;
  bestHit: RankedHit | null;
}) {
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

      {/* Natural language summary */}
      {bestHit && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {bestHit.gene_name && bestHit.gene_name !== "?" ? (
            <>
              Predicted to most strongly affect{" "}
              <span className="font-medium">
                <GeneLink gene={bestHit.gene_name} />
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

function TopHitsSection({ hits }: { hits: RankedHit[] }) {
  if (hits.length === 0) return null;

  // Max raw score for normalizing hits that lack quantiles
  const maxRaw = Math.max(...hits.map(h => Math.abs(h.raw_score)).filter(isValidScore), 0.001);

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Top Affected Tissues
      </h3>
      <div>
        {hits.map((hit, i) => (
          <TopHitRow key={i} hit={hit} maxRaw={maxRaw} />
        ))}
      </div>
    </div>
  );
}

function TopHitRow({ hit, maxRaw }: { hit: RankedHit; maxRaw: number }) {
  const tissue = hit.tissue_group || hit.biosample_name;
  const hasQuantile = isValidScore(hit.quantile_score) && hit.quantile_score > 0;
  const barPct = hasQuantile
    ? Math.round(hit.quantile_score * 100)
    : Math.round((Math.abs(hit.raw_score) / maxRaw) * 100);
  const label = hasQuantile
    ? `${Math.round(hit.quantile_score * 100)}%`
    : formatScore(hit.raw_score);

  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-2 cursor-help">
            <span className="font-medium text-foreground">{tissue}</span>
            {hit.gene_name && hit.gene_name !== "?" && (
              <span className="text-xs">· <GeneLink gene={hit.gene_name} /></span>
            )}
            <span className="text-[11px] text-muted-foreground">· {hit.scorer}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{hit.biosample_name}</p>
          {hasQuantile && <p>Quantile: {Math.round(hit.quantile_score * 100)}%</p>}
          <p>Raw score: {formatScore(hit.raw_score)}</p>
        </TooltipContent>
      </Tooltip>
      <div className="flex items-center gap-1.5 ml-2">
        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${barPct}%` }}
          />
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground w-12">
          {label}
        </span>
      </div>
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
