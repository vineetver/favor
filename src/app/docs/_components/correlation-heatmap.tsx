"use client";

import { useMemo, useRef, useCallback, useEffect, useState } from "react";
import type { CorrelationData, CategoryDef } from "../data/_lib/load-correlation-data";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface CorrelationHeatmapProps {
  data: CorrelationData;
  expanded: Set<number>;
  onToggle: (categoryIdx: number) => void;
  compact?: boolean;
}

type Item =
  | { kind: "annotation"; category: number; annotationIdx: number; label: string; displayLabel: string }
  | { kind: "block"; category: number; label: string; count: number };

type Span = { catIdx: number; cat: CategoryDef; start: number; count: number };

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const FONT_CAT = 11;        // category label font size
const FONT_ANN = 10;        // annotation label font size
const CHAR_PX = 6.8;        // px per character at FONT_CAT
const ROT_DEG = 50;          // column label rotation
const SIN_ROT = Math.sin((ROT_DEG * Math.PI) / 180);
const BAR_W = 12;            // legend color bar width
const LEGEND_W = 72;         // total legend column width (bar + labels + padding)
const LEGEND_TITLE_H = 18;   // space above the legend bar for the title

/* ------------------------------------------------------------------ */
/*  Color scale — diverging blue ↔ white ↔ red                        */
/* ------------------------------------------------------------------ */

function corrColor(v: number): string {
  const t = Math.min(Math.abs(v), 1);
  if (v >= 0) return `rgb(255,${255 - Math.round(t * 168)},${255 - Math.round(t * 213)})`;
  return `rgb(${255 - Math.round(t * 222)},${255 - Math.round(t * 153)},${255 - Math.round(t * 83)})`;
}

/* ------------------------------------------------------------------ */
/*  Cell value computation                                              */
/* ------------------------------------------------------------------ */

function cellVal(a: Item, b: Item, d: CorrelationData): number {
  const { matrix, n, categories } = d;
  if (a.kind === "annotation" && b.kind === "annotation")
    return matrix[a.annotationIdx * n + b.annotationIdx];

  const ar = a.kind === "block" ? rangeFor(categories[a.category]) : [a.annotationIdx];
  const br = b.kind === "block" ? rangeFor(categories[b.category]) : [b.annotationIdx];

  if (a.kind === "block" && b.kind === "block" && a.category === b.category) {
    let s = 0, c = 0;
    for (const i of ar) for (const j of br) if (i !== j) { s += matrix[i * n + j]; c++; }
    return c > 0 ? s / c : 1;
  }
  let s = 0, c = 0;
  for (const i of ar) for (const j of br) { s += matrix[i * n + j]; c++; }
  return c > 0 ? s / c : 0;
}

function rangeFor(cat: CategoryDef): number[] {
  return Array.from({ length: cat.count }, (_, i) => cat.startIdx + i);
}

/* ------------------------------------------------------------------ */
/*  Display label for an item                                           */
/* ------------------------------------------------------------------ */

function label(item: Item): string {
  return item.kind === "block" ? `${item.label} (${item.count})` : item.displayLabel;
}

/* ------------------------------------------------------------------ */
/*  Shared data derivation                                              */
/* ------------------------------------------------------------------ */

function useDerived(data: CorrelationData, expanded: Set<number>) {
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let ci = 0; ci < data.categories.length; ci++) {
      const cat = data.categories[ci];
      if (expanded.has(ci)) {
        for (let ai = cat.startIdx; ai < cat.startIdx + cat.count; ai++) {
          const a = data.annotations[ai];
          out.push({ kind: "annotation", category: ci, annotationIdx: ai, label: a.label, displayLabel: a.displayLabel });
        }
      } else {
        out.push({ kind: "block", category: ci, label: cat.label, count: cat.count });
      }
    }
    return out;
  }, [data, expanded]);

  const count = items.length;

  const vals = useMemo(() => {
    const v = new Float32Array(count * count);
    for (let i = 0; i < count; i++) for (let j = i; j < count; j++) {
      const r = cellVal(items[i], items[j], data);
      v[i * count + j] = r;
      v[j * count + i] = r;
    }
    return v;
  }, [items, data, count]);

  const spans = useMemo<Span[]>(() => {
    const out: Span[] = [];
    let pos = 0;
    for (let ci = 0; ci < data.categories.length; ci++) {
      const cat = data.categories[ci];
      const c = expanded.has(ci) ? cat.count : 1;
      out.push({ catIdx: ci, cat, start: pos, count: c });
      pos += c;
    }
    return out;
  }, [data.categories, expanded]);

  return { items, vals, spans, count };
}

