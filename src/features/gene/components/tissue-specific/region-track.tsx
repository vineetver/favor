"use client";

import { cn } from "@infra/utils";
import type { RegionSummary, RegionVariantRow } from "@features/gene/api/region";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegionTrackProps {
  gene: string;
  chrom: string;
  start: number;
  end: number;
  summary: RegionSummary | null;
  variants: RegionVariantRow[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtPos(n: number): string {
  return n.toLocaleString();
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function pct(pos: number, start: number, end: number): number {
  const span = end - start;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(100, ((pos - start) / span) * 100));
}

function uniqueVariantPositions(
  variants: RegionVariantRow[],
  start: number,
  end: number,
) {
  const map = new Map<number, { vcf: string; count: number }>();
  for (const v of variants) {
    if (v.position < start || v.position > end) continue;
    const existing = map.get(v.position);
    if (!existing) {
      map.set(v.position, { vcf: v.variant_vcf, count: 1 });
    } else {
      existing.count++;
    }
  }
  return [...map.entries()]
    .map(([position, { vcf, count }]) => ({ position, vcf, count }))
    .sort((a, b) => a.position - b.position);
}

// ---------------------------------------------------------------------------
// Component — minimal, no card wrapper
// ---------------------------------------------------------------------------

export function RegionTrack({
  gene,
  chrom,
  start,
  end,
  summary,
  variants,
}: RegionTrackProps) {
  const span = end - start;
  const uniqueVars = uniqueVariantPositions(variants, start, end);
  const counts = summary?.counts;

  return (
    <TooltipProvider delayDuration={150}>
      <div>
        {/* Coordinate ruler */}
        <div className="flex justify-between text-[9px] font-mono text-muted-foreground/50 mb-0.5 px-16">
          <span>{fmtPos(start)}</span>
          <span>
            {chrom} &middot; {fmtCount(span)} bp
          </span>
          <span>{fmtPos(end)}</span>
        </div>

        {/* Tracks */}
        <div className="space-y-1">
          {/* Gene body */}
          <TrackRow label="Gene">
            <div className="relative h-4 w-full">
              <div className="absolute inset-y-[7px] left-0 right-0 h-px bg-border" />
              <div className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-sm flex items-center justify-center">
                <span className="text-[9px] font-medium text-primary/70">
                  {gene}
                </span>
              </div>
            </div>
          </TrackRow>

          {/* Variants */}
          {uniqueVars.length > 0 && (
            <TrackRow label="Variants">
              <div className="relative h-4 w-full">
                <div className="absolute inset-y-[7px] left-0 right-0 h-px bg-border" />
                {uniqueVars.map((v) => (
                  <Tooltip key={v.position}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/hg38/variant/${encodeURIComponent(v.vcf)}`}
                        className="absolute top-0 h-4 hover:scale-x-150 transition-transform"
                        style={{
                          left: `${pct(v.position, start, end)}%`,
                          width: Math.max(4, 100 / uniqueVars.length / 3),
                          marginLeft: -Math.max(2, 50 / uniqueVars.length / 3),
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className={cn(
                            "w-full h-full rounded-sm",
                            v.count >= 3
                              ? "bg-destructive/70"
                              : v.count >= 2
                                ? "bg-destructive/50"
                                : "bg-destructive/30",
                          )}
                        />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <span className="font-mono">{v.vcf}</span>
                      <br />
                      <span className="text-muted-foreground">
                        {v.count} regulatory overlap{v.count !== 1 ? "s" : ""}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TrackRow>
          )}
        </div>

        {/* Inline counts */}
        {counts && (
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-[10px] text-muted-foreground">
            <Ct n={counts.signals} label="cCREs" />
            <Ct n={counts.chromatin_states} label="chromatin" />
            <Ct n={counts.enhancer_genes} label="enhancer–gene" />
            <Ct n={counts.accessibility_peaks} label="peaks" />
            <Ct n={counts.loops} label="loops" />
            <Ct n={counts.ase} label="ASE" />
            {uniqueVars.length > 0 && (
              <Ct n={uniqueVars.length} label="regulatory variants" />
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function TrackRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-14 shrink-0 text-[9px] text-muted-foreground/60 text-right">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function Ct({ n, label }: { n: number; label: string }) {
  if (n === 0) return null;
  return (
    <span>
      <span className="tabular-nums text-foreground/70">{fmtCount(n)}</span>{" "}
      {label}
    </span>
  );
}
