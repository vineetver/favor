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
  if (n === null) return "\u2014";
  return n.toFixed(decimals);
}

function fmtInt(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "\u2014";
  return Math.round(v).toLocaleString();
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

function ScaleBar({ value, max = 1 }: { value: number | null; max?: number }) {
  if (value === null) return null;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1 w-full rounded-full bg-muted overflow-hidden mt-1">
      <div
        className="h-full rounded-full bg-primary/60 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Single metric: label + value + optional bar */
function Metric({
  label,
  value,
  help,
  bar,
  barMax = 1,
}: {
  label: string;
  value: string | number | null | undefined;
  help?: string;
  bar?: boolean;
  barMax?: number;
}) {
  const n = num(value);
  const display = typeof value === "string" ? value : fmt(value, 4);
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        {help && <InfoTip>{help}</InfoTip>}
      </div>
      <div className="text-sm font-semibold font-mono tabular-nums text-foreground">
        {display}
      </div>
      {bar && <ScaleBar value={n} max={barMax} />}
    </div>
  );
}

/** Row in the definition-list style table */
function MetricRow({
  label,
  value,
  help,
  isEven,
}: {
  label: string;
  value: string;
  help?: string;
  isEven: boolean;
}) {
  return (
    <div
      className={cn(
        "px-6 py-3 grid grid-cols-[minmax(200px,280px)_1fr] gap-8 items-baseline",
        isEven ? "bg-transparent" : "bg-muted/30",
      )}
    >
      <dt className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {help && <InfoTip>{help}</InfoTip>}
      </dt>
      <dd className="text-sm font-mono text-foreground tabular-nums">
        {value}
      </dd>
    </div>
  );
}

/** O/E bar visualization */
function OEBar({
  label,
  oe,
  lower,
  upper,
  help,
}: {
  label: string;
  oe: number | null;
  lower: number | null;
  upper: number | null;
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
          {oe != null ? oe.toFixed(4) : "\u2014"}
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="absolute top-0 bottom-0 w-px bg-muted-foreground/30"
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
            className="absolute top-0 h-2.5 w-1.5 rounded-full bg-primary"
            style={{ left: `${toPct(oe)}%`, transform: "translateX(-50%)" }}
          />
        )}
      </div>
    </div>
  );
}

