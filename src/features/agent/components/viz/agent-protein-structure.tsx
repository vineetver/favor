"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { ProteinStructureVizSpec } from "../../viz/types";

// ---------------------------------------------------------------------------
// Domain architecture map (SVG)
// ---------------------------------------------------------------------------

const TRACK_HEIGHT = 28;
const TICK_HEIGHT = 6;
const PADDING_X = 40;
const AXIS_GAP = 4; // gap between track bottom and tick top

/** Pick a "nice" tick step so we get roughly 5–10 ticks. */
function niceTickStep(length: number): number {
  const rough = length / 8;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / mag;
  if (normalized <= 1) return mag;
  if (normalized <= 2) return 2 * mag;
  if (normalized <= 5) return 5 * mag;
  return 10 * mag;
}

const DomainMap = memo(function DomainMap({
  domains,
  proteinLength,
}: {
  domains: ProteinStructureVizSpec["domains"];
  proteinLength: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const trackWidth = width - PADDING_X * 2;
  const scale = trackWidth > 0 ? trackWidth / proteinLength : 0;
  const trackBottom = 6 + TRACK_HEIGHT;
  const tickTop = trackBottom + AXIS_GAP;
  const labelY = tickTop + TICK_HEIGHT + 10;
  const svgHeight = labelY + 4;

  // Build tick positions
  const ticks = useMemo(() => {
    const step = niceTickStep(proteinLength);
    const result: number[] = [1];
    let pos = step;
    while (pos < proteinLength) {
      result.push(pos);
      pos += step;
    }
    result.push(proteinLength);
    return result;
  }, [proteinLength]);

  // Deduplicate legend by name (not id — different InterPro IDs can share a name)
  const legendItems = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of domains) {
      if (!seen.has(d.name)) seen.set(d.name, d.color);
    }
    return [...seen.entries()].map(([name, color]) => ({ name, color }));
  }, [domains]);

  // Domain coverage %
  const coverage = useMemo(() => {
    if (!domains.length || !proteinLength) return 0;
    // Merge overlapping ranges then sum
    const sorted = [...domains].sort((a, b) => a.start - b.start);
    let covered = 0;
    let curStart = sorted[0].start;
    let curEnd = sorted[0].end;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start <= curEnd + 1) {
        curEnd = Math.max(curEnd, sorted[i].end);
      } else {
        covered += curEnd - curStart + 1;
        curStart = sorted[i].start;
        curEnd = sorted[i].end;
      }
    }
    covered += curEnd - curStart + 1;
    return Math.round((covered / proteinLength) * 100);
  }, [domains, proteinLength]);

  return (
    <div ref={containerRef} className="w-full">
      {width > 0 && (
        <>
          {/* Header */}
          <div className="flex items-baseline justify-between px-1 mb-1">
            <p className="text-[10px] font-medium text-muted-foreground">
              Domain architecture
            </p>
            <p className="text-[10px] text-muted-foreground">
              {proteinLength} aa &middot; {coverage}% annotated
            </p>
          </div>

          <svg
            width={width}
            height={svgHeight}
            className="block"
            aria-label="Protein domain architecture"
          >
            {/* Background track */}
            <rect
              x={PADDING_X}
              y={6}
              width={trackWidth}
              height={TRACK_HEIGHT}
              rx={4}
              fill="currentColor"
              className="text-muted"
            />

            {/* Domain blocks */}
            {domains.map((d, i) => {
              const x = PADDING_X + (d.start - 1) * scale;
              const w = Math.max((d.end - d.start + 1) * scale, 2);
              return (
                <Tooltip key={`${d.id}-${d.start}-${i}`}>
                  <TooltipTrigger asChild>
                    <rect
                      x={x}
                      y={6}
                      width={w}
                      height={TRACK_HEIGHT}
                      rx={3}
                      fill={d.color}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="space-y-0.5">
                      <p className="font-medium">{d.name}</p>
                      <p>
                        Residues {d.start}–{d.end}
                      </p>
                      {d.meanPlddt != null && (
                        <p>pLDDT: {d.meanPlddt.toFixed(1)}</p>
                      )}
                      {d.type && <p>Type: {d.type}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Tick marks + labels */}
            {ticks.map((pos) => {
              const x = PADDING_X + (pos - 1) * scale;
              const isEnd = pos === 1 || pos === proteinLength;
              return (
                <g key={pos}>
                  <line
                    x1={x}
                    y1={tickTop}
                    x2={x}
                    y2={tickTop + TICK_HEIGHT}
                    stroke="currentColor"
                    strokeWidth={1}
                    className="text-muted-foreground/40"
                  />
                  <text
                    x={x}
                    y={labelY}
                    textAnchor={
                      pos === 1 ? "start" : pos === proteinLength ? "end" : "middle"
                    }
                    className={`fill-muted-foreground ${isEnd ? "text-[10px] font-medium" : "text-[9px]"}`}
                  >
                    {pos}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend — deduplicated by name */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 px-1">
            {legendItems.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span
                  className="inline-block size-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate max-w-[140px]">{item.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// AlphaFold 3D viewer (3Dmol.js from CDN)
// ---------------------------------------------------------------------------

const PLDDT_COLORS = [
  { label: "Very high (>90)", color: "#0053d6", min: 90 },
  { label: "Confident (70\u201390)", color: "#65cbf3", min: 70 },
  { label: "Low (50\u201370)", color: "#ffdb13", min: 50 },
  { label: "Very low (<50)", color: "#ff7d45", min: 0 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type $3Dmol = any;

let mol3dPromise: Promise<$3Dmol> | null = null;

function load3Dmol(): Promise<$3Dmol> {
  if (mol3dPromise) return mol3dPromise;
  mol3dPromise = new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    if (w.$3Dmol) {
      resolve(w.$3Dmol);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://3Dmol.org/build/3Dmol-min.js";
    script.async = true;
    script.onload = () => {
      if (w.$3Dmol) resolve(w.$3Dmol);
      else reject(new Error("3Dmol loaded but not found on window"));
    };
    script.onerror = () => reject(new Error("Failed to load 3Dmol.js"));
    document.head.appendChild(script);
  });
  return mol3dPromise;
}

const AlphaFoldViewer = memo(function AlphaFoldViewer({
  alphafoldId,
}: {
  alphafoldId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;

    (async () => {
      try {
        const $3Dmol = await load3Dmol();
        if (cancelled) return;

        // Resolve CIF URL via AlphaFold API (version-agnostic)
        let cifUrl: string | null = null;
        try {
          const apiResp = await fetch(
            `https://alphafold.ebi.ac.uk/api/prediction/${alphafoldId}`,
          );
          if (apiResp.ok) {
            const entries = (await apiResp.json()) as Array<{ cifUrl?: string }>;
            cifUrl = entries?.[0]?.cifUrl ?? null;
          }
        } catch {
          // API failed — skip
        }

        // Fallback: guess common versions
        if (!cifUrl) {
          for (const ver of [6, 4, 3]) {
            const url = `https://alphafold.ebi.ac.uk/files/AF-${alphafoldId}-F1-model_v${ver}.cif`;
            try {
              const resp = await fetch(url, { method: "HEAD" });
              if (resp.ok) {
                cifUrl = url;
                break;
              }
            } catch {
              continue;
            }
          }
        }

        if (!cifUrl || cancelled) {
          if (!cancelled) setStatus("error");
          return;
        }

        const cifResp = await fetch(cifUrl);
        if (!cifResp.ok) {
          if (!cancelled) setStatus("error");
          return;
        }
        const cifData = await cifResp.text();
        if (cancelled) return;

        el.innerHTML = "";

        const viewer = $3Dmol.createViewer(el, {
          backgroundColor: "white",
        });
        viewerRef.current = viewer;

        viewer.addModel(cifData, "cif");
        viewer.setStyle(
          {},
          {
            cartoon: {
              colorfunc: (atom: { b: number }) => {
                const b = atom.b;
                if (b > 90) return "#0053d6";
                if (b > 70) return "#65cbf3";
                if (b > 50) return "#ffdb13";
                return "#ff7d45";
              },
            },
          },
        );
        viewer.zoomTo();
        viewer.render();
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      viewerRef.current = null;
    };
  }, [alphafoldId]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        AlphaFold structure ({alphafoldId})
      </p>

      {/* Container is always in the DOM at full size so 3Dmol.js can initialize.
          Loading/error overlays sit on top via absolute positioning. */}
      <div className="relative" style={{ height: 300 }}>
        {status === "loading" && (
          <div className="absolute inset-0 z-10 rounded-md border border-border bg-muted animate-pulse flex items-center justify-center">
            <span className="text-xs text-muted-foreground">
              Loading 3D structure...
            </span>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 z-10 rounded-md border border-border bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">
              Could not load AlphaFold structure
            </span>
          </div>
        )}
        <div
          ref={containerRef}
          className="w-full h-full rounded-md border border-border"
        />
      </div>

      {/* pLDDT color legend */}
      {status === "ready" && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
          {PLDDT_COLORS.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
            >
              <span
                className="inline-block size-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: c.color }}
              />
              {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Combined component
// ---------------------------------------------------------------------------

export const AgentProteinStructure = memo(function AgentProteinStructure({
  spec,
}: {
  spec: ProteinStructureVizSpec;
}) {
  return (
    <div className="space-y-4">
      <DomainMap domains={spec.domains} proteinLength={spec.proteinLength} />
      {spec.alphafoldId && <AlphaFoldViewer alphafoldId={spec.alphafoldId} />}
    </div>
  );
});
