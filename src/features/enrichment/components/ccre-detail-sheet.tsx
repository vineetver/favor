"use client";

import type { CcreDetail } from "@features/enrichment/api/region";
import { Badge } from "@shared/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@shared/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { formatTissueName } from "@shared/utils/tissue-format";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { API_BASE } from "@/config/api";

/* ------------------------------------------------------------------ */
/*  Classification full forms                                           */
/* ------------------------------------------------------------------ */

const CLASS_LABELS: Record<string, string> = {
  PLS: "Promoter-Like",
  pELS: "Proximal Enhancer-Like",
  dELS: "Distal Enhancer-Like",
  DLS: "Distal Promoter-Like",
  "CA-CTCF": "CTCF-bound Accessible",
  "CA-H3K4me3": "H3K4me3 Accessible",
  "CA-TF": "TF-bound Accessible",
  CA: "Accessible Only",
  TF: "TF Only",
};

/* ------------------------------------------------------------------ */
/*  Graph API response (subset we display)                              */
/* ------------------------------------------------------------------ */

interface GraphCcre {
  annotation: string | null;
  annotation_label: string | null;
  nearest_gene_symbol: string | null;
  distance_to_nearest_tss: number | null;
  biosample_count: number | null;
  abc_supported_gene_count: number | null;
  max_dnase_signal: number | null;
  max_atac_signal: number | null;
  max_h3k27ac_signal: number | null;
  max_h3k4me3_signal: number | null;
  max_ctcf_signal: number | null;
  conservation_score_mean: number | null;
  loop_anchor_overlap: boolean | null;
  is_dynamic_enhancer: boolean | null;
  vista_enhancer_overlap: boolean | null;
  super_enhancer_overlap: boolean | null;
  is_silencer: boolean | null;
  mpra_tested: boolean | null;
  capra_tested: boolean | null;
}

/* ------------------------------------------------------------------ */
/*  Fetchers                                                            */
/* ------------------------------------------------------------------ */

