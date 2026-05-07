import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ScoresetSummary } from "../../types";

interface ScoresetCardProps {
  geneSymbol: string;
  scoreset: ScoresetSummary;
}

export function ScoresetCard({ geneSymbol, scoreset }: ScoresetCardProps) {
  const calCount = scoreset.calibration_titles.length;
  const href = `/hg38/gene/${encodeURIComponent(geneSymbol)}/gene-level-annotation/mave/${encodeURIComponent(scoreset.urn)}`;

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
          {scoreset.title.trim()}
        </h3>
        {scoreset.published_date && (
          <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
            {scoreset.published_date}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] font-mono text-muted-foreground truncate">
        {scoreset.urn}
      </p>

      {scoreset.short_description && (
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {scoreset.short_description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-medium tabular-nums">
          {scoreset.num_variants.toLocaleString()} variants
        </span>
        <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-medium tabular-nums">
          {calCount} calibration{calCount === 1 ? "" : "s"}
        </span>
        {scoreset.license_short_name && (
          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-medium">
            {scoreset.license_short_name}
          </span>
        )}
      </div>

      <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open scoreset <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}
