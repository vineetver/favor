"use client";

import type { Gene } from "@features/gene/types";
import { cn } from "@infra/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { NoDataState } from "@shared/components/ui/error-states";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { Info } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface ConstraintsOverviewProps {
  gene: Gene;
  className?: string;
}

// ============================================================================
// Utilities
// ============================================================================

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "" || v === ".") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function fmt(v: string | number | null | undefined, decimals = 4): string {
  const n = num(v);
  if (n === null) return "—";
  return n.toFixed(decimals);
}

function fmtInt(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return Math.round(v).toLocaleString();
}

const EM_DASH = "—";

// Bucket helpers — published thresholds.
function lofBucket(pLI: number | null): string {
  if (pLI === null) return EM_DASH;
  if (pLI > 0.9) return "High";
  if (pLI >= 0.5) return "Moderate";
  return "Low";
}

function haploBucket(phaplo: number | null): string {
  if (phaplo === null) return EM_DASH;
  return phaplo > 0.86 ? "Likely" : "Unlikely";
}

function triploBucket(ptriplo: number | null): string {
  if (ptriplo === null) return EM_DASH;
  return ptriplo > 0.94 ? "Sensitive" : "Tolerant";
}

// ============================================================================
// Atoms
// ============================================================================

function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 cursor-help shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

/** Sub-section strip header — matches the platform pattern used across overview cards. */
function SectionStrip({ title, source }: { title: string; source?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-muted/60 px-6 py-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
      {source && (
        <span className="text-[11px] font-medium text-muted-foreground">
          {source}
        </span>
      )}
    </div>
  );
}

/** Verdict block: small label, bucket word, secondary detail. Pure type. */
function Verdict({
  label,
  bucket,
  detail,
  help,
}: {
  label: string;
  bucket: string;
  detail: string;
  help?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
        {help && <InfoTip>{help}</InfoTip>}
      </div>
      <div className="text-base font-semibold text-foreground">{bucket}</div>
      <div className="text-xs text-muted-foreground tabular-nums">{detail}</div>
    </div>
  );
}