/* ------------------------------------------------------------------ */
/*  Layout computation (deterministic, shared)                          */
/* ------------------------------------------------------------------ */

function computeLayout(items: Item[], widthBudget: number, maxCell: number) {
  const n = items.length;
  const maxLen = items.reduce((m, it) => Math.max(m, label(it).length), 0);
  const labelW = Math.ceil(maxLen * CHAR_PX) + 16;
  const matrixBudget = Math.max(200, widthBudget - labelW - LEGEND_W);
  const cell = Math.max(14, Math.min(maxCell, Math.floor(matrixBudget / n)));
  const matrixPx = n * cell;
  const colHeaderH = Math.ceil(maxLen * CHAR_PX * SIN_ROT) + 32;
  return { n, cell, matrixPx, labelW, colHeaderH };
}

/* ================================================================== */
/*  SVG building blocks                                                 */
/* ================================================================== */

/* ── Legend ── */

function SvgLegend({ x, y, h }: { x: number; y: number; h: number }) {
  const barY = y + LEGEND_TITLE_H;
  const steps = 64;
  return (
    <g>
      {/* Title — left-aligned, never overflows left */}
      <text x={x} y={y + 10} textAnchor="start" fontSize={9} fontWeight={600} className="fill-muted-foreground">
        Pearson r
      </text>
      {/* Color bar */}
      {Array.from({ length: steps }, (_, i) => {
        const t = i / (steps - 1);
        return <rect key={i} x={x} y={barY + t * h} width={BAR_W} height={h / steps + 0.5} fill={corrColor(1 - 2 * t)} />;
      })}
      <rect x={x} y={barY} width={BAR_W} height={h} rx={3} fill="none" className="stroke-border" strokeWidth={0.5} />
      {/* Scale labels */}
      {[1, 0.5, 0, -0.5, -1].map((v) => (
        <text key={v} x={x + BAR_W + 5} y={barY + ((1 - v) / 2) * h} dominantBaseline="central" fontSize={9} className="fill-muted-foreground">
          {v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
        </text>
      ))}
    </g>
  );
}

/* ── Grid lines between categories ── */

function SvgGrid({ spans, cell, ox, oy, size }: { spans: Span[]; cell: number; ox: number; oy: number; size: number }) {
  return (
    <>
      {spans.map((sp) => {
        const p = sp.start * cell;
        return (
          <g key={sp.catIdx} opacity={0.06}>
            <line x1={ox} y1={oy + p} x2={ox + size} y2={oy + p} stroke="var(--foreground)" strokeWidth={0.5} />
            <line x1={ox + p} y1={oy} x2={ox + p} y2={oy + size} stroke="var(--foreground)" strokeWidth={0.5} />
          </g>
        );
      })}
    </>
  );
}

/* ── Matrix cells ── */

function SvgCells({ items, vals, n, cell, ox, oy }: {
  items: Item[]; vals: Float32Array; n: number; cell: number; ox: number; oy: number;
}) {
  return (
    <>
      {items.map((ri, i) =>
        items.map((ci, j) => {
          const v = vals[i * n + j];
          const abs = Math.abs(v);
          const cx = ox + j * cell + cell / 2;
          const cy = oy + i * cell + cell / 2;
          const block = ri.kind === "block" || ci.kind === "block";
          if (block) {
            const sz = Math.max(3, abs * (cell - 4));
            return <rect key={`${i}-${j}`} x={cx - sz / 2} y={cy - sz / 2} width={sz} height={sz} rx={Math.min(3, sz / 4)} fill={corrColor(v)} opacity={0.92} />;
          }
          return <circle key={`${i}-${j}`} cx={cx} cy={cy} r={Math.max(0.6, abs * (cell / 2 - 1.5))} fill={corrColor(v)} opacity={0.88} />;
        }),
      )}
    </>
  );
}

/* ── Row / column labels (SVG text) ── */

function SvgRowLabels({ items, data, ox, oy, cell }: {
  items: Item[]; data: CorrelationData; ox: number; oy: number; cell: number;
}) {
  return (
    <>
      {items.map((it, i) => {
        const block = it.kind === "block";
        const color = data.categories[it.category].color;
        return (
          <text key={i} x={ox - 8} y={oy + i * cell + cell / 2}
            textAnchor="end" dominantBaseline="central"
            fontSize={block ? FONT_CAT : FONT_ANN} fontWeight={block ? 700 : 400}
            fill={block ? color : undefined} className={block ? undefined : "fill-muted-foreground"}>
            {label(it)}
          </text>
        );
      })}
    </>
  );
}

function SvgColLabels({ items, data, ox, oy, cell }: {
  items: Item[]; data: CorrelationData; ox: number; oy: number; cell: number;
}) {
  return (
    <>
      {items.map((it, i) => {
        const block = it.kind === "block";
        const color = data.categories[it.category].color;
        return (
          <text key={i} textAnchor="start" dominantBaseline="central"
            fontSize={block ? FONT_CAT : FONT_ANN} fontWeight={block ? 700 : 400}
            fill={block ? color : undefined} className={block ? undefined : "fill-muted-foreground"}
            transform={`translate(${ox + i * cell + cell / 2},${oy - 8}) rotate(-${ROT_DEG})`}>
            {label(it)}
          </text>
        );
      })}
    </>
  );
}

/* ================================================================== */
/*  COMPACT PREVIEW                                                     */
/* ================================================================== */

function CompactPreview({ data, items, vals, spans, count }: {
  data: CorrelationData; items: Item[]; vals: Float32Array; spans: Span[]; count: number;
}) {
  const { cell, matrixPx, labelW, colHeaderH } = computeLayout(items, 720, 32);
  const ox = labelW;
  const oy = colHeaderH;
  const legendX = ox + matrixPx + 16;
  const legendH = Math.min(180, matrixPx);
  const totalW = legendX + LEGEND_W;
  const totalH = oy + matrixPx + 12;

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="block w-full" style={{ maxHeight: 620 }} preserveAspectRatio="xMidYMid meet">
      <SvgRowLabels items={items} data={data} ox={ox} oy={oy} cell={cell} />
      <SvgColLabels items={items} data={data} ox={ox} oy={oy} cell={cell} />
      <SvgGrid spans={spans} cell={cell} ox={ox} oy={oy} size={matrixPx} />
      <SvgCells items={items} vals={vals} n={count} cell={cell} ox={ox} oy={oy} />
      <SvgLegend x={legendX} y={oy} h={legendH} />
    </svg>
  );
}

