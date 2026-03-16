"use client";

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
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { CcreDetail } from "@features/gene/api/region";

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchCcre(ccreId: string): Promise<CcreDetail> {
  const res = await fetch(
    `/api/v1/ccres/${encodeURIComponent(ccreId)}?signal_limit=10&gene_limit=10`,
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTissueName(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\((\d+)\s+(Years?|Days?)\)/gi, "($1 $2)");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  const { data, isLoading, error } = useQuery({
    queryKey: ["ccre-detail", ccreId],
    queryFn: () => fetchCcre(ccreId!),
    enabled: !!ccreId && open,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[440px] sm:max-w-[480px] overflow-y-auto"
      >
        {/* Always render a title for accessibility */}
        {!data && (
          <SheetHeader>
            <SheetTitle className="text-lg font-mono font-semibold text-foreground">
              {ccreId ?? "cCRE Detail"}
            </SheetTitle>
          </SheetHeader>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Failed to load cCRE details
          </div>
        )}

        {data && <CcreDetailContent detail={data} />}
      </SheetContent>
    </Sheet>
  );
}

function CcreDetailContent({ detail }: { detail: CcreDetail }) {
  const maxSignal =
    detail.signals.top.length > 0
      ? Math.max(...detail.signals.top.map((s) => s.max_signal))
      : 1;

  return (
    <>
      <SheetHeader className="pb-4 border-b border-border">
        <SheetTitle className="text-lg font-mono font-semibold text-foreground">
          {detail.ccre_id}
        </SheetTitle>
        <SheetDescription className="text-xs text-muted-foreground space-y-1">
          <span>
            chr{detail.chrom}:{detail.start.toLocaleString()}&ndash;
            {detail.end.toLocaleString()}
          </span>
        </SheetDescription>
        {detail.classifications.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {detail.classifications.map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px]">
                {c}
              </Badge>
            ))}
          </div>
        )}
      </SheetHeader>

      {/* Top tissue signals */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-sm font-medium text-foreground">
            Top Tissue Signals
          </h4>
          <span className="text-[10px] text-muted-foreground">
            {detail.signals.total_tissues} tissues total
          </span>
        </div>

        <TooltipProvider delayDuration={100}>
          <div className="space-y-1">
            {detail.signals.top.map((sig, i) => {
              const pct =
                maxSignal > 0
                  ? (Math.max(sig.max_signal, 0) / maxSignal) * 100
                  : 0;

              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 group cursor-default">
                      <span
                        className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate shrink-0 text-right"
                        style={{ width: 100 }}
                      >
                        {formatTissueName(sig.tissue_name)}
                      </span>
                      <div className="flex-1 h-4 bg-muted/40 rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm bg-primary transition-all"
                          style={{
                            width: `${Math.max(pct, 1)}%`,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground w-10 text-right shrink-0">
                        {sig.max_signal.toFixed(1)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    <div>
                      {sig.dnase != null && <p>DNase: {sig.dnase.toFixed(2)}</p>}
                      {sig.h3k27ac != null && (
                        <p>H3K27ac: {sig.h3k27ac.toFixed(2)}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Linked genes */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-sm font-medium text-foreground">Linked Genes</h4>
          <span className="text-[10px] text-muted-foreground">
            {detail.genes.total} total
          </span>
        </div>

        <div className="space-y-1">
          {detail.genes.links.map((link, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-accent transition-colors text-sm"
            >
              <Link
                href={`/hg38/gene/${encodeURIComponent(link.gene_symbol)}/gene-level-annotation/llm-summary`}
                className="font-mono font-medium text-primary hover:underline shrink-0"
              >
                {link.gene_symbol}
              </Link>
              <span className="text-[10px] text-muted-foreground truncate">
                {link.method ?? link.source}
              </span>
              <span className="text-[10px] text-muted-foreground truncate flex-1">
                {formatTissueName(link.tissue_name)}
              </span>
              {link.score != null && (
                <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                  {link.score.toFixed(3)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