/** O/E ratio bar (0–2 scale, 1.0 baseline, optional CI band). */
function OEBar({
  label,
  oe,
  lower,
  upper,
  meta,
  help,
}: {
  label: string;
  oe: number | null;
  lower: number | null;
  upper: number | null;
  meta?: string;
  help?: string;
}) {
  const scale = 2.0;
  const toPct = (v: number) => Math.max(0, Math.min(100, (v / scale) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">{label}</span>
          {help && <InfoTip>{help}</InfoTip>}
        </div>
        <span className="text-sm font-mono text-foreground tabular-nums">
          {oe != null ? oe.toFixed(4) : EM_DASH}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/30"
          style={{ left: `${toPct(1)}%` }}
        />
        {lower != null && upper != null && (
          <div
            className="absolute top-0.5 bottom-0.5 rounded-full bg-primary/40"
            style={{
              left: `${toPct(lower)}%`,
              width: `${Math.max(1, toPct(upper) - toPct(lower))}%`,
            }}
          />
        )}
        {oe != null && (
          <div
            className="absolute top-0 h-2 w-1.5 rounded-full bg-primary"
            style={{ left: `${toPct(oe)}%`, transform: "translateX(-50%)" }}
          />
        )}
      </div>
      {meta && (
        <div className="text-xs text-muted-foreground tabular-nums">{meta}</div>
      )}
    </div>
  );
}

/** Threshold-aware probability bar (0–1 scale, threshold notch, fill flips). */
function ThresholdBar({
  label,
  value,
  threshold,
  thresholdLabel,
  help,
}: {
  label: string;
  value: number;
  threshold: number;
  thresholdLabel?: string;
  help?: string;
}) {
  const pct = Math.max(0, Math.min(100, value * 100));
  const thrPct = Math.max(0, Math.min(100, threshold * 100));
  const above = value >= threshold;
  return (
    <div className="grid grid-cols-[140px_auto_1fr] gap-x-6 gap-y-1 items-center">
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        {help && <InfoTip>{help}</InfoTip>}
      </div>
      <span className="text-sm font-mono tabular-nums text-foreground">
        {value.toFixed(4)}
      </span>
      <div>
        <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "absolute top-0 left-0 h-full rounded-full",
              above ? "bg-primary" : "bg-muted-foreground/35",
            )}
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-foreground/40"
            style={{ left: `${thrPct}%` }}
          />
          <div
            className="absolute top-0 h-2 w-1.5 rounded-full bg-foreground"
            style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
          />
        </div>
        <div className="relative mt-1 h-3 text-[10px] tabular-nums text-muted-foreground/70">
          <span className="absolute left-0">0</span>
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${thrPct}%` }}
          >
            {thresholdLabel ?? `thr ${threshold.toFixed(2)}`}
          </span>
          <span className="absolute right-0">1</span>
        </div>
      </div>
    </div>
  );
}

/** Quiet detail row: label · value · optional source. */
function DetailRow({
  label,
  value,
  source,
  help,
}: {
  label: string;
  value: string;
  source?: string;
  help?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_120px] items-baseline gap-x-6 py-2.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm text-muted-foreground">{label}</span>
        {help && <InfoTip>{help}</InfoTip>}
      </div>
      <span className="whitespace-nowrap font-mono text-sm tabular-nums text-foreground">
        {value}
      </span>
      <span className="whitespace-nowrap text-right text-[11px] text-muted-foreground/70">
        {source ?? ""}
      </span>
    </div>
  );
}

// ============================================================================
// Main
// ============================================================================

export function ConstraintsOverview({
  gene,
  className,
}: ConstraintsOverviewProps) {
  const { loeuf, posterior, shet, damage, gnomad } =
    gene.constraint_scores ?? {};

  const hasAnyData = loeuf || posterior || shet || damage || gnomad;

  if (!hasAnyData) {
    return (
      <NoDataState
        categoryName="Constraints & Haploinsufficiency"
        description="No constraint or haploinsufficiency data is available for this gene."
      />
    );
  }

  // Headline metrics
  const pLI = num(gnomad?.gnom_ad_p_li);
  const pRec = num(gnomad?.gnom_ad_p_rec);
  const pNull = num(gnomad?.gnom_ad_p_null);
  const lofOE = num(loeuf?.lof_oe);
  const phaplo = num(posterior?.phaplo);
  const ptriplo = num(posterior?.ptriplo);
  const pHI = num(damage?.p_hi);
  const hiPredScore = num(damage?.hi_pred_score);
  const hiPred = damage?.hi_pred;
  const ghis = num(damage?.ghis);
  const shetMean = num(shet?.mean_s_het);
  const shetLo = num(shet?.s_het_lower_95);
  const shetHi = num(shet?.s_het_upper_95);

  // Verdict detail strings
  const lofDetailParts: string[] = [];
  if (pLI !== null) lofDetailParts.push(`pLI ${pLI.toFixed(3)}`);
  if (lofOE !== null) lofDetailParts.push(`LOEUF ${lofOE.toFixed(2)}`);
  const lofDetail = lofDetailParts.length
    ? lofDetailParts.join(" · ")
    : EM_DASH;

  const haploDetail =
    phaplo !== null ? `pHaplo ${phaplo.toFixed(3)} (thr 0.86)` : EM_DASH;
  const triploDetail =
    ptriplo !== null ? `pTriplo ${ptriplo.toFixed(3)} (thr 0.94)` : EM_DASH;

  // Section gating
  const hasOE =
    !!loeuf &&
    (lofOE !== null ||
      num(loeuf.mis_oe) !== null ||
      num(loeuf.syn_oe) !== null);
  const hasDosage = phaplo !== null || ptriplo !== null;
  const hasSelection =
    shetMean !== null || pLI !== null || pRec !== null || pNull !== null;

  // Detailed metrics — flat, ordered list of (label, value, source?, help?)
  type Row = { label: string; value: string; source?: string; help?: string };
  const detail: Row[] = [];
  if (pHI !== null)
    detail.push({
      label: "P(HI)",
      value: pHI.toFixed(4),
      source: "Huang '10",
      help: "Probability of haploinsufficiency (Huang et al. 2010).",
    });
  if (hiPredScore !== null)
    detail.push({
      label: "HIPred score",
      value: hiPredScore.toFixed(4),
      source: "Shihab '17",
      help: "ML haploinsufficiency score (Shihab et al. 2017).",
    });
  if (hiPred != null && hiPred !== "")
    detail.push({
      label: "HIPred call",
      value: /^(Y|Yes|true)$/i.test(hiPred) ? "Yes" : "No",
      source: "Shihab '17",
      help: "Binary call from the HIPred model.",
    });
  if (ghis !== null)
    detail.push({
      label: "GHIS",
      value: ghis.toFixed(4),
      help: "Gene Haploinsufficiency Score. Higher = more likely haploinsufficient.",
    });
  if (damage) {
    const rvisEvs = num(damage.rvis_evs);
    const rvisEvsPct = num(damage.rvis_percentile_evs);
    if (rvisEvs !== null) {
      const pctSuffix =
        rvisEvsPct !== null ? ` · pct ${rvisEvsPct.toFixed(1)}` : "";
      detail.push({
        label: "RVIS (EVS)",
        value: `${rvisEvs.toFixed(4)}${pctSuffix}`,
        help: "Residual Variation Intolerance Score (EVS). More negative = less variation than expected.",
      });
    }
    const rvisExac = num(damage.rvis_ex_ac);
    const rvisExacPct = num(damage.rvis_percentile_ex_ac);
    if (rvisExac !== null) {
      const pctSuffix =
        rvisExacPct !== null ? ` · pct ${rvisExacPct.toFixed(1)}` : "";
      detail.push({
        label: "RVIS (ExAC)",
        value: `${rvisExac.toFixed(4)}${pctSuffix}`,
        help: "ExAC-based RVIS using MAF filter at 0.05%.",
      });
    }
    if (num(damage.gdi) !== null)
      detail.push({
        label: "GDI",
        value: fmt(damage.gdi, 4),
        help: "Gene Damage Index. Higher = more accumulated damage in the population.",
      });
    if (num(damage.gdi_phred) !== null)
      detail.push({
        label: "GDI (Phred)",
        value: fmt(damage.gdi_phred, 4),
        help: "Phred-scaled GDI for cross-gene comparison.",
      });

    const del = num(damage.ex_ac_del_score);
    const dup = num(damage.ex_ac_dup_score);
    const cnv = num(damage.ex_ac_cnv_score);
    if (del !== null || dup !== null || cnv !== null) {
      const fmtOrDash = (v: number | null) =>
        v !== null ? v.toFixed(4) : EM_DASH;
      detail.push({
        label: "ExAC Del / Dup / CNV",
        value: `${fmtOrDash(del)} / ${fmtOrDash(dup)} / ${fmtOrDash(cnv)}`,
        help: "Structural-variant intolerance from ExAC.",
      });
    }
    if (num(damage.lo_f_fdr_ex_ac) !== null)
      detail.push({
        label: "LoF FDR (ExAC)",
        value: fmt(damage.lo_f_fdr_ex_ac, 4),
        help: "FDR p-value for LoF variant depletion.",
      });
    if (num(damage.p_rec) !== null)
      detail.push({
        label: "P(Rec)",
        value: fmt(damage.p_rec, 4),
        help: "Probability of being a recessive disease gene.",
      });
  }

  // O/E meta-line builders
  const oeMeta = (
    obs: number | null | undefined,
    exp: number | null | undefined,
    statLabel: string,
    stat: number | null | undefined,
    ciLo?: number | null,
    ciHi?: number | null,
  ) => {
    const parts: string[] = [];
    if (ciLo != null && ciHi != null)
      parts.push(`90% CI ${ciLo.toFixed(2)} – ${ciHi.toFixed(2)}`);
    if (obs != null && exp != null)
      parts.push(`${fmtInt(obs)} obs / ${exp.toFixed(1)} exp`);
    if (stat != null) parts.push(`${statLabel} ${stat.toFixed(2)}`);
    return parts.join("  ·  ");
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Card className={cn("border border-border py-0 gap-0", className)}>
        <CardHeader className="border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold text-foreground">
                Constraints &amp; Haploinsufficiency
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Population-level signals of how this gene tolerates variation.
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0!">
          {/* Constraint profile */}
          <SectionStrip title="Constraint profile" />
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-3">
              <Verdict
                label="LoF intolerance"
                bucket={lofBucket(pLI)}
                detail={lofDetail}
                help="Combines pLI (probability of LoF intolerance) and LOEUF (observed/expected LoF). pLI > 0.9 = highly intolerant."
              />
              <Verdict
                label="Haploinsufficiency"
                bucket={haploBucket(phaplo)}
                detail={haploDetail}
                help="Posterior probability the gene is haploinsufficient. Threshold: pHaplo > 0.86."
              />
              <Verdict
                label="Triplosensitivity"
                bucket={triploBucket(ptriplo)}
                detail={triploDetail}
                help="Posterior probability the gene is triplosensitive. Threshold: pTriplo > 0.94."
              />
            </div>
          </div>

          {/* Observed vs expected */}
          {hasOE && loeuf && (
            <>
              <SectionStrip title="Observed vs expected" source="gnomAD v4" />
              <div className="space-y-5 px-6 py-5">
                <OEBar
                  label="Loss-of-Function"
                  oe={loeuf.lof_oe}
                  lower={loeuf.lof_oe_ci_lower}
                  upper={loeuf.lof_oe_ci_upper}
                  help="Observed/expected LoF variants. Band = 90% CI. Line at 1.0 = baseline."
                  meta={oeMeta(
                    loeuf.lof_obs,
                    loeuf.lof_exp,
                    "pLI",
                    loeuf.lof_pLI,
                    loeuf.lof_oe_ci_lower,
                    loeuf.lof_oe_ci_upper,
                  )}
                />
                <OEBar
                  label="Missense"
                  oe={loeuf.mis_oe}
                  lower={null}
                  upper={null}
                  meta={oeMeta(
                    loeuf.mis_obs,
                    loeuf.mis_exp,
                    "Z",
                    loeuf.mis_z_score,
                  )}
                />
                <OEBar
                  label="Synonymous"
                  oe={loeuf.syn_oe}
                  lower={null}
                  upper={null}
                  meta={oeMeta(
                    loeuf.syn_obs,
                    loeuf.syn_exp,
                    "Z",
                    loeuf.syn_z_score,
                  )}
                />
              </div>
            </>
          )}

          {/* Dosage sensitivity */}
          {hasDosage && (
            <>
              <SectionStrip title="Dosage sensitivity" source="Collins '22" />
              <div className="space-y-5 px-6 py-5">
                {phaplo !== null && (
                  <ThresholdBar
                    label="pHaplo"
                    value={phaplo}
                    threshold={0.86}
                    help="Posterior probability the gene is haploinsufficient (loss of one copy)."
                  />
                )}
                {ptriplo !== null && (
                  <ThresholdBar
                    label="pTriplo"
                    value={ptriplo}
                    threshold={0.94}
                    help="Posterior probability the gene is triplosensitive (gain of one copy)."
                  />
                )}
              </div>
            </>
          )}

          {/* Selection */}
          {hasSelection && (
            <>
              <SectionStrip title="Selection" source="gnomAD 2.1 · S(Het)" />
              <div className="divide-y divide-border/60 px-6">
                {shetMean !== null && (
                  <DetailRow
                    label="S(Het)"
                    value={
                      shetLo !== null && shetHi !== null
                        ? `${shetMean.toFixed(4)}   95% CI ${shetLo.toFixed(2)} – ${shetHi.toFixed(2)}`
                        : shetMean.toFixed(4)
                    }
                    help="Selection coefficient against heterozygous LoF carriers. Higher ⇒ stronger purifying selection."
                  />
                )}
                {(pLI !== null || pRec !== null || pNull !== null) && (
                  <DetailRow
                    label="pLI / pRec / pNull"
                    value={`${pLI !== null ? pLI.toFixed(3) : EM_DASH} / ${pRec !== null ? pRec.toFixed(3) : EM_DASH} / ${pNull !== null ? pNull.toFixed(3) : EM_DASH}`}
                    help="LoF-intolerance probabilities (sum to 1) from the gnomAD constraint model."
                  />
                )}
              </div>
            </>
          )}

          {/* Detailed metrics */}
          {detail.length > 0 && (
            <>
              <SectionStrip title="Detailed metrics" />
              <div className="divide-y divide-border/60 px-6">
                {detail.map((row) => (
                  <DetailRow key={row.label} {...row} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
