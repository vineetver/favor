"use client";

/**
 * Manhattan plot — genome-wide scatter with chromosome grouping.
 * Supports marker shape + color encoding.
 */

import { useMemo } from "react";
import { Plot } from "./plotly-chart";
import { PLOTLY_CONFIG, PLOTLY_FONT, PLOTLY_AXIS } from "./theme";

export interface ManhattanPoint {
  chrom: number;
  position: number;
  value: number;
  color: string;
  symbol: string;
  group: string;
  hoverText?: string;
  significant?: boolean;
}

interface ManhattanPlotProps {
  data: ManhattanPoint[];
  title?: string;
  yLabel?: string;
  threshold?: number;
  className?: string;
}

export function ManhattanPlot({ data, title, yLabel = "−log₁₀(p-value)", threshold, className }: ManhattanPlotProps) {
  const { traces, tickVals, tickText, maxX } = useMemo(() => {
    const chroms = [...new Set(data.map((d) => d.chrom))].sort((a, b) => a - b);
    const chromRanges: Record<number, [number, number]> = {};
    for (const c of chroms) {
      const pts = data.filter((d) => d.chrom === c);
      chromRanges[c] = [Math.min(...pts.map((p) => p.position)), Math.max(...pts.map((p) => p.position))];
    }

    let cum = 0;
    const offsets: Record<number, number> = {};
    const tV: number[] = [], tT: string[] = [];
    for (const c of chroms) {
      offsets[c] = cum;
      const span = chromRanges[c][1] - chromRanges[c][0] + 1;
      tV.push(cum + span / 2);
      tT.push(c <= 22 ? String(c) : c === 23 ? "X" : "Y");
      cum += span + 5e7;
    }

    // Split into separate traces by group AND significance so each gets its own marker config
    const hasSig = data.some((pt) => pt.significant);
    type TraceData = { x: number[]; y: number[]; text: string[]; color: string; symbol: string; name: string; sig: boolean };
    const groups = new Map<string, TraceData>();
    for (const pt of data) {
      const isSig = !!pt.significant;
      // Non-significant go into one trace per group, significant into another
      const key = hasSig ? `${pt.group}|${pt.color}|${pt.symbol}|${isSig}` : `${pt.group}|${pt.color}|${pt.symbol}`;
      if (!groups.has(key)) groups.set(key, { x: [], y: [], text: [], color: pt.color, symbol: pt.symbol, name: pt.group, sig: isSig });
      const g = groups.get(key)!;
      g.x.push(offsets[pt.chrom] + pt.position - chromRanges[pt.chrom][0]);
      g.y.push(pt.value);
      g.text.push(pt.hoverText ?? `chr${pt.chrom}:${pt.position.toLocaleString()}`);
    }

    // Sort: non-significant first (behind), significant on top
    const sorted = [...groups.values()].sort((a, b) => (a.sig ? 1 : 0) - (b.sig ? 1 : 0));

    return {
      traces: sorted.map((g) => ({
        type: "scatter" as const, mode: "markers" as const,
        x: g.x, y: g.y, text: g.text,
        name: hasSig ? (g.sig ? `${g.name} (sig.)` : g.name) : g.name,
        marker: {
          color: g.color, symbol: g.symbol,
          size: g.sig ? 12 : 4,
          opacity: g.sig ? 1.0 : 0.3,
          line: g.sig ? { color: "#171717", width: 1.5 } : undefined,
        },
        showlegend: !hasSig || !g.sig, // hide duplicate sig legend entries
        hovertemplate: "%{text}<br>%{y:.2f}<extra></extra>",
        hoverlabel: { namelength: -1 },
      })),
      tickVals: tV, tickText: tT, maxX: cum,
    };
  }, [data]);

  return (
    <div className={className}>
      <Plot
        data={traces}
        layout={{
          font: PLOTLY_FONT,
          paper_bgcolor: "transparent", plot_bgcolor: "transparent",
          title: title ? { text: `<b>${title}</b>`, font: { size: 14 } } : undefined,
          height: 480,
          margin: { l: 55, r: 20, t: title ? 50 : 20, b: 45 },
          showlegend: true,
          legend: { orientation: "h" as const, y: 1.12, font: { size: 11 }, itemsizing: "constant" as const },
          xaxis: { ...PLOTLY_AXIS, tickvals: tickVals, ticktext: tickText, showgrid: false },
          yaxis: { ...PLOTLY_AXIS, title: { text: yLabel, font: { size: 11 } }, rangemode: "tozero" },
          shapes: threshold != null ? [{
            type: "line" as const, x0: 0, x1: maxX, y0: threshold, y1: threshold,
            line: { color: "#3b82f6", width: 2 },
          }] : [],
        }}
        config={PLOTLY_CONFIG}
        style={{ width: "100%" }}
      />
    </div>
  );
}
