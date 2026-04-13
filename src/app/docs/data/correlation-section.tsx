"use client";

import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Maximize2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CorrelationHeatmap } from "../_components/correlation-heatmap";
import { Prose } from "../_components/doc-primitives";
import {
  type CorrelationData,
  loadCorrelationData,
} from "./_lib/load-correlation-data";

/* ------------------------------------------------------------------ */
/*  State                                                               */
/* ------------------------------------------------------------------ */

type LoadState =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "ready"; data: CorrelationData };

/* ------------------------------------------------------------------ */
/*  Section                                                             */
/* ------------------------------------------------------------------ */

export function CorrelationSection() {
  const [state, setState] = useState<LoadState>({ type: "loading" });
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    setState({ type: "loading" });
    loadCorrelationData()
      .then((d) => setState({ type: "ready", data: d }))
      .catch((e) =>
        setState({
          type: "error",
          message: e instanceof Error ? e.message : "Failed to load",
        }),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback((i: number) => {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (state.type === "ready")
      setExpanded(new Set(state.data.categories.map((_, i) => i)));
  }, [state]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  const n = state.type === "ready" ? state.data.n : 145;
  const cats = state.type === "ready" ? state.data.categories.length : 16;

  return (
    <>
      {/* ── Prose header ── */}
      <div className="mt-10">
        <Prose>
          <h2 id="correlation">Annotation correlation structure</h2>
          <p>
            The heatmap below shows pairwise Pearson correlations between {n}{" "}
            individual and integrative functional annotations across {cats}{" "}
            categories. Circle size and color encode correlation strength and
            direction: deeper <strong className="text-red-600">red</strong> for
            positive and deeper <strong className="text-blue-600">blue</strong>{" "}
            for negative correlations.
          </p>
          <p>
            Each <strong>annotation principal component (aPC)</strong> is the
            first PC calculated from standardized individual annotations that
            measure similar biological function, then PHRED-transformed for
            cross-variant comparability.
          </p>
        </Prose>
      </div>

      {/* ── Figure card ── */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <p className="text-xs font-semibold text-foreground tracking-tight">
            Figure 1. Correlation heatmap of individual and integrative
            functional annotations
          </p>
          {state.type === "ready" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
              className="shrink-0"
            >
              <Maximize2 className="size-3.5" />
              Explore
            </Button>
          )}
        </div>

        {state.type === "loading" && (
          <div className="flex flex-col items-center gap-4 py-16">
            <Skeleton className="aspect-square w-full max-w-[480px] rounded-lg" />
            <p className="text-xs text-muted-foreground">
              Loading correlation data&hellip;
            </p>
          </div>
        )}

        {state.type === "error" && (
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-sm text-destructive font-medium">
              Failed to load correlation data
            </p>
            <p className="text-xs text-muted-foreground max-w-md text-center">
              {state.message}
            </p>
            <Button variant="outline" size="sm" onClick={load} className="mt-1">
              Retry
            </Button>
          </div>
        )}

        {state.type === "ready" && (
          <div
            className="cursor-pointer group rounded-lg transition-shadow hover:shadow-md"
            onClick={() => setOpen(true)}
          >
            <CorrelationHeatmap
              data={state.data}
              expanded={new Set()}
              onToggle={() => {}}
              compact
            />
            <p className="text-[10px] text-muted-foreground text-center pt-3 group-hover:text-foreground transition-colors">
              Click to explore &middot; {cats} categories &middot; {n}{" "}
              annotations
            </p>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-5 leading-relaxed max-w-prose">
          Pairwise Pearson correlations between {n} individual and integrative
          functional annotations across {cats} categories, computed from a 0.06%
          SYSTEM sample (~5.5M of 8.9B variants). Collapsed blocks show the
          signed mean <em>r</em> across all member pairs (rendered as squares).
          New annotations since the original release include GPN-MSA, JARVIS,
          REMM, NCER, gnomAD Constraint, AlphaMissense, MACIE, CV2F, NCBoost, 28
          dbNSFP predictors, and SpliceAI.
        </p>
      </div>

      {/* ── Fullscreen dialog ── */}
      {state.type === "ready" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="!max-w-[calc(100vw-3rem)] w-full h-[calc(100vh-3rem)] !grid-rows-[auto_1fr] overflow-hidden">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4 pr-10">
                <div className="space-y-1">
                  <DialogTitle>Annotation correlation matrix</DialogTitle>
                  <DialogDescription>
                    {n} functional annotations across {cats} categories. Click
                    category labels or block cells to expand.
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  <Button variant="outline" size="xs" onClick={expandAll}>
                    Expand all
                  </Button>
                  <Button variant="outline" size="xs" onClick={collapseAll}>
                    Collapse all
                  </Button>
                </div>
              </div>

              {expanded.size > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {state.data.categories.map((cat, i) =>
                    expanded.has(i) ? (
                      <Badge
                        key={cat.key}
                        variant="outline"
                        className="cursor-pointer text-[10px] px-2 py-0 h-5 hover:bg-muted transition-colors"
                        style={{
                          color: cat.color,
                          borderColor: `${cat.color}40`,
                        }}
                        onClick={() => toggle(i)}
                      >
                        {cat.label} ({cat.count}) &times;
                      </Badge>
                    ) : null,
                  )}
                </div>
              )}
            </DialogHeader>

            <div className="overflow-auto min-h-0">
              <CorrelationHeatmap
                data={state.data}
                expanded={expanded}
                onToggle={toggle}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
