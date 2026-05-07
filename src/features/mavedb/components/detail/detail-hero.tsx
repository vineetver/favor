"use client";

import { ArrowUpRight, Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ScoresetDetail } from "../../types";

interface DetailHeroProps {
  geneSymbol: string;
  detail: ScoresetDetail;
  variantCount: number;
  calibrationCount: number;
}

export function DetailHero({
  geneSymbol,
  detail,
  variantCount,
  calibrationCount,
}: DetailHeroProps) {
  const { scoreset, target_genes } = detail;
  const target = target_genes[0]?.target_gene_name;
  const mavedbUrl = `https://www.mavedb.org/score-sets/${scoreset.urn}`;
  const backHref = `/hg38/gene/${encodeURIComponent(geneSymbol)}/gene-level-annotation/mave`;
  const [copied, setCopied] = useState(false);

  return (
    <header className="space-y-3">
      <Link
        href={backHref}
        className="inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
      >
        ← MaveDB scoreset
      </Link>

      <div className="flex items-start justify-between gap-6">
        <h1 className="text-page-title leading-tight max-w-3xl">
          {scoreset.title.trim()}
        </h1>
        <a
          href={mavedbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Open on MaveDB
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          {scoreset.urn}
          <button
            type="button"
            aria-label={copied ? "Copied" : "Copy URN"}
            onClick={() => {
              navigator.clipboard.writeText(scoreset.urn).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              });
            }}
            className="ml-0.5 inline-flex items-center justify-center rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="tabular-nums">
          {variantCount.toLocaleString()} variants
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span>
          {calibrationCount} calibration{calibrationCount === 1 ? "" : "s"}
        </span>
        {target && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="truncate max-w-[260px]">Target {target}</span>
          </>
        )}
      </div>
    </header>
  );
}
