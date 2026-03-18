"use client";

import { Fragment, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { ScorerBlock, ScoreTrack } from "../types";
import { formatScore, formatQuantile, parseScorerLabel } from "../utils";

// ─── AlphaGenome tissue grouping ──────────────────────────────

const CELL_LINE_EXACT = new Set([
  "hela", "hela-s3", "k562", "hepg2", "imr-90", "imr90",
  "hffc6", "thp-1", "thp1", "cyt49", "a549", "mcf-7", "mcf7",
  "u2os", "jurkat", "hek293", "kasumi", "nb4", "hl-60", "hl60",
  "gm12878", "gm19239", "rpmi",
]);

const STEM_CELL_EXACT = new Set(["h9", "h1-hesc", "h1", "ips"]);

const TISSUE_KEYWORDS: [string, string][] = [
  // Compound phrases first
  ["proximal tubule", "Kidney"],
  ["nervous system", "Nerve"],
  ["skeletal muscle", "Muscle"],
  ["trabecular meshwork", "Eye"],
  ["mammary gland", "Reproductive"],
  ["umbilical cord", "Stem Cell"],
  ["lymphatic vessel", "Immune"],
  ["villous mesenchyme", "Reproductive"],
  // Organ keywords (specific before generic; "muscle" last)
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
  // Cell-type keywords (checked last)
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

function inferAlphaGenomeGroup(track: ScoreTrack): string {
  // Prefer backend-provided tissue_group (from ClickHouse tissue_vocab)
  if (track.tissue_group) return track.tissue_group;

  // Fallback: keyword matching for older responses without tissue_group
  const lower = track.biosample_name.toLowerCase().trim();
  if (CELL_LINE_EXACT.has(lower)) return "Cell Line";
  if (STEM_CELL_EXACT.has(lower)) return "Stem Cell";
  if (/^gm\d+$/i.test(lower)) return "Cell Line";
  for (const [kw, group] of TISSUE_KEYWORDS) {
    if (lower.includes(kw)) return group;
  }
  return "Other";
}

// ─── Data types ───────────────────────────────────────────────

interface TissueGroup {
  name: string;
  trackIndices: number[];
}

interface CellInfo {
  norm: number | null;
  rowIdx: number;
  trackIdx: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────

function buildTissueGroups(tracks: ScoreTrack[]): TissueGroup[] {
  const map = new Map<string, number[]>();
  for (let i = 0; i < tracks.length; i++) {
    const group = inferAlphaGenomeGroup(tracks[i]);
    const arr = map.get(group) ?? [];
    arr.push(i);
    map.set(group, arr);
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
    row.map((v) => {
      if (v == null || isNaN(v)) return null;
      return Math.abs(v) / maxAbs;
    }),
  );
}

function computeGroupCells(
  normalized: (number | null)[][],
  groups: TissueGroup[],
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

/** Merge duplicate gene names: for each unique name, take max per tissue group. */
function deduplicateAndSort(
  rowLabels: string[],
  cellsByRow: CellInfo[][],
  maxRows: number,
): { labels: string[]; cells: CellInfo[][] } {
  const map = new Map<string, number[]>();
  for (let i = 0; i < rowLabels.length; i++) {
    const arr = map.get(rowLabels[i]) ?? [];
    arr.push(i);
    map.set(rowLabels[i], arr);
  }

  const rows: { label: string; cells: CellInfo[]; maxScore: number }[] = [];

  for (const [name, indices] of map) {
    const nCols = cellsByRow[0]?.length ?? 0;
    const merged: CellInfo[] = [];
    let rowMax = 0;

    for (let c = 0; c < nCols; c++) {
      let best: CellInfo = {
        norm: null,
        rowIdx: indices[0],
        trackIdx: null,
      };
      for (const ri of indices) {
        const cell = cellsByRow[ri]?.[c];
        if (
          cell &&
          cell.norm != null &&
          (best.norm === null || cell.norm > best.norm)
        ) {
          best = cell;
        }
      }
      merged.push(best);
      if (best.norm != null && best.norm > rowMax) rowMax = best.norm;
    }

    rows.push({ label: name, cells: merged, maxScore: rowMax });
  }

  rows.sort((a, b) => b.maxScore - a.maxScore);
  const top = rows.slice(0, maxRows);

  return {
    labels: top.map((r) => r.label),
    cells: top.map((r) => r.cells),
  };
}

// ─── Color scale ──────────────────────────────────────────────

function cellColor(v: number | null): string {
  if (v == null || isNaN(v) || v < 0.02) return "transparent";
  const t = Math.max(0, Math.min(1, v));
  // White (#fafafa) → Violet (#7c3aed, our --primary)
  const r = Math.round(250 - t * 126);
  const g = Math.round(250 - t * 192);
  const b = Math.round(250 - t * 13);
  return `rgb(${r},${g},${b})`;
}

// ─── Constants ────────────────────────────────────────────────

const CELL_W = 36;
const CELL_H = 22;
const LABEL_W = 140;
const HEADER_H = 72;
const MAX_ROWS = 12;

// ─── Component ────────────────────────────────────────────────

interface ScoresHeatmapProps {
  scorers: ScorerBlock[];
}

export function ScoresHeatmap({ scorers }: ScoresHeatmapProps) {
  if (scorers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No scores returned.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {scorers.map((block, idx) => (
        <TissueHeatmap key={idx} block={block} />
      ))}
    </div>
  );
}

// ─── Heatmap per scorer ───────────────────────────────────────

function TissueHeatmap({ block }: { block: ScorerBlock }) {
  const label = parseScorerLabel(block.scorer);
  const hasQuantile = block.quantile_scores != null;

  const normalized = useMemo(() => normalizeBlock(block), [block]);
  const groups = useMemo(
    () => buildTissueGroups(block.tracks),
    [block.tracks],
  );
  const rawCells = useMemo(
    () => computeGroupCells(normalized, groups),
    [normalized, groups],
  );

  const rawLabels = useMemo(
    () =>
      block.rows.length > 0 ? block.rows.map((r) => r.gene_name) : ["Score"],
    [block.rows],
  );

  const { labels, cells } = useMemo(
    () => deduplicateAndSort(rawLabels, rawCells, MAX_ROWS),
    [rawLabels, rawCells],
  );

  // Sort tissue groups by max score, drop empty
  const sortedGroupIndices = useMemo(() => {
    const withMax = groups.map((_, gi) => {
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
  }, [groups, cells]);

  if (labels.length === 0 || sortedGroupIndices.length === 0) return null;

  const nCols = sortedGroupIndices.length;
  const nRows = labels.length;
  const uniqueGenes = new Set(rawLabels).size;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {label}
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {uniqueGenes > 1 ? `${uniqueGenes} genes` : ""}
          {uniqueGenes > 1 ? " · " : ""}
          {block.tracks.length} tracks · {nCols} groups
        </span>
      </div>

      <div className="overflow-x-auto">
        <div
          className="inline-grid"
          style={{
            gridTemplateColumns: `${LABEL_W}px repeat(${nCols}, ${CELL_W}px)`,
            gridTemplateRows: `${HEADER_H}px repeat(${nRows}, ${CELL_H}px)`,
          }}
        >
          {/* Corner */}
          <div />

          {/* Column headers */}
          {sortedGroupIndices.map((gi) => {
            const g = groups[gi];
            return (
              <Tooltip key={`hdr-${gi}`}>
                <TooltipTrigger asChild>
                  <div className="flex items-end justify-center pb-1">
                    <span
                      className="text-[10px] text-muted-foreground whitespace-nowrap"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                      }}
                    >
                      {g.name}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {g.name} ({g.trackIndices.length} tracks)
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Data rows */}
          {labels.map((rowLabel, ri) => (
            <Fragment key={ri}>
              <div
                className="flex items-center pr-3 text-[11px] text-foreground truncate"
                title={rowLabel}
              >
                {rowLabel}
              </div>
              {sortedGroupIndices.map((gi) => {
                const cell = cells[ri]?.[gi];
                const g = groups[gi];
                const color = cellColor(cell?.norm ?? null);
                const hasValue = cell?.norm != null && cell.norm > 0.01;

                return (
                  <Tooltip key={`${ri}-${gi}`}>
                    <TooltipTrigger asChild>
                      <div className="p-[1px]">
                        <div
                          className="w-full h-full rounded-[2px]"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </TooltipTrigger>
                    {hasValue && (
                      <TooltipContent>
                        <HeatmapTooltip
                          gene={rowLabel}
                          group={g}
                          cell={cell!}
                          block={block}
                          hasQuantile={hasQuantile}
                        />
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {uniqueGenes > MAX_ROWS && (
        <p className="text-[11px] text-muted-foreground mt-1">
          Showing top {nRows} of {uniqueGenes} genes
        </p>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-muted-foreground">Impact:</span>
        <div className="flex items-center gap-px">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
            <div
              key={v}
              className="w-5 h-3 rounded-[1px]"
              style={{ backgroundColor: cellColor(v) }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">Low → High</span>
      </div>
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────

function HeatmapTooltip({
  gene,
  group,
  cell,
  block,
  hasQuantile,
}: {
  gene: string;
  group: TissueGroup;
  cell: CellInfo;
  block: ScorerBlock;
  hasQuantile: boolean;
}) {
  const raw =
    cell.trackIdx != null
      ? (block.raw_scores[cell.rowIdx]?.[cell.trackIdx] ?? null)
      : null;
  const quantile =
    cell.trackIdx != null
      ? (block.quantile_scores?.[cell.rowIdx]?.[cell.trackIdx] ?? null)
      : null;
  const trackName =
    cell.trackIdx != null
      ? block.tracks[cell.trackIdx].biosample_name
      : null;

  return (
    <div className="space-y-0.5">
      <p className="font-medium">
        {gene} × {group.name}
      </p>
      {group.trackIndices.length > 1 && (
        <p>{group.trackIndices.length} tracks</p>
      )}
      {trackName && group.trackIndices.length > 1 && (
        <p>Top: {trackName}</p>
      )}
      {hasQuantile && quantile != null && (
        <p>Quantile: {formatQuantile(quantile)}</p>
      )}
      <p>Raw: {raw != null ? formatScore(raw) : "—"}</p>
    </div>
  );
}