/* ================================================================== */
/*  INTERACTIVE MATRIX                                                  */
/* ================================================================== */

function InteractiveMatrix({ data, items, vals, spans, count, onToggle }: {
  data: CorrelationData; items: Item[]; vals: Float32Array; spans: Span[]; count: number;
  onToggle: (idx: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const chRow = useRef<SVGRectElement>(null);
  const chCol = useRef<SVGRectElement>(null);
  const prev = useRef("");
  const itemsR = useRef(items);
  const valsR = useRef(vals);
  itemsR.current = items;
  valsR.current = vals;

  /* ── Measure available width ── */
  const [availW, setAvailW] = useState(900);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => setAvailW(e[0]?.contentRect.width ?? 900));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { cell, matrixPx, labelW, colHeaderH } = computeLayout(items, availW, 56);
  const legendColW = 72;

  /* ── Clear hover ── */
  const clear = useCallback(() => {
    prev.current = "";
    if (chRow.current) { chRow.current.style.display = "none"; }
    if (chCol.current) { chCol.current.style.display = "none"; }
    if (tipRef.current) { tipRef.current.style.display = "none"; }
    // Reset row labels
    wrapRef.current?.querySelectorAll<HTMLElement>("[data-rl]").forEach((el) => {
      el.style.fontWeight = "";
      el.style.opacity = "";
      el.style.transform = "";
    });
    // Reset column labels
    wrapRef.current?.querySelectorAll<SVGTextElement>("[data-cl]").forEach((el) => {
      el.setAttribute("font-weight", el.dataset.bw ?? "400");
      el.setAttribute("opacity", "1");
    });
  }, []);

  useEffect(clear, [items, clear]);

  /* ── Coordinate helper ── */
  const cellFromEvent = useCallback((e: React.MouseEvent<SVGSVGElement>): { row: number; col: number } | null => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top - colHeaderH;
    if (x < 0 || y < 0 || x >= matrixPx || y >= matrixPx) return null;
    const col = Math.floor(x / cell);
    const row = Math.floor(y / cell);
    if (row < 0 || row >= count || col < 0 || col >= count) return null;
    return { row, col };
  }, [cell, colHeaderH, matrixPx, count]);

  /* ── Hover (zero re-renders) ── */
  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const pos = cellFromEvent(e);
    if (!pos) { clear(); return; }
    const { row, col } = pos;
    const key = `${row},${col}`;
    if (key === prev.current) return;
    prev.current = key;

    // Crosshair — set attributes individually (NOT style for SVG geometry)
    if (chRow.current) {
      chRow.current.style.display = "";
      chRow.current.setAttribute("y", String(colHeaderH + row * cell));
      chRow.current.setAttribute("height", String(cell));
      chRow.current.setAttribute("width", String(matrixPx));
    }
    if (chCol.current) {
      chCol.current.style.display = "";
      chCol.current.setAttribute("x", String(col * cell));
      chCol.current.setAttribute("width", String(cell));
      chCol.current.setAttribute("height", String(matrixPx));
    }

    // Tooltip
    const tip = tipRef.current;
    const wrap = wrapRef.current;
    if (tip && wrap) {
      const ci = itemsR.current;
      const v = valsR.current[row * count + col];
      const aL = ci[row].kind === "annotation" ? ci[row].displayLabel : ci[row].label;
      const bL = ci[col].kind === "annotation" ? ci[col].displayLabel : ci[col].label;
      const agg = ci[row].kind === "block" || ci[col].kind === "block";
      tip.textContent = `${aL} \u00d7 ${bL}:  r = ${v >= 0 ? "+" : ""}${v.toFixed(3)}${agg ? "  (mean)" : ""}`;

      // Position near cursor, clamped to wrapper
      const wr = wrap.getBoundingClientRect();
      let tx = e.clientX - wr.left + 16;
      let ty = e.clientY - wr.top - 36;
      // Clamp right edge
      const tipW = tip.offsetWidth || 200;
      if (tx + tipW > wr.width - 8) tx = wr.width - tipW - 8;
      if (tx < 0) tx = 0;
      if (ty < 0) ty = e.clientY - wr.top + 20;
      tip.style.display = "";
      tip.style.left = `${tx}px`;
      tip.style.top = `${ty}px`;
    }

    // Left labels: highlight ROW only, dim the rest
    wrap?.querySelectorAll<HTMLElement>("[data-rl]").forEach((el) => {
      const idx = Number(el.dataset.rl);
      if (idx === row) {
        el.style.fontWeight = "700";
        el.style.opacity = "1";
        el.style.transform = "scale(1.04)";
      } else {
        el.style.fontWeight = "";
        el.style.opacity = "0.35";
        el.style.transform = "";
      }
    });
    // Top labels: highlight COL only, dim the rest
    wrap?.querySelectorAll<SVGTextElement>("[data-cl]").forEach((el) => {
      const idx = Number(el.dataset.cl);
      if (idx === col) {
        el.setAttribute("font-weight", "700");
        el.setAttribute("opacity", "1");
      } else {
        el.setAttribute("font-weight", el.dataset.bw ?? "400");
        el.setAttribute("opacity", "0.35");
      }
    });
  }, [cellFromEvent, cell, colHeaderH, matrixPx, count, clear]);

  /* ── Click to expand ── */
  const onClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const pos = cellFromEvent(e);
    if (!pos) return;
    const ci = itemsR.current;
    const seen = new Set<number>();
    for (const idx of [pos.row, pos.col]) {
      const it = ci[idx];
      if (it.kind === "block" && !seen.has(it.category)) {
        seen.add(it.category);
        onToggle(it.category);
      }
    }
  }, [cellFromEvent, onToggle]);

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* Tooltip — shadcn Tooltip visual language */}
      <div ref={tipRef}
        className="absolute z-50 pointer-events-none rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-1.5 text-xs font-medium whitespace-nowrap"
        style={{ display: "none" }}
      />

      <div className="flex items-start">
        {/* LEFT — Row labels (HTML, never scrolls) */}
        <div className="shrink-0 select-none" style={{ width: labelW, paddingTop: colHeaderH }}>
          {items.map((it, i) => {
            const block = it.kind === "block";
            const color = data.categories[it.category].color;
            return (
              <div key={i} data-rl={i} className="flex items-center justify-end pr-2 origin-right" style={{ height: cell, transition: "opacity 0.15s, transform 0.15s, font-weight 0.1s" }}>
                {block ? (
                  <button type="button" onClick={() => onToggle(it.category)}
                    className="text-right cursor-pointer hover:underline transition-colors truncate"
                    style={{ fontSize: FONT_CAT, fontWeight: 700, color, lineHeight: 1.2, maxWidth: labelW - 12 }}>
                    {it.label} ({it.count})
                  </button>
                ) : (
                  <span className="text-right text-muted-foreground truncate"
                    style={{ fontSize: FONT_ANN, lineHeight: 1.2, maxWidth: labelW - 12 }} title={it.label}>
                    {it.displayLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* CENTER — Scrollable SVG */}
        <div className="min-w-0 overflow-x-auto" style={{ flex: "1 1 0%" }}>
          <svg width={matrixPx} height={colHeaderH + matrixPx}
            className="block select-none" style={{ minWidth: matrixPx, cursor: "crosshair" }}
            onMouseMove={onMove} onMouseLeave={clear} onClick={onClick}>

            {/* Column labels */}
            {items.map((it, i) => {
              const block = it.kind === "block";
              const color = data.categories[it.category].color;
              const bw = block ? 700 : 400;
              return (
                <text key={i} data-cl={i} data-bw={bw}
                  textAnchor="start" dominantBaseline="central"
                  fontSize={block ? FONT_CAT : FONT_ANN} fontWeight={bw}
                  fill={block ? color : undefined}
                  className={block ? undefined : "fill-muted-foreground"}
                  style={{ transition: "opacity 0.15s", ...(block ? { cursor: "pointer" } : {}) }}
                  transform={`translate(${i * cell + cell / 2},${colHeaderH - 8}) rotate(-${ROT_DEG})`}
                  onClick={block ? (ev) => { ev.stopPropagation(); onToggle(it.category); } : undefined}>
                  {label(it)}
                </text>
              );
            })}

            <SvgGrid spans={spans} cell={cell} ox={0} oy={colHeaderH} size={matrixPx} />

            {/* Crosshair rects — geometry via setAttribute, visibility via style.display */}
            <rect ref={chRow} x={0} y={0} width={0} height={0} fill="var(--foreground)" opacity={0.05} pointerEvents="none" style={{ display: "none" }} />
            <rect ref={chCol} x={0} y={colHeaderH} width={0} height={0} fill="var(--foreground)" opacity={0.05} pointerEvents="none" style={{ display: "none" }} />

            <SvgCells items={items} vals={vals} n={count} cell={cell} ox={0} oy={colHeaderH} />
          </svg>
        </div>

        {/* RIGHT — Legend (HTML wrapper, SVG inside) */}
        <div className="shrink-0 pl-4 select-none" style={{ paddingTop: colHeaderH, width: legendColW }}>
          <svg width={LEGEND_W} height={Math.min(260, matrixPx) + LEGEND_TITLE_H + 8} className="block overflow-visible">
            <SvgLegend x={0} y={0} h={Math.min(220, matrixPx)} />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Exported component                                                  */
/* ================================================================== */

export function CorrelationHeatmap({ data, expanded, onToggle, compact }: CorrelationHeatmapProps) {
  const { items, vals, spans, count } = useDerived(data, expanded);
  if (compact) return <CompactPreview data={data} items={items} vals={vals} spans={spans} count={count} />;
  return <InteractiveMatrix data={data} items={items} vals={vals} spans={spans} count={count} onToggle={onToggle} />;
}
