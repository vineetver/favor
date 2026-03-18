"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ScorerBlock } from "../types";
import { formatScore, parseScorerLabel } from "../utils";

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
        <ScorerCanvas key={idx} block={block} />
      ))}
    </div>
  );
}

// ─── Constants ─────────────────────────────────────────────────

const CELL_W = 5;
const CELL_H = 14;
const LABEL_W = 100; // left margin for gene labels
const HEADER_H = 60; // top margin for track labels

// ─── Per-block normalization ───────────────────────────────────

function normalizeBlock(block: ScorerBlock): {
  matrix: (number | null)[][];
  hasQuantile: boolean;
} {
  if (block.quantile_scores) {
    return { matrix: block.quantile_scores, hasQuantile: true };
  }

  // Normalize raw_scores to 0-1 per block using max absolute value
  const flat = block.raw_scores.flat().filter((v): v is number => v != null && !isNaN(v));
  if (flat.length === 0) return { matrix: block.raw_scores, hasQuantile: false };

  const maxAbs = Math.max(...flat.map(Math.abs));
  if (maxAbs === 0) return { matrix: block.raw_scores, hasQuantile: false };

  const normalized = block.raw_scores.map((row) =>
    row.map((v) => {
      if (v == null || isNaN(v)) return null;
      return Math.abs(v) / maxAbs;
    }),
  );
  return { matrix: normalized, hasQuantile: false };
}

/** Map 0-1 value to heatmap color (violet sequential). */
function toColor(v: number | null): string {
  if (v == null) return "#f5f5f5";
  const clamped = Math.max(0, Math.min(1, v));
  // Low: light gray → High: deep violet
  const r = Math.round(245 - clamped * 121); // 245 → 124
  const g = Math.round(245 - clamped * 187); // 245 → 58
  const b = Math.round(245 - clamped * 8);   // 245 → 237
  return `rgb(${r},${g},${b})`;
}

// ─── Canvas heatmap per scorer ─────────────────────────────────

function ScorerCanvas({ block }: { block: ScorerBlock }) {
  const label = parseScorerLabel(block.scorer);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    gene: string;
    track: string;
    raw: number | null;
    quantile: number | null;
  } | null>(null);

  const nRows = block.raw_scores.length;
  const nCols = block.tracks.length;

  // Gene labels: use gene_name if rows exist, else "Score"
  const rowLabels = useMemo(
    () => (block.rows.length > 0 ? block.rows.map((r) => r.gene_name) : ["Score"]),
    [block.rows],
  );

  const { matrix } = useMemo(() => normalizeBlock(block), [block]);

  const canvasW = LABEL_W + nCols * CELL_W;
  const canvasH = HEADER_H + nRows * CELL_H;

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Row labels
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "#374151";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i < nRows; i++) {
      const label = rowLabels[i];
      const truncated = label.length > 14 ? label.slice(0, 13) + "…" : label;
      ctx.fillText(truncated, LABEL_W - 4, HEADER_H + i * CELL_H + CELL_H / 2);
    }

    // Cells
    for (let i = 0; i < nRows; i++) {
      for (let j = 0; j < nCols; j++) {
        const v = matrix[i]?.[j] ?? null;
        ctx.fillStyle = toColor(v);
        ctx.fillRect(LABEL_W + j * CELL_W, HEADER_H + i * CELL_H, CELL_W - 0.5, CELL_H - 0.5);
      }
    }
  }, [matrix, nRows, nCols, canvasW, canvasH, rowLabels]);

  // Hover
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.floor((x - LABEL_W) / CELL_W);
      const row = Math.floor((y - HEADER_H) / CELL_H);

      if (col < 0 || col >= nCols || row < 0 || row >= nRows) {
        setTooltip(null);
        return;
      }

      const containerRect = containerRef.current!.getBoundingClientRect();
      setTooltip({
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top - 60,
        gene: rowLabels[row],
        track: block.tracks[col].biosample_name,
        raw: block.raw_scores[row]?.[col] ?? null,
        quantile: block.quantile_scores?.[row]?.[col] ?? null,
      });
    },
    [nRows, nCols, rowLabels, block],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (nRows === 0 || nCols === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {label}
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {nRows} {nRows === 1 ? "row" : "rows"} &times; {nCols} tracks
        </span>
      </div>

      <div ref={containerRef} className="relative overflow-x-auto">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="block"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Single floating tooltip */}
        {tooltip && (
          <div
            className="absolute z-50 pointer-events-none rounded-md border border-border bg-card px-2.5 py-1.5 shadow-md text-xs"
            style={{ left: tooltip.x, top: tooltip.y, transform: "translateX(-50%)" }}
          >
            <p className="font-medium text-foreground">
              {tooltip.gene} &times; {tooltip.track}
            </p>
            <p className="text-muted-foreground">
              Raw: {tooltip.raw != null ? formatScore(tooltip.raw) : "—"}
            </p>
            {tooltip.quantile != null && (
              <p className="text-muted-foreground">
                Quantile: {(tooltip.quantile * 100).toFixed(0)}%
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-muted-foreground">Effect:</span>
        <div className="flex items-center gap-px">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
            <div
              key={v}
              className="w-4 h-3 rounded-[1px]"
              style={{ backgroundColor: toColor(v) }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">Low → High</span>
      </div>
    </div>
  );
}