async function fetchCcre(id: string): Promise<CcreDetail> {
  const r = await fetch(
    `${API_BASE}/ccres/${encodeURIComponent(id)}?signal_limit=10&gene_limit=10`,
    { credentials: "include" },
  );
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

async function fetchGraph(id: string): Promise<GraphCcre | null> {
  try {
    const r = await fetch(
      `${API_BASE}/graph/cCRE/${encodeURIComponent(id)}?mode=full&include=counts`,
      { credentials: "include" },
    );
    if (!r.ok) return null;
    const json = await r.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Sheet                                                               */
/* ------------------------------------------------------------------ */

interface CcreDetailSheetProps {
  ccreId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CcreDetailSheet({
  ccreId,
  open,
  onOpenChange,
}: CcreDetailSheetProps) {
  const detail = useQuery({
    queryKey: ["ccre", ccreId],
    queryFn: () => fetchCcre(ccreId!),
    enabled: !!ccreId && open,
    staleTime: 300_000,
  });
  const graph = useQuery({
    queryKey: ["ccre-graph", ccreId],
    queryFn: () => fetchGraph(ccreId!),
    enabled: !!ccreId && open,
    staleTime: 300_000,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[460px] overflow-y-auto p-0"
      >
        {/* Accessible title for screen readers when content isn't loaded yet */}
        {!detail.data && (
          <SheetHeader className="p-6">
            <SheetTitle className="text-base font-mono font-semibold">
              {ccreId ?? "cCRE Detail"}
            </SheetTitle>
          </SheetHeader>
        )}
        {detail.isLoading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {detail.error && (
          <div className="p-6 text-sm text-muted-foreground text-center">
            Failed to load cCRE
          </div>
        )}
        {detail.data && <Content d={detail.data} g={graph.data ?? null} />}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Content                                                             */
/* ------------------------------------------------------------------ */

function Content({ d, g }: { d: CcreDetail; g: GraphCcre | null }) {
  // Resolve classification — prefer graph annotation over enrichment
  const cls = d.classifications.filter((c) => !c.includes("Missing"));
  const annotation = cls.length > 0 ? cls[0] : (g?.annotation ?? null);
  const fullLabel = annotation
    ? (CLASS_LABELS[annotation] ?? g?.annotation_label ?? annotation)
    : null;

  const maxZ =
    d.signals.top.length > 0
      ? Math.max(...d.signals.top.map((s) => s.max_signal))
      : 1;

  // Functional evidence — only show if at least one is true
  const evidence = g
    ? [
        g.loop_anchor_overlap === true && "Hi-C loop anchor",
        g.is_dynamic_enhancer === true && "Dynamic enhancer",
        g.vista_enhancer_overlap === true && "VISTA validated",
        g.super_enhancer_overlap === true && "Super-enhancer",
        g.mpra_tested === true && "MPRA tested",
        g.capra_tested === true && "CAPRA tested",
      ].filter((v): v is string => typeof v === "string")
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <SheetHeader className="p-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <SheetTitle className="text-base font-mono font-semibold">
              {d.ccre_id}
            </SheetTitle>
            <SheetDescription className="text-xs mt-0.5 tabular-nums">
              chr{d.chrom}:{d.start.toLocaleString()}&ndash;
              {d.end.toLocaleString()}
              <span className="text-muted-foreground/50 ml-1.5">
                ({(d.end - d.start).toLocaleString()} bp)
              </span>
            </SheetDescription>
          </div>
          {annotation && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {fullLabel ?? annotation}
            </Badge>
          )}
        </div>

        {/* Nearest gene + biosamples — compact row */}
        {g && (
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
            {g.nearest_gene_symbol && (
              <span>
                Nearest gene{" "}
                <Link
                  href={`/hg38/gene/${encodeURIComponent(g.nearest_gene_symbol)}/gene-level-annotation/llm-summary`}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  {g.nearest_gene_symbol}
                </Link>
                {g.distance_to_nearest_tss != null && (
                  <span className="text-muted-foreground/60 ml-1">
                    ({g.distance_to_nearest_tss.toLocaleString()} bp)
                  </span>
                )}
              </span>
            )}
            {g.biosample_count != null && g.biosample_count > 0 && (
              <span>{g.biosample_count} biosamples</span>
            )}
            {g.abc_supported_gene_count != null &&
              g.abc_supported_gene_count > 0 && (
                <span>{g.abc_supported_gene_count} ABC genes</span>
              )}
          </div>
        )}
      </SheetHeader>

      <div className="border-t border-border" />

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Peak signals — compact bar chart */}
        {g && (
          <div className="px-6 py-4">
            <SectionLabel>Peak signals (Z-score)</SectionLabel>
            <div className="flex items-end gap-3 mt-2 h-16">
              {(
                [
                  { k: "DNase", v: g.max_dnase_signal },
                  { k: "ATAC", v: g.max_atac_signal },
                  { k: "H3K27ac", v: g.max_h3k27ac_signal },
                  { k: "H3K4me3", v: g.max_h3k4me3_signal },
                  { k: "CTCF", v: g.max_ctcf_signal },
                ] as const
              ).map(({ k, v }) => {
                const val = v ?? 0;
                const pct = Math.max(4, Math.min(100, (val / 10) * 100));
                return (
                  <div
                    key={k}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] tabular-nums text-foreground font-medium">
                      {val.toFixed(1)}
                    </span>
                    <div
                      className="w-full bg-muted/50 rounded-sm overflow-hidden"
                      style={{ height: 40 }}
                    >
                      <div
                        className="w-full bg-primary/60 rounded-sm"
                        style={{
                          height: `${pct}%`,
                          marginTop: `${100 - pct}%`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {k}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Functional evidence */}
        {evidence.length > 0 && (
          <div className="px-6 pb-4">
            <SectionLabel>Evidence</SectionLabel>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {evidence.map((e) => (
                <span
                  key={e}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15"
                >
                  {e}
                </span>
              ))}
            </div>
            {g &&
              g.conservation_score_mean != null &&
              g.conservation_score_mean > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Conservation:{" "}
                  <span className="tabular-nums font-medium text-foreground">
                    {g.conservation_score_mean.toFixed(3)}
                  </span>
                </p>
              )}
          </div>
        )}

        <div className="border-t border-border" />

        {/* Top tissue signals */}
        <div className="px-6 py-4">
          <div className="flex items-baseline justify-between">
            <SectionLabel>Tissue signals</SectionLabel>
            <span className="text-[10px] text-muted-foreground">
              {d.signals.total_tissues} tissues
            </span>
          </div>
          <TooltipProvider delayDuration={100}>
            <div className="mt-2 space-y-0.5">
              {d.signals.top.map((sig, i) => {
                const pct =
                  maxZ > 0 ? (Math.max(sig.max_signal, 0) / maxZ) * 100 : 0;
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 py-0.5 group cursor-default">
                        <span
                          className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors truncate text-right shrink-0"
                          style={{ width: 90 }}
                        >
                          {formatTissueName(sig.tissue_name)}
                        </span>
                        <div className="flex-1 h-3 bg-muted/30 rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm bg-primary/50"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right shrink-0">
                          {sig.max_signal.toFixed(1)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">
                      {sig.dnase != null && (
                        <p>DNase: {sig.dnase.toFixed(2)}</p>
                      )}
                      {sig.h3k27ac != null && (
                        <p>H3K27ac: {sig.h3k27ac.toFixed(2)}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>

        <div className="border-t border-border" />

        {/* Linked genes */}
        <div className="px-6 py-4">
          <div className="flex items-baseline justify-between">
            <SectionLabel>Linked genes</SectionLabel>
            <span className="text-[10px] text-muted-foreground">
              {d.genes.total} total
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            {d.genes.links.map((link, i) => (
              <div key={i} className="flex items-center gap-2 py-1 text-xs">
                <Link
                  href={`/hg38/gene/${encodeURIComponent(link.gene_symbol)}/gene-level-annotation/llm-summary`}
                  className="font-mono font-medium text-primary hover:underline shrink-0 w-14"
                >
                  {link.gene_symbol}
                </Link>
                <span className="text-muted-foreground truncate flex-1">
                  {formatTissueName(link.tissue_name)}
                </span>
                {link.score != null && (
                  <span className="tabular-nums text-muted-foreground shrink-0">
                    {link.score.toFixed(1)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer link ── */}
      <div className="border-t border-border px-6 py-3 text-center shrink-0">
        <Link
          href={`/ccre/${encodeURIComponent(d.ccre_id)}`}
          className="text-xs text-primary hover:underline"
        >
          View full profile &rarr;
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tiny helpers                                                        */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-medium text-foreground tracking-wide uppercase">
      {children}
    </h4>
  );
}
