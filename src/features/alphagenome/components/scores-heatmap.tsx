"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import type { ScorerBlock, ScoreTrack } from "../types";
import {
  formatQuantile,
  formatScore,
  friendlyScorerLabel,
  isValidScore,
} from "../utils";

// ─── Gene link ───────────────────────────────────────────────

function GeneLink({ gene }: { gene: string }) {
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

// ─── Tissue grouping ─────────────────────────────────────────

const CELL_LINE_EXACT = new Set([
  "hela",
  "hela-s3",
  "k562",
  "hepg2",
  "imr-90",
  "imr90",
  "hffc6",
  "thp-1",
  "thp1",
  "cyt49",
  "a549",
  "mcf-7",
  "mcf7",
  "u2os",
  "jurkat",
  "hek293",
  "kasumi",
  "nb4",
  "hl-60",
  "hl60",
  "gm12878",
  "gm19239",
  "rpmi",
]);
const STEM_CELL_EXACT = new Set(["h9", "h1-hesc", "h1", "ips"]);
const TISSUE_KEYWORDS: [string, string][] = [
  ["proximal tubule", "Kidney"],
  ["nervous system", "Nerve"],
  ["skeletal muscle", "Muscle"],
  ["trabecular meshwork", "Eye"],
  ["mammary gland", "Reproductive"],
  ["umbilical cord", "Stem Cell"],
  ["lymphatic vessel", "Immune"],
  ["villous mesenchyme", "Reproductive"],
  ["brain", "Brain"],
  ["cerebr", "Brain"],
  ["hippocamp", "Brain"],
  ["lung", "Lung"],
  ["bronchial", "Lung"],
  ["liver", "Liver"],
  ["hepatic", "Liver"],
  ["kidney", "Kidney"],
  ["renal", "Kidney"],
  ["perirenal", "Kidney"],
  ["heart", "Cardiovascular"],
  ["coronary", "Cardiovascular"],
  ["carotid", "Cardiovascular"],
  ["aort", "Cardiovascular"],
  ["artery", "Cardiovascular"],
  ["skin", "Skin"],
  ["vagina", "Reproductive"],
  ["ovary", "Reproductive"],
  ["ovarian", "Reproductive"],
  ["uterus", "Reproductive"],
  ["uterine", "Reproductive"],
  ["testis", "Reproductive"],
  ["breast", "Reproductive"],
  ["mammary", "Reproductive"],
  ["placent", "Reproductive"],
  ["amnion", "Reproductive"],
  ["amniotic", "Reproductive"],
  ["chorion", "Reproductive"],
  ["adrenal", "Endocrine"],
  ["thyroid", "Endocrine"],
  ["pituitary", "Endocrine"],
  ["pancrea", "Pancreas"],
  ["esophag", "Digestive"],
  ["stomach", "Digestive"],
  ["gastric", "Digestive"],
  ["colon", "Digestive"],
  ["intestin", "Digestive"],
  ["tongue", "Digestive"],
  ["spleen", "Immune"],
  ["lymph", "Immune"],
  ["blood", "Immune"],
  ["retina", "Eye"],
  ["cornea", "Eye"],
  ["eye", "Eye"],
  ["bladder", "Kidney"],
  ["nerve", "Nerve"],
  ["muscle", "Muscle"],
  ["pneumocyte", "Lung"],
  ["alveolar", "Lung"],
  ["airway", "Lung"],
  ["pulmonary", "Lung"],
  ["hepatocyte", "Liver"],
  ["mesangial", "Kidney"],
  ["podocyte", "Kidney"],
  ["glomerul", "Kidney"],
  ["cardiac", "Cardiovascular"],
  ["cardiomyocyte", "Cardiovascular"],
  ["vascular", "Cardiovascular"],
  ["endothelial", "Cardiovascular"],
  ["myotube", "Muscle"],
  ["myoblast", "Muscle"],
  ["myocyte", "Muscle"],
  ["fibroblast", "Connective"],
  ["adipocyte", "Connective"],
  ["preadipocyte", "Connective"],
  ["adipose", "Connective"],
  ["mesothelial", "Connective"],
  ["chondrocyte", "Connective"],
  ["osteoblast", "Connective"],
  ["keratinocyte", "Skin"],
  ["melanocyte", "Skin"],
  ["epiderm", "Skin"],
  ["sertoli", "Reproductive"],
  ["trophoblast", "Reproductive"],
  ["monocyte", "Immune"],
  ["macrophage", "Immune"],
  ["dendritic", "Immune"],
  ["leukocyte", "Immune"],
  ["astrocyte", "Brain"],
  ["neuron", "Brain"],
  ["oligodendrocyte", "Brain"],
  ["microglia", "Brain"],
  ["neural", "Brain"],
  ["schwann", "Nerve"],
  ["mesenchymal", "Connective"],
  ["stem cell", "Stem Cell"],
  ["embryonic", "Stem Cell"],
  ["hesc", "Stem Cell"],
  ["ipsc", "Stem Cell"],
];

function inferGroup(track: ScoreTrack): string {
  if (track.tissue_group) return track.tissue_group;
  const lower = track.biosample_name.toLowerCase().trim();
  if (CELL_LINE_EXACT.has(lower)) return "Cell Line";
  if (STEM_CELL_EXACT.has(lower)) return "Stem Cell";
  if (/^gm\d+$/i.test(lower)) return "Cell Line";
  for (const [kw, g] of TISSUE_KEYWORDS) {
    if (lower.includes(kw)) return g;
  }
  return "Other";
}

// ─── Scorer grouping ─────────────────────────────────────────

interface ScorerGroup {
  id: string;
  title: string;
  question: string;
  order: number;
  blocks: ScorerBlock[];
}

function scorerCategory(scorer: string): string {
  const l = scorer.toLowerCase();
  if (l.includes("centermask") || l.includes("contactmap")) return "position";
  if (l.includes("genemask") && (l.includes("lfc") || l.includes("active")))
    return "expression";
  return "rna";
}

const GROUP_META: Record<
  string,
  { title: string; question: string; order: number }
> = {
  expression: {
    title: "Gene Expression",
    question: "Which genes' expression is predicted to change?",
    order: 0,
  },
  rna: {
    title: "RNA Processing",
    question: "Does it affect splicing or polyadenylation?",
    order: 1,
  },
  position: {
    title: "Regulatory Signal",
    question: "Does this variant disrupt regulatory activity?",
    order: 2,
  },
};

function groupScorers(scorers: ScorerBlock[]): ScorerGroup[] {
  const map = new Map<string, ScorerBlock[]>();
  for (const b of scorers) {
    const cat = scorerCategory(b.scorer);
    (map.get(cat) ?? (map.set(cat, []), map.get(cat)!)).push(b);
  }
  return Array.from(map.entries())
    .map(([cat, blocks]) => ({ id: cat, ...GROUP_META[cat], blocks }))
    .sort((a, b) => a.order - b.order);
}

// ─── Per-group summary ───────────────────────────────────────

interface GroupHit {
  tissue: string;
  biosampleName: string;
  gene: string | null;
  scorer: string;
  quantile: number;
  raw: number;
  hasQuantile: boolean;
}

/** Best single hit per scorer — ensures each scorer in the group gets representation. */
function extractGroupHits(blocks: ScorerBlock[]): GroupHit[] {
  const result: GroupHit[] = [];
  for (const block of blocks) {
    if (!block.summary?.top_tissues?.length) continue;
    const scorer = friendlyScorerLabel(block.scorer);
    let best: GroupHit | null = null;
    let bestScore = -Infinity;
    for (const hit of block.summary.top_tissues) {
      const hasQ = isValidScore(hit.quantile_score) && hit.quantile_score > 0;
      const hasRaw = isValidScore(hit.raw_score) && hit.raw_score !== 0;
      if (!hasQ && !hasRaw) continue;
      const score = hasQ ? hit.quantile_score : Math.abs(hit.raw_score);
      if (score > bestScore) {
        bestScore = score;
        best = {
          tissue: hit.tissue_group || hit.biosample_name,
          biosampleName: hit.biosample_name,
          gene: hit.gene_name && hit.gene_name !== "?" ? hit.gene_name : null,
          scorer,
          quantile: hit.quantile_score,
          raw: hit.raw_score,
          hasQuantile: hasQ,
        };
      }
    }
    if (!best) continue;
    result.push(best);
  }
  result.sort((a, b) => {
    if (a.hasQuantile && b.hasQuantile) return b.quantile - a.quantile;
    if (!a.hasQuantile && !b.hasQuantile)
      return Math.abs(b.raw) - Math.abs(a.raw);
    return a.hasQuantile ? -1 : 1;
  });
  return result;
}

function compactScore(v: number): string {
  if (!isValidScore(v)) return "—";
  const sign = v > 0 ? "+" : "";
  const abs = Math.abs(v);
  if (abs >= 1) {
    const s = `${sign}${v.toFixed(1)}`;
    return s.endsWith(".0") ? s.slice(0, -2) : s;
  }
  if (abs >= 0.01) return `${sign}${v.toFixed(2)}`;
  if (abs >= 0.001) return `${sign}${v.toFixed(3)}`;
  return `${sign}${v.toFixed(4)}`;
}

/** Normalized magnitude 0–1 for bar width, using quantile when available. */
function hitMagnitude(hit: GroupHit, allHits: GroupHit[]): number {
  if (hit.hasQuantile) return hit.quantile;
  const maxRaw = Math.max(
    ...allHits.filter((h) => !h.hasQuantile).map((h) => Math.abs(h.raw)),
    0.001,
  );
  return Math.min(1, Math.abs(hit.raw) / maxRaw);
}

function GroupSummary({ blocks }: { blocks: ScorerBlock[] }) {
  const hits = useMemo(() => extractGroupHits(blocks), [blocks]);
  if (hits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-1">
        No significant signal detected.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
        Top signals
      </p>
      <div className="flex flex-col gap-1.5">
        {hits.map((hit, i) => {
          const mag = hitMagnitude(hit, hits);
          const barW = Math.max(4, Math.round(mag * 64));
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className="grid items-center gap-x-2 py-0.5 cursor-help max-w-lg"
                  style={{ gridTemplateColumns: "auto 1fr" }}
                >
                  {/* Row 1: text labels */}
                  <div className="flex items-center gap-1.5 text-sm min-w-0">
                    <span className="font-medium text-foreground shrink-0">
                      {hit.tissue}
                    </span>
                    {hit.gene && (
                      <>
                        <span className="text-muted-foreground shrink-0">
                          ·
                        </span>
                        <GeneLink gene={hit.gene} />
                      </>
                    )}
                    <span className="text-muted-foreground shrink-0">·</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {hit.scorer}
                    </span>
                  </div>
                  {/* Score + bar */}
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 rounded-sm bg-foreground/20"
                      style={{ width: barW }}
                    />
                    <span className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                      {hit.hasQuantile
                        ? `${Math.round(hit.quantile * 100)}%`
                        : compactScore(hit.raw)}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-0.5">
                  <p className="font-medium">{hit.biosampleName}</p>
                  {hit.hasQuantile && (
                    <p>Quantile: {Math.round(hit.quantile * 100)}%</p>
                  )}
                  <p>Raw score: {formatScore(hit.raw)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// ─── Data helpers ─────────────────────────────────────────────

interface TissueGroupData {
  name: string;
  trackIndices: number[];
}
interface CellInfo {
  norm: number | null;
  rowIdx: number;
  trackIdx: number | null;
}

function buildTissueGroups(tracks: ScoreTrack[]): TissueGroupData[] {
  const map = new Map<string, number[]>();
  for (let i = 0; i < tracks.length; i++) {
    const g = inferGroup(tracks[i]);
    (map.get(g) ?? (map.set(g, []), map.get(g)!)).push(i);
  }
  return Array.from(map.entries()).map(([name, trackIndices]) => ({
    name,
    trackIndices,
  }));
}

function normalizeBlock(block: ScorerBlock): (number | null)[][] {
  if (block.quantile_scores) return block.quantile_scores;
  const flat = block.raw_scores
    .flat()
    .filter((v): v is number => v != null && !isNaN(v));
  if (flat.length === 0) return block.raw_scores;
  const maxAbs = Math.max(...flat.map(Math.abs));
  if (maxAbs === 0) return block.raw_scores;
  return block.raw_scores.map((row) =>
    row.map((v) => (v == null || isNaN(v) ? null : Math.abs(v) / maxAbs)),
  );
}

function computeGroupCells(
  normalized: (number | null)[][],
  groups: TissueGroupData[],
): CellInfo[][] {
  return normalized.map((row, rowIdx) =>
    groups.map((g) => {
      let best: CellInfo = { norm: null, rowIdx, trackIdx: null };
      let bestVal = -1;
      for (const idx of g.trackIndices) {
        const v = row[idx];
        if (v != null && v > bestVal) {
          bestVal = v;
          best = { norm: v, rowIdx, trackIdx: idx };
        }
      }
      return best;
    }),
  );
}

function deduplicateAndSort(
  labels: string[],
  cells: CellInfo[][],
  max: number,
) {
  const map = new Map<string, number[]>();
  for (let i = 0; i < labels.length; i++)
    (map.get(labels[i]) ?? (map.set(labels[i], []), map.get(labels[i])!)).push(
      i,
    );

  const rows: { label: string; cells: CellInfo[]; max: number }[] = [];
  for (const [name, indices] of map) {
    const nCols = cells[0]?.length ?? 0;
    const merged: CellInfo[] = [];
    let rowMax = 0;
    for (let c = 0; c < nCols; c++) {
      let best: CellInfo = { norm: null, rowIdx: indices[0], trackIdx: null };
      for (const ri of indices) {
        const cell = cells[ri]?.[c];
        if (
          cell &&
          cell.norm != null &&
          (best.norm === null || cell.norm > best.norm)
        )
          best = cell;
      }
      merged.push(best);
      if (best.norm != null && best.norm > rowMax) rowMax = best.norm;
    }
    rows.push({ label: name, cells: merged, max: rowMax });
  }
  rows.sort((a, b) => b.max - a.max);
  const top = rows.slice(0, max);
  return { labels: top.map((r) => r.label), cells: top.map((r) => r.cells) };
}

// ─── Color ────────────────────────────────────────────────────

function cellColor(v: number | null): string {
  if (v == null || isNaN(v) || v < 0.02) return "transparent";
  const t = Math.max(0, Math.min(1, v));
  return `rgb(${Math.round(250 - t * 126)},${Math.round(250 - t * 192)},${Math.round(250 - t * 13)})`;
}

// ─── Constants ────────────────────────────────────────────────

const CELL_H = 28;
const LABEL_W = 160;
const HEADER_H = 90;
const MAX_ROWS = 12;

// ─── Angled column header ─────────────────────────────────────

function AngledHeader({
  name,
  trackCount,
}: {
  name: string;
  trackCount: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="relative h-full flex items-end justify-center"
          style={{ overflow: "visible" }}
        >
          <span
            className="text-xs text-muted-foreground whitespace-nowrap origin-bottom-left"
            style={{
              transform: "rotate(-45deg) translateX(-2px)",
              marginBottom: 2,
            }}
          >
            {name}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {name} ({trackCount} tracks)
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Main component ───────────────────────────────────────────

export function ScoresHeatmap({ scorers }: { scorers: ScorerBlock[] }) {
  const groups = useMemo(() => groupScorers(scorers), [scorers]);

  if (scorers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No scores returned.
      </p>
    );
  }

  return (
    <div>
      {groups.map((group, gi) => (
        <ScorerGroupSection key={group.id} group={group} isFirst={gi === 0} />
      ))}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-8 pt-4 border-t border-border">
        <span className="text-[11px] text-muted-foreground">
          Effect magnitude:
        </span>
        <div className="flex items-center gap-px">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
            <div
              key={v}
              className="w-6 h-3.5 rounded-[2px]"
              style={{ backgroundColor: cellColor(v) }}
            />
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground">Low → High</span>
      </div>
    </div>
  );
}

// ─── Per-group section ───────────────────────────────────────

function ScorerGroupSection({
  group,
  isFirst,
}: {
  group: ScorerGroup;
  isFirst: boolean;
}) {
  return (
    <section className={isFirst ? "" : "mt-8 pt-7 border-t border-border"}>
      {/* Header + subtitle */}
      <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{group.question}</p>

      {/* Top signals */}
      <GroupSummary blocks={group.blocks} />

      <div className="mt-6">
        <ScorerGroupContent blocks={group.blocks} />
      </div>
    </section>
  );
}

// ─── Tissue breakdown content (renders inside Popover) ──────

function CellBreakdownContent({
  block,
  rowIdx,
  trackIndices,
  geneName,
  groupName,
}: {
  block: ScorerBlock;
  rowIdx: number;
  trackIndices: number[];
  geneName: string;
  groupName: string;
}) {
  const hasQuantile = block.quantile_scores != null;
  const entries = useMemo(() => {
    const items = trackIndices
      .map((idx) => ({
        name: block.tracks[idx].biosample_name,
        raw: block.raw_scores[rowIdx]?.[idx] ?? 0,
        quantile: block.quantile_scores?.[rowIdx]?.[idx] ?? null,
        absRaw: Math.abs(block.raw_scores[rowIdx]?.[idx] ?? 0),
        idx,
      }))
      .filter((e) => isValidScore(e.raw) && e.absRaw > 0.0001);
    items.sort((a, b) => {
      if (hasQuantile && a.quantile != null && b.quantile != null)
        return b.quantile - a.quantile;
      return b.absRaw - a.absRaw;
    });
    return items;
  }, [block, rowIdx, trackIndices, hasQuantile]);

  const [showAll, setShowAll] = useState(false);
  const display = showAll ? entries : entries.slice(0, 10);
  const maxAbs = entries[0]?.absRaw ?? 1;

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No significant signal.</p>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-foreground mb-2">
        {geneName} × {groupName}
        <span className="text-muted-foreground font-normal ml-1">
          ({entries.length})
        </span>
      </p>
      <div className="space-y-0.5 max-h-64 overflow-y-auto">
        {display.map((e) => {
          const barW = Math.max(2, Math.round((e.absRaw / maxAbs) * 40));
          return (
            <div
              key={e.idx}
              className="flex items-center gap-2 text-[11px] py-px"
            >
              <span
                className="text-muted-foreground truncate w-[120px] shrink-0"
                title={e.name}
              >
                {e.name}
              </span>
              <div
                className="h-1.5 rounded-sm bg-foreground/20 shrink-0"
                style={{ width: barW }}
              />
              {hasQuantile && e.quantile != null && (
                <span className="tabular-nums text-muted-foreground shrink-0">
                  {Math.round(e.quantile * 100)}%
                </span>
              )}
              <span className="tabular-nums text-muted-foreground shrink-0">
                {compactScore(e.raw)}
              </span>
            </div>
          );
        })}
      </div>
      {entries.length > 10 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs text-primary hover:underline mt-1.5"
        >
          Show all {entries.length} tissues
        </button>
      )}
    </div>
  );
}

// ─── Group content: combines single-row scorers, separates multi-row ─

function uniqueGeneCount(block: ScorerBlock): number {
  if (block.rows.length === 0) return 1;
  return new Set(block.rows.map((r) => r.gene_name)).size;
}

function ScorerGroupContent({ blocks }: { blocks: ScorerBlock[] }) {
  const compact: ScorerBlock[] = [];
  const full: ScorerBlock[] = [];
  for (const b of blocks) {
    (uniqueGeneCount(b) <= 5 ? compact : full).push(b);
  }

  return (
    <div className="space-y-5">
      {compact.length > 1 && <CombinedScorerView blocks={compact} />}
      {compact.length === 1 && <TissueHeatmap block={compact[0]} />}
      {full.map((block, idx) => (
        <TissueHeatmap key={idx} block={block} />
      ))}
    </div>
  );
}

// ─── Combined view: multiple single-row scorers share column headers ─

interface CombinedRow {
  label: string;
  scores: Map<
    string,
    {
      norm: number;
      raw: number | null;
      quantile: number | null;
      trackName: string;
      trackCount: number;
      blockRef: ScorerBlock;
      bestRowIdx: number;
      trackIndices: number[];
    }
  >;
  hasQuantile: boolean;
}

function CombinedScorerView({ blocks }: { blocks: ScorerBlock[] }) {
  const { rows, sortedGroups } = useMemo(() => {
    const allGroupScores = new Map<string, number>();
    const allGroupCounts = new Map<string, number>();
    const combinedRows: CombinedRow[] = [];

    for (const block of blocks) {
      const scorerLabel = friendlyScorerLabel(block.scorer);
      const normalized = normalizeBlock(block);
      const groups = buildTissueGroups(block.tracks);
      const hasQuantile = block.quantile_scores != null;

      const geneRows = new Map<string, number[]>();
      if (block.rows.length > 0) {
        for (let r = 0; r < block.rows.length; r++) {
          const name = block.rows[r].gene_name;
          (
            geneRows.get(name) ?? (geneRows.set(name, []), geneRows.get(name)!)
          ).push(r);
        }
      } else {
        geneRows.set(
          "",
          Array.from({ length: block.raw_scores.length }, (_, i) => i),
        );
      }

      for (const [geneName, rowIndices] of geneRows) {
        const label = geneName ? `${scorerLabel} · ${geneName}` : scorerLabel;
        const scores: CombinedRow["scores"] = new Map();

        for (const g of groups) {
          let bestNorm = 0;
          let bestRowIdx = rowIndices[0];
          let bestTrackIdx = 0;
          for (const r of rowIndices) {
            for (const idx of g.trackIndices) {
              const v = normalized[r]?.[idx] ?? 0;
              if (v != null && v > bestNorm) {
                bestNorm = v;
                bestRowIdx = r;
                bestTrackIdx = idx;
              }
            }
          }
          if (bestNorm > 0.01) {
            scores.set(g.name, {
              norm: bestNorm,
              raw: block.raw_scores[bestRowIdx]?.[bestTrackIdx] ?? null,
              quantile:
                block.quantile_scores?.[bestRowIdx]?.[bestTrackIdx] ?? null,
              trackName: block.tracks[bestTrackIdx]?.biosample_name ?? "",
              trackCount: g.trackIndices.length,
              blockRef: block,
              bestRowIdx,
              trackIndices: g.trackIndices,
            });
          }
          allGroupScores.set(
            g.name,
            Math.max(allGroupScores.get(g.name) ?? 0, bestNorm),
          );
          allGroupCounts.set(
            g.name,
            Math.max(allGroupCounts.get(g.name) ?? 0, g.trackIndices.length),
          );
        }

        combinedRows.push({ label, scores, hasQuantile });
      }
    }

    const sorted = Array.from(allGroupScores.entries())
      .filter(([, max]) => max > 0.01)
      .sort(([, a], [, b]) => b - a)
      .map(([name]) => ({ name, trackCount: allGroupCounts.get(name) ?? 0 }));

    return { rows: combinedRows, sortedGroups: sorted };
  }, [blocks]);

  if (rows.length === 0 || sortedGroups.length === 0) return null;

  return (
    <div>
      <div style={{ overflow: "visible" }}>
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: `${LABEL_W}px repeat(${sortedGroups.length}, minmax(28px, 1fr))`,
            gridTemplateRows: `${HEADER_H}px repeat(${rows.length}, ${CELL_H}px)`,
            overflow: "visible",
          }}
        >
          <div />
          {sortedGroups.map((g) => (
            <AngledHeader
              key={g.name}
              name={g.name}
              trackCount={g.trackCount}
            />
          ))}

          {rows.map((row, ri) => (
            <Fragment key={ri}>
              <div
                className="flex items-center pr-3 text-xs text-foreground truncate"
                title={row.label}
              >
                {row.label}
              </div>
              {sortedGroups.map((g) => {
                const score = row.scores.get(g.name);
                const color = cellColor(score?.norm ?? null);
                const hasSignal = score != null && score.norm > 0.01;
                if (!hasSignal) {
                  return (
                    <div key={`${ri}-${g.name}`} className="p-[1px]">
                      <div
                        className="w-full h-full rounded-[2px]"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  );
                }
                return (
                  <Popover key={`${ri}-${g.name}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <button type="button" className="p-[1px]">
                            <div
                              className="w-full h-full rounded-[2px]"
                              style={{ backgroundColor: color }}
                            />
                          </button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">
                          {row.label} × {g.name}
                        </p>
                        {score.trackCount > 1 && <p>Top: {score.trackName}</p>}
                        {row.hasQuantile && score.quantile != null && (
                          <p>Quantile: {formatQuantile(score.quantile)}</p>
                        )}
                        <p>
                          Raw:{" "}
                          {score.raw != null ? formatScore(score.raw) : "—"}
                        </p>
                        <p className="text-[10px] opacity-60 mt-1">
                          Click for tissue breakdown
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      className="w-80 p-3"
                    >
                      <CellBreakdownContent
                        block={score.blockRef}
                        rowIdx={score.bestRowIdx}
                        trackIndices={score.trackIndices}
                        geneName={row.label}
                        groupName={g.name}
                      />
                    </PopoverContent>
                  </Popover>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Individual heatmap (for multi-row scorers like Gene LFC) ─

function TissueHeatmap({ block }: { block: ScorerBlock }) {
  const label = friendlyScorerLabel(block.scorer);
  const hasQuantile = block.quantile_scores != null;
  const normalized = useMemo(() => normalizeBlock(block), [block]);
  const tissueGroups = useMemo(
    () => buildTissueGroups(block.tracks),
    [block.tracks],
  );
  const rawCells = useMemo(
    () => computeGroupCells(normalized, tissueGroups),
    [normalized, tissueGroups],
  );
  const rawLabels = useMemo(
    () =>
      block.rows.length > 0
        ? block.rows.map((r) => r.gene_name)
        : ["(all positions)"],
    [block.rows],
  );
  const uniqueGenes = new Set(rawLabels).size;

  const [showAllGenes, setShowAllGenes] = useState(false);
  const rowLimit = showAllGenes ? uniqueGenes : MAX_ROWS;
  const { labels, cells } = useMemo(
    () => deduplicateAndSort(rawLabels, rawCells, rowLimit),
    [rawLabels, rawCells, rowLimit],
  );

  const sortedGroupIndices = useMemo(() => {
    const withMax = tissueGroups.map((_, gi) => {
      let max = 0;
      for (const row of cells) {
        const v = row[gi]?.norm;
        if (v != null && v > max) max = v;
      }
      return { gi, max };
    });
    return withMax
      .filter(({ max }) => max > 0.01)
      .sort((a, b) => b.max - a.max)
      .map(({ gi }) => gi);
  }, [tissueGroups, cells]);

  if (labels.length === 0 || sortedGroupIndices.length === 0) return null;
  const nCols = sortedGroupIndices.length;
  const nRows = labels.length;
  const hasGeneLabels = block.rows.length > 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">
          {uniqueGenes > 1 ? `${uniqueGenes} genes · ` : ""}
          {block.tracks.length} tracks · {nCols} groups
        </span>
      </div>

      <div style={{ overflow: "visible" }}>
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: hasGeneLabels
              ? `${LABEL_W}px repeat(${nCols}, minmax(28px, 1fr))`
              : `repeat(${nCols}, minmax(28px, 1fr))`,
            gridTemplateRows: `${HEADER_H}px repeat(${nRows}, ${CELL_H}px)`,
            overflow: "visible",
          }}
        >
          {hasGeneLabels && <div />}
          {sortedGroupIndices.map((gi) => {
            const g = tissueGroups[gi];
            return (
              <AngledHeader
                key={`hdr-${gi}`}
                name={g.name}
                trackCount={g.trackIndices.length}
              />
            );
          })}

          {labels.map((rowLabel, ri) => (
            <Fragment key={ri}>
              {hasGeneLabels && (
                <div
                  className="flex items-center pr-3 text-xs text-foreground truncate"
                  title={rowLabel}
                >
                  {rowLabel}
                </div>
              )}
              {sortedGroupIndices.map((gi) => {
                const cell = cells[ri]?.[gi];
                const g = tissueGroups[gi];
                const color = cellColor(cell?.norm ?? null);
                const hasValue = cell?.norm != null && cell.norm > 0.01;
                if (!hasValue) {
                  return (
                    <div key={`${ri}-${gi}`} className="p-[1px]">
                      <div
                        className="w-full h-full rounded-[2px]"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  );
                }
                return (
                  <Popover key={`${ri}-${gi}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <button type="button" className="p-[1px]">
                            <div
                              className="w-full h-full rounded-[2px]"
                              style={{ backgroundColor: color }}
                            />
                          </button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">
                          {rowLabel} × {g.name}
                        </p>
                        {cell!.trackIdx != null &&
                          g.trackIndices.length > 1 && (
                            <p>
                              Top: {block.tracks[cell!.trackIdx].biosample_name}
                            </p>
                          )}
                        {hasQuantile &&
                          cell!.trackIdx != null &&
                          block.quantile_scores?.[cell!.rowIdx]?.[
                            cell!.trackIdx
                          ] != null && (
                            <p>
                              Quantile:{" "}
                              {formatQuantile(
                                block.quantile_scores![cell!.rowIdx][
                                  cell!.trackIdx
                                ],
                              )}
                            </p>
                          )}
                        <p>
                          Raw:{" "}
                          {cell!.trackIdx != null
                            ? formatScore(
                                block.raw_scores[cell!.rowIdx]?.[
                                  cell!.trackIdx
                                ] ?? 0,
                              )
                            : "—"}
                        </p>
                        <p className="text-[10px] opacity-60 mt-1">
                          Click for tissue breakdown
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      className="w-80 p-3"
                    >
                      <CellBreakdownContent
                        block={block}
                        rowIdx={cell!.rowIdx}
                        trackIndices={g.trackIndices}
                        geneName={rowLabel}
                        groupName={g.name}
                      />
                    </PopoverContent>
                  </Popover>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Show all genes toggle */}
      {uniqueGenes > MAX_ROWS && (
        <button
          type="button"
          onClick={() => setShowAllGenes((v) => !v)}
          className="text-[11px] text-primary hover:underline mt-1"
        >
          {showAllGenes
            ? `Show top ${MAX_ROWS} genes`
            : `Show all ${uniqueGenes} genes`}
        </button>
      )}
    </div>
  );
}
