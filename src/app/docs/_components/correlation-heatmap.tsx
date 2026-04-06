"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AnnotationGroup {
  name: string;
  color: string;
  annotations: string[];
}

export interface CorrelationHeatmapProps {
  groups: AnnotationGroup[];
  /** Symmetric n x n matrix (row-major). n = sum of all group annotation counts. */
  matrix: number[][];
}

/* ------------------------------------------------------------------ */
/*  Color scale — diverging blue ↔ white ↔ red                        */
/* ------------------------------------------------------------------ */

function correlationColor(v: number): string {
  const t = Math.min(Math.abs(v), 1);
  if (v >= 0) {
    // white → red
    const r = 255;
    const g = Math.round(255 - t * 168); // 255 → 87
    const b = Math.round(255 - t * 213); // 255 → 42
    return `rgb(${r},${g},${b})`;
  }
  // white → blue
  const r = Math.round(255 - t * 222); // 255 → 33
  const g = Math.round(255 - t * 153); // 255 → 102
  const b = Math.round(255 - t * 83); // 255 → 172
  return `rgb(${r},${g},${b})`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CorrelationHeatmap({ groups, matrix }: CorrelationHeatmapProps) {
  const [hovered, setHovered] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const annotations = useMemo(
    () => groups.flatMap((g) => g.annotations),
    [groups],
  );
  const n = annotations.length;

  /* layout */
  const cell = 13;
  const labelW = 160;
  const catW = 20;
  const legendW = 56;
  const gap = 8;
  const matrixPx = n * cell;

  const margin = {
    top: labelW,
    right: legendW + gap + 12,
    bottom: 12,
    left: catW + gap + labelW,
  };
  const width = margin.left + matrixPx + margin.right;
  const height = margin.top + matrixPx + margin.bottom;

  /* category spans (for bracket labels) */
  const spans = useMemo(() => {
    let offset = 0;
    return groups.map((g) => {
      const s = { ...g, start: offset, count: g.annotations.length };
      offset += g.annotations.length;
      return s;
    });
  }, [groups]);

  /* fast annotation → group color lookup */
  const groupColorOf = useMemo(() => {
    const map: string[] = [];
    for (const g of groups) for (const _ of g.annotations) map.push(g.color);
    return map;
  }, [groups]);

  const onEnter = useCallback(
    (row: number, col: number) => setHovered({ row, col }),
    [],
  );
  const onLeave = useCallback(() => setHovered(null), []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="overflow-x-auto -mx-4 px-4 pb-4"
    >
      <svg
        width={width}
        height={height}
        className="block select-none"
        style={{ minWidth: width }}
      >
        {/* ── Category bracket labels (left side) ── */}
        {spans.map((sp) => {
          const y0 = margin.top + sp.start * cell;
          const h = sp.count * cell;
          return (
            <g key={sp.name}>
              {/* tinted background strip */}
              <rect
                x={0}
                y={y0}
                width={catW}
                height={h}
                rx={3}
                fill={sp.color}
                opacity={0.12}
              />
              {/* vertical label */}
              <text
                x={catW / 2}
                y={y0 + h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9}
                fontWeight={600}
                fill={sp.color}
                transform={`rotate(-90, ${catW / 2}, ${y0 + h / 2})`}
              >
                {sp.name.length > 18
                  ? sp.name.slice(0, 16) + "\u2026"
                  : sp.name}
              </text>
            </g>
          );
        })}

        {/* ── Row labels ── */}
        {annotations.map((label, i) => (
          <text
            key={`r-${i}`}
            x={margin.left - 4}
            y={margin.top + i * cell + cell / 2}
            textAnchor="end"
            dominantBaseline="central"
            fontSize={8.5}
            className="fill-muted-foreground"
            fontWeight={hovered?.row === i || hovered?.col === i ? 600 : 400}
          >
            {label}
          </text>
        ))}

        {/* ── Column labels (rotated) ── */}
        {annotations.map((label, i) => (
          <text
            key={`c-${i}`}
            x={0}
            y={0}
            textAnchor="start"
            dominantBaseline="central"
            fontSize={8.5}
            className="fill-muted-foreground"
            fontWeight={hovered?.row === i || hovered?.col === i ? 600 : 400}
            transform={`translate(${margin.left + i * cell + cell / 2}, ${margin.top - 4}) rotate(-65)`}
          >
            {label}
          </text>
        ))}

        {/* ── Crosshair guides on hover ── */}
        {hovered && (
          <g opacity={0.07}>
            <rect
              x={margin.left}
              y={margin.top + hovered.row * cell}
              width={matrixPx}
              height={cell}
              fill="var(--foreground)"
            />
            <rect
              x={margin.left + hovered.col * cell}
              y={margin.top}
              width={cell}
              height={matrixPx}
              fill="var(--foreground)"
            />
          </g>
        )}

        {/* ── Matrix circles ── */}
        {matrix.map((row, i) =>
          row.map((v, j) => {
            if (v == null) return null;
            const abs = Math.abs(v);
            const maxR = cell / 2 - 1;
            const r = Math.max(0.8, abs * maxR);
            const cx = margin.left + j * cell + cell / 2;
            const cy = margin.top + i * cell + cell / 2;
            const isHov =
              hovered?.row === i && hovered?.col === j;
            return (
              <circle
                key={`${i}-${j}`}
                cx={cx}
                cy={cy}
                r={isHov ? r + 1.2 : r}
                fill={correlationColor(v)}
                stroke={isHov ? "var(--foreground)" : "none"}
                strokeWidth={1.5}
                opacity={0.88}
                className="cursor-crosshair"
                onMouseEnter={() => onEnter(i, j)}
                onMouseLeave={onLeave}
              />
            );
          }),
        )}

        {/* ── Tooltip ── */}
        {hovered && (() => {
          const { row, col } = hovered;
          const v = matrix[row]?.[col];
          if (v == null) return null;
          const label = `${annotations[row]}  \u00d7  ${annotations[col]}`;
          const val = `r = ${v >= 0 ? "+" : ""}${v.toFixed(3)}`;
          const fullText = `${label}:  ${val}`;
          const charW = 5.2;
          const tw = Math.min(fullText.length * charW + 20, 420);
          const rawX = margin.left + col * cell + cell / 2;
          const rawY = margin.top + row * cell - 10;
          // clamp horizontally
          const tx = Math.max(tw / 2 + 4, Math.min(rawX, width - tw / 2 - 4));
          const ty = rawY < margin.top + 24 ? margin.top + row * cell + cell + 10 : rawY;

          return (
            <g pointerEvents="none">
              <rect
                x={tx - tw / 2}
                y={ty - 20}
                width={tw}
                height={26}
                rx={5}
                className="fill-foreground"
                opacity={0.92}
              />
              <text
                x={tx}
                y={ty - 7}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={500}
                className="fill-background"
              >
                {fullText}
              </text>
            </g>
          );
        })()}

        {/* ── Color legend ── */}
        {(() => {
          const lx = margin.left + matrixPx + gap + 4;
          const ly = margin.top;
          const lh = Math.min(220, matrixPx);
          const lw = 12;
          const steps = 120;
          return (
            <g>
              <text
                x={lx + lw / 2}
                y={ly - 8}
                textAnchor="middle"
                fontSize={8}
                className="fill-muted-foreground"
                fontWeight={600}
              >
                Pearson r
              </text>
              {Array.from({ length: steps }, (_, i) => {
                const t = i / (steps - 1);
                const v = 1 - 2 * t;
                return (
                  <rect
                    key={i}
                    x={lx}
                    y={ly + t * lh}
                    width={lw}
                    height={lh / steps + 0.5}
                    fill={correlationColor(v)}
                  />
                );
              })}
              <rect
                x={lx}
                y={ly}
                width={lw}
                height={lh}
                rx={2}
                fill="none"
                className="stroke-border"
                strokeWidth={0.5}
              />
              {[1, 0.5, 0, -0.5, -1].map((v) => (
                <text
                  key={v}
                  x={lx + lw + 5}
                  y={ly + ((1 - v) / 2) * lh}
                  dominantBaseline="central"
                  fontSize={9}
                  className="fill-muted-foreground"
                >
                  {v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
                </text>
              ))}
            </g>
          );
        })()}
      </svg>
    </motion.div>
  );
}