function SectionTitle({
  children,
  description,
  badge,
}: {
  children: React.ReactNode;
  description?: string;
  badge?: string;
}) {
  return (
    <div className="px-6 py-4 border-t border-border">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {children}
        </span>
        {badge && (
          <span className="text-[10px] text-muted-foreground/50">{badge}</span>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
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

  // Dosage sensitivity metrics
  const phaplo = num(posterior?.phaplo);
  const ptriplo = num(posterior?.ptriplo);
  const pHI = num(damage?.p_hi);
  const hiPredScore = num(damage?.hi_pred_score);
  const hiPred = damage?.hi_pred;
  const ghis = num(damage?.ghis);
  const hasDosage =
    phaplo !== null ||
    ptriplo !== null ||
    pHI !== null ||
    hiPredScore !== null ||
    ghis !== null;

  // pLI model
  const pLI = num(gnomad?.gnom_ad_p_li);
  const pRec = num(gnomad?.gnom_ad_p_rec);
  const pNull = num(gnomad?.gnom_ad_p_null);
  const hasLofModel = pLI !== null || pRec !== null || pNull !== null;

  // Mutational tolerance rows
  const toleranceRows: Array<{ label: string; value: string; help: string }> =
    [];
  if (damage) {
    if (num(damage.rvis_evs) !== null)
      toleranceRows.push({
        label: "RVIS (EVS)",
        value: fmt(damage.rvis_evs, 4),
        help: "Residual Variation Intolerance Score. More negative = less functional variation than expected.",
      });
    if (num(damage.rvis_percentile_evs) !== null)
      toleranceRows.push({
        label: "RVIS Percentile (EVS)",
        value: fmt(damage.rvis_percentile_evs, 4),
        help: "Percentile rank of RVIS across all genes.",
      });
    if (num(damage.rvis_ex_ac) !== null)
      toleranceRows.push({
        label: "RVIS (ExAC)",
        value: fmt(damage.rvis_ex_ac, 4),
        help: "ExAC-based RVIS using MAF filter at 0.05%.",
      });
    if (num(damage.rvis_percentile_ex_ac) !== null)
      toleranceRows.push({
        label: "RVIS Percentile (ExAC)",
        value: fmt(damage.rvis_percentile_ex_ac, 4),
        help: "Genome-wide percentile for ExAC RVIS.",
      });
    if (num(damage.lo_f_fdr_ex_ac) !== null)
      toleranceRows.push({
        label: "LoF FDR (ExAC)",
        value: fmt(damage.lo_f_fdr_ex_ac, 4),
        help: "FDR p-value for LoF variant depletion.",
      });
    if (num(damage.p_rec) !== null)
      toleranceRows.push({
        label: "P(Rec)",
        value: fmt(damage.p_rec, 4),
        help: "Probability of being a recessive disease gene.",
      });
    if (num(damage.gdi) !== null)
      toleranceRows.push({
        label: "GDI",
        value: fmt(damage.gdi, 4),
        help: "Gene Damage Index. Higher = more accumulated damage in the population.",
      });
    if (num(damage.gdi_phred) !== null)
      toleranceRows.push({
        label: "GDI (Phred)",
        value: fmt(damage.gdi_phred, 4),
        help: "Phred-scaled GDI for cross-gene comparison.",
      });
    if (num(damage.ex_ac_del_score) !== null)
      toleranceRows.push({
        label: "ExAC Del Score",
        value: fmt(damage.ex_ac_del_score, 4),
        help: "Deletion intolerance from ExAC structural variants.",
      });
    if (num(damage.ex_ac_dup_score) !== null)
      toleranceRows.push({
        label: "ExAC Dup Score",
        value: fmt(damage.ex_ac_dup_score, 4),
        help: "Duplication intolerance from ExAC structural variants.",
      });
    if (num(damage.ex_ac_cnv_score) !== null)
      toleranceRows.push({
        label: "ExAC CNV Score",
        value: fmt(damage.ex_ac_cnv_score, 4),
        help: "Combined CNV intolerance from ExAC.",
      });
  }
  if (shet) {
    const mean = num(shet.mean_s_het);
    const lo = num(shet.s_het_lower_95);
    const hi = num(shet.s_het_upper_95);
    if (mean !== null) {
      const ci =
        lo !== null && hi !== null
          ? ` (95% CI: ${lo.toFixed(4)} – ${hi.toFixed(4)})`
          : "";
      toleranceRows.push({
        label: "S(Het)",
        value: `${mean.toFixed(4)}${ci}`,
        help: "Selection coefficient against heterozygous LoF carriers.",
      });
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card
        className={cn(
          "border border-border py-0 gap-0 overflow-hidden",
          className,
        )}
      >
        <CardHeader className="border-b border-border px-6 py-4">
          <CardTitle className="text-sm font-semibold text-foreground">
            Constraints & Haploinsufficiency
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0!">
          {/* ── O/E Ratios ── */}
          {loeuf && (
            <>
              <SectionTitle
                badge="gnomAD"
                description="How many variants are observed vs. expected. Ratio below 1.0 means the gene is depleted for that variant class."
              >
                Observed / Expected Ratios
              </SectionTitle>
              <div className="px-6 py-5 space-y-4">
                <OEBar
                  label="Loss-of-Function"
                  oe={loeuf.lof_oe}
                  lower={loeuf.lof_oe_ci_lower}
                  upper={loeuf.lof_oe_ci_upper}
                  help="Observed/expected LoF variants. Band = 90% CI. Line at 1.0 = baseline."
                />
                <OEBar
                  label="Missense"
                  oe={loeuf.mis_oe}
                  lower={null}
                  upper={null}
                />
                <OEBar
                  label="Synonymous"
                  oe={loeuf.syn_oe}
                  lower={null}
                  upper={null}
                />

                <div className="grid grid-cols-3 gap-x-8 gap-y-2 pt-3 border-t border-border/60">
                  {(
                    [
                      {
                        label: "LoF",
                        obs: loeuf.lof_obs,
                        exp: loeuf.lof_exp,
                        stat: loeuf.lof_pLI,
                        statLabel: "pLI",
                      },
                      {
                        label: "Missense",
                        obs: loeuf.mis_obs,
                        exp: loeuf.mis_exp,
                        stat: loeuf.mis_z_score,
                        statLabel: "Z",
                      },
                      {
                        label: "Synonymous",
                        obs: loeuf.syn_obs,
                        exp: loeuf.syn_exp,
                        stat: loeuf.syn_z_score,
                        statLabel: "Z",
                      },
                    ] as const
                  ).map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="text-[11px] text-muted-foreground">
                        {item.label}
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-3 text-[13px]">
                        <span className="text-muted-foreground">Obs</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {fmtInt(item.obs)}
                        </span>
                        <span className="text-muted-foreground">Exp</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {item.exp != null ? item.exp.toFixed(1) : "\u2014"}
                        </span>
                        <span className="text-muted-foreground">
                          {item.statLabel}
                        </span>
                        <span className="font-mono tabular-nums text-foreground">
                          {item.stat != null ? item.stat.toFixed(4) : "\u2014"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Dosage Sensitivity ── */}
          {hasDosage && (
            <>
              <SectionTitle description="How sensitive this gene is to gaining or losing a copy. Higher scores mean the gene is less tolerant of dosage changes.">
                Dosage Sensitivity
              </SectionTitle>
              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
                  {phaplo !== null && (
                    <Metric
                      label="pHaplo"
                      value={phaplo}
                      bar
                      help="Posterior probability of haploinsufficiency. Threshold: > 0.86."
                    />
                  )}
                  {ptriplo !== null && (
                    <Metric
                      label="pTriplo"
                      value={ptriplo}
                      bar
                      help="Posterior probability of triplosensitivity. Threshold: > 0.94."
                    />
                  )}
                  {pHI !== null && (
                    <Metric
                      label="P(HI)"
                      value={pHI}
                      bar
                      help="Probability of haploinsufficiency (Huang et al. 2010)."
                    />
                  )}
                  {hiPredScore !== null && (
                    <Metric
                      label="HIPred Score"
                      value={hiPredScore}
                      bar
                      help="ML haploinsufficiency score (Shihab et al. 2017)."
                    />
                  )}
                  {hiPred != null && hiPred !== "" && (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">
                          HIPred
                        </span>
                        <InfoTip>Binary call from the HIPred model.</InfoTip>
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {/^(Y|Yes|true)$/i.test(hiPred) ? "Yes" : "No"}
                      </div>
                    </div>
                  )}
                  {ghis !== null && (
                    <Metric
                      label="GHIS"
                      value={ghis}
                      bar
                      help="Gene Haploinsufficiency Score. Higher = more likely haploinsufficient."
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── LoF Intolerance Model ── */}
          {hasLofModel && (
            <>
              <SectionTitle
                badge="gnomAD 2.1"
                description="Probabilistic model for how this gene responds to loss-of-function variants. High pLI means the gene is intolerant to LoF."
              >
                LoF Intolerance Model
              </SectionTitle>
              <div className="px-6 py-5">
                <div className="grid grid-cols-3 gap-x-8">
                  <Metric
                    label="pLI"
                    value={pLI}
                    bar
                    help="Probability gene cannot tolerate any LoF. Threshold: > 0.9."
                  />
                  <Metric
                    label="pRec"
                    value={pRec}
                    bar
                    help="Probability gene tolerates het LoF but not hom LoF."
                  />
                  <Metric
                    label="pNull"
                    value={pNull}
                    bar
                    help="Probability gene tolerates LoF without major fitness effect."
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Mutational Tolerance ── */}
          {toleranceRows.length > 0 && (
            <>
              <SectionTitle description="Population-level measures of how much functional variation this gene tolerates.">
                Mutational Tolerance & Selection
              </SectionTitle>
              <dl>
                {toleranceRows.map((row, i) => (
                  <MetricRow
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    help={row.help}
                    isEven={i % 2 === 0}
                  />
                ))}
              </dl>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
