"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
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
const LABEL_HEIGHT = 20;
const PADDING_X = 40; // space for scale labels

function DomainMap({
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
  const svgHeight = TRACK_HEIGHT + LABEL_HEIGHT + 12;

  return (
    <div ref={containerRef} className="w-full">
      {width > 0 && (
        <>
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
            {domains.map((d) => {
              const x = PADDING_X + (d.start - 1) * scale;
              const w = Math.max((d.end - d.start + 1) * scale, 2);
              return (
                <Tooltip key={d.id}>
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

            {/* Scale labels */}
            <text
              x={PADDING_X}
              y={TRACK_HEIGHT + 20}
              className="fill-muted-foreground text-[10px]"
              textAnchor="start"
            >
              1
            </text>
            <text
              x={PADDING_X + trackWidth}
              y={TRACK_HEIGHT + 20}
              className="fill-muted-foreground text-[10px]"
              textAnchor="end"
            >
              {proteinLength}
            </text>
          </svg>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 px-1">
            {domains.map((d) => (
              <div key={d.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span
                  className="inline-block size-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="truncate max-w-[140px]">{d.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AlphaFold 3D viewer (3Dmol.js from CDN)
// ---------------------------------------------------------------------------

const PLDDT_COLORS = [
  { label: "Very high (>90)", color: "#0053d6", min: 90 },
  { label: "Confident (70–90)", color: "#65cbf3", min: 70 },
  { label: "Low (50–70)", color: "#ffdb13", min: 50 },
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

function AlphaFoldViewer({ alphafoldId }: { alphafoldId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const initViewer = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    try {
      const $3Dmol = await load3Dmol();
      const cifUrl = `https://alphafold.ebi.ac.uk/files/AF-${alphafoldId}-F1-model_v4.cif`;
      const resp = await fetch(cifUrl);
      if (!resp.ok) throw new Error(`AlphaFold fetch failed: ${resp.status}`);
      const cifData = await resp.text();

      // Clear any previous viewer
      el.innerHTML = "";

      const viewer = $3Dmol.createViewer(el, {
        backgroundColor: "white",
      });
      viewerRef.current = viewer;

      viewer.addModel(cifData, "cif");
      // Color by pLDDT (stored in B-factor)
      viewer.setStyle({}, {
        cartoon: {
          colorfunc: (atom: { b: number }) => {
            const b = atom.b;
            if (b > 90) return "#0053d6";
            if (b > 70) return "#65cbf3";
            if (b > 50) return "#ffdb13";
            return "#ff7d45";
          },
        },
      });
      viewer.zoomTo();
      viewer.render();
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [alphafoldId]);

  useEffect(() => {
    initViewer();
    return () => {
      viewerRef.current = null;
    };
  }, [initViewer]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        AlphaFold structure ({alphafoldId})
      </p>

      {status === "loading" && (
        <div className="h-[300px] w-full rounded-md border border-border bg-muted animate-pulse flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Loading 3D structure...</span>
        </div>
      )}
      {status === "error" && (
        <div className="h-[300px] w-full rounded-md border border-border bg-muted flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Could not load AlphaFold structure</span>
        </div>
      )}

      <div
        ref={containerRef}
        className={`w-full rounded-md border border-border ${status === "ready" ? "" : status === "loading" ? "hidden" : "hidden"}`}
        style={{ height: 300 }}
      />

      {/* pLDDT color legend */}
      {status === "ready" && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
          {PLDDT_COLORS.map((c) => (
            <div key={c.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
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
}

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
