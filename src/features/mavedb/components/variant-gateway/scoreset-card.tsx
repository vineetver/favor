import { cn } from "@infra/utils";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { VariantBand } from "../../types";
import { BandChip } from "../shared/band-chip";
import { StrengthBar } from "../shared/strength-bar";

interface ScoresetCardProps {
  scoresetUrn: string;
  scoresetTitle: string;
  publishedDate: string | null;
  /** All band rows for this scoreset (one row per calibration_title). */
  bands: VariantBand[];
}

/**
 * One scoreset that scored the variant. Each calibration_title is rendered
 * as its own row inside the card so multiple calibrations are comparable.
 */
export function ScoresetCard({
  scoresetUrn,
  scoresetTitle,
  publishedDate,
  bands,
}: ScoresetCardProps) {
  // All bands within a scoreset share the same `score` for this variant.
  const score = bands[0]?.score;

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <header className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/hg38/mavedb/${encodeURIComponent(scoresetUrn)}`}
            className="group inline-flex items-baseline gap-1 text-sm font-semibold text-foreground leading-snug hover:underline"
          >
            <span>{scoresetTitle.trim()}</span>
            <ArrowUpRight className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" />
          </Link>
          <p className="mt-0.5 text-[11px] font-mono text-muted-foreground truncate">
            {scoresetUrn}
          </p>
        </div>
        {publishedDate && (
          <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
            {publishedDate}
          </span>
        )}
      </header>

      {typeof score === "number" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Score{" "}
          <span className="font-medium text-foreground tabular-nums">
            {score.toFixed(3)}
          </span>
        </p>
      )}

      <ul className="mt-3 divide-y divide-border/60">
        {bands.map((b, i) => (
          <li
            key={`${b.calibration_title}-${i}`}
            className="flex flex-wrap items-center gap-2 py-2"
          >
            <BandChip labelClass={b.label_class}>{b.display_label}</BandChip>
            <StrengthBar strength={b.evidence_strength} />
            <span className="text-[11px] text-muted-foreground">
              {b.calibration_title}
            </span>
            {b.evidence_criterion && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                · {b.evidence_criterion}
              </span>
            )}
            {typeof b.oddspath_ratio === "number" && (
              <span className="text-[11px] tabular-nums text-muted-foreground">
                · OR {b.oddspath_ratio.toFixed(2)}
              </span>
            )}
            {/* RUO marker — flagged in the calibration row so clinical users
                know not to use this band for clinical interpretation. The
                gateway response doesn't carry the flag, so we surface it via
                a recognised calibration_title heuristic when present. */}
            {/biomarker.*research|research[\s_-]?use[\s_-]?only|RUO/i.test(
              b.calibration_title,
            ) && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                  "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
                )}
              >
                <ShieldAlert className="h-3 w-3" />
                RUO
              </span>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
