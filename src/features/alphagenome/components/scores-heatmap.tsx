"use client";

import { useMemo, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@infra/utils";
import type { ScorerBlock } from "../types";
import { formatQuantile, formatScore, parseScorerLabel, quantileColor } from "../utils";

interface ScoresHeatmapProps {
  scorers: ScorerBlock[];
}

const MAX_VISIBLE_TRACKS = 30;

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
        <ScorerHeatmapBlock key={idx} block={block} />
      ))}
    </div>
  );
}

// ─── One scorer block ──────────────────────────────────────────

function ScorerHeatmapBlock({ block }: { block: ScorerBlock }) {
  const label = parseScorerLabel(block.scorer);
  const [showAll, setShowAll] = useState(false);

  // Use quantile_scores if available, fall back to raw_scores
  const scores = block.quantile_scores ?? block.raw_scores;
  const useQuantile = block.quantile_scores != null;

  // Sort tracks by max score across all rows (most impactful first)
  const sortedTrackIndices = useMemo(() => {
    if (!scores) return block.tracks.map((_, j) => j);
    const indices = block.tracks.map((_, j) => j);
    indices.sort((a, b) => {
      const val = (j: number) =>
        Math.max(...scores.map((row) => {
          const v = row?.[j];
          return v != null && !isNaN(v) ? Math.abs(v) : 0;
        }));
      return val(b) - val(a);
    });
    return indices;
  }, [block, scores]);

  const visibleCount = showAll
    ? sortedTrackIndices.length
    : Math.min(sortedTrackIndices.length, MAX_VISIBLE_TRACKS);
  const visibleIndices = sortedTrackIndices.slice(0, visibleCount);
  const hasMore = sortedTrackIndices.length > MAX_VISIBLE_TRACKS;

  if (block.rows.length === 0 || block.tracks.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {label}
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {block.rows.length} {block.rows.length === 1 ? "gene" : "genes"} &times;{" "}
          {block.tracks.length} tracks
        </span>
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="overflow-x-auto">
          <table className="text-[11px] border-collapse">
            <thead>
              <tr>
                {/* Row header (gene) */}
                <th className="sticky left-0 bg-background z-10 text-left pr-3 py-1 text-muted-foreground font-medium whitespace-nowrap">
                  Gene
                </th>
                {visibleIndices.map((j) => (
                  <Tooltip key={j}>
                    <TooltipTrigger asChild>
                      <th className="px-0.5 py-1 text-muted-foreground font-normal cursor-help">
                        <div className="w-5 h-12 flex items-end justify-center">
                          <span className="block origin-bottom-left rotate-[-55deg] whitespace-nowrap translate-x-2">
                            {block.tracks[j].biosample_name}
                          </span>
                        </div>
                      </th>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-56">
                      <p className="font-medium">{block.tracks[j].biosample_name}</p>
                      {block.tracks[j].data_source && (
                        <p className="text-muted-foreground">
                          {block.tracks[j].data_source}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={row.gene_id}>
                  {/* Gene label */}
                  <td className="sticky left-0 bg-background z-10 pr-3 py-0.5 text-foreground font-medium whitespace-nowrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">
                          {row.gene_name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="font-medium">{row.gene_name}</p>
                        <p className="text-muted-foreground">{row.gene_id}</p>
                        {row.gene_type && (
                          <p className="text-muted-foreground">{row.gene_type}</p>
                        )}
                        {row.strand && (
                          <p className="text-muted-foreground">Strand: {row.strand}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </td>

                  {/* Score cells */}
                  {visibleIndices.map((j) => {
                    const cellScore = scores?.[i]?.[j];
                    const raw = block.raw_scores?.[i]?.[j];
                    const isValid = cellScore != null && !isNaN(cellScore);

                    return (
                      <Tooltip key={j}>
                        <TooltipTrigger asChild>
                          <td className="px-0.5 py-0.5">
                            <div
                              className={cn(
                                "w-5 h-4 rounded-[2px]",
                                !isValid && "bg-muted/30",
                              )}
                              style={
                                isValid
                                  ? { backgroundColor: quantileColor(useQuantile ? cellScore : Math.min(Math.abs(cellScore) * 5, 1)) }
                                  : undefined
                              }
                            />
                          </td>
                        </TooltipTrigger>
                        {isValid && (
                          <TooltipContent side="top" className="max-w-56">
                            <p className="font-medium">
                              {row.gene_name} &times; {block.tracks[j].biosample_name}
                            </p>
                            {useQuantile && (
                              <p className="text-muted-foreground">
                                Quantile: {formatQuantile(cellScore)}
                              </p>
                            )}
                            <p className="text-muted-foreground">
                              Raw: {formatScore(raw ?? cellScore)}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TooltipProvider>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2">
        <span className="text-[10px] text-muted-foreground">Effect:</span>
        <div className="flex items-center gap-0.5">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((q) => (
            <div
              key={q}
              className="w-4 h-3 rounded-[2px]"
              style={{ backgroundColor: quantileColor(q) }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">Low → High</span>
      </div>

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-primary hover:underline mt-1"
        >
          Show all {sortedTrackIndices.length} tracks
        </button>
      )}
    </div>
  );
}
