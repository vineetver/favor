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
// Shared Atoms
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
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-primary/60 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Definition-list row matching CategoryDetailView pattern */
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
        "group relative px-6 py-3.5 transition-all duration-150 ease-out hover:bg-accent/50",
        isEven ? "bg-transparent" : "bg-muted/40",
      )}
    >
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-primary/60 rounded-r-lg transition-all duration-150 group-hover:h-6" />
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(200px,280px)_1fr] gap-3 sm:gap-8 items-baseline">
        <dt className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground leading-tight">{label}</span>
          {help && <InfoTip>{help}</InfoTip>}
        </dt>
        <dd className="text-sm font-mono text-foreground tabular-nums tracking-tight">
          {value}
        </dd>
      </div>
    </div>
  );
}

/** O/E bar with optional CI */
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
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {help && <InfoTip>{help}</InfoTip>}
        </div>
        <span className="text-sm font-mono text-foreground tabular-nums">
          {oe != null ? oe.toFixed(4) : "\u2014"}
        </span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
        <div className="absolute top-0 bottom-0 w-px bg-muted-foreground/40 z-10" style={{ left: `${toPct(1)}%` }} />
        {lower != null && upper != null && (
          <div
            className="absolute top-0.5 bottom-0.5 rounded-full bg-primary/50"
            style={{ left: `${toPct(lower)}%`, width: `${Math.max(1, toPct(upper) - toPct(lower))}%` }}
          />
        )}
        {oe != null && (
          <div
            className="absolute top-0 h-3 w-1.5 rounded-full bg-primary"
            style={{ left: `${toPct(oe)}%`, transform: "translateX(-50%)" }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/60 tabular-nums select-none">
        <span>0</span>
        <span>1.0</span>
        <span>2.0</span>
      </div>
    </div>
  );
}

// ============================================================================
// 1 — LOEUF
// ============================================================================

function LoeufSection({ loeuf }: { loeuf: Gene["constraint_scores"]["loeuf"] }) {
  if (!loeuf) return null;

  return (
    <Card className="border border-border py-0 gap-0">
      <CardHeader className="border-b border-border px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold text-foreground">
            Observed / Expected Ratios (LOEUF)
          </CardTitle>
          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
            gnomAD
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-6 py-5! space-y-5">
        <div className="space-y-4">
          <OEBar
            label="Loss-of-Function"
            oe={loeuf.lof_oe}
            lower={loeuf.lof_oe_ci_lower}
            upper={loeuf.lof_oe_ci_upper}
            help="Observed / expected ratio for LoF variants. Shaded band = 90% CI. Line at 1.0 = baseline."
          />
          <OEBar label="Missense" oe={loeuf.mis_oe} lower={null} upper={null} />
          <OEBar label="Synonymous" oe={loeuf.syn_oe} lower={null} upper={null} />
        </div>

        {/* Counts grid */}
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: "Loss-of-Function", obs: loeuf.lof_obs, exp: loeuf.lof_exp, stat: loeuf.lof_pLI, statLabel: "pLI" },
              { label: "Missense", obs: loeuf.mis_obs, exp: loeuf.mis_exp, stat: loeuf.mis_z_score, statLabel: "Z" },
              { label: "Synonymous", obs: loeuf.syn_obs, exp: loeuf.syn_exp, stat: loeuf.syn_z_score, statLabel: "Z" },
            ] as const).map((item) => (
              <div key={item.label} className="rounded-lg bg-muted/50 p-3.5 space-y-2">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</div>
                <div className="grid grid-cols-2 gap-y-1 text-[13px]">
                  <span className="text-muted-foreground">Obs</span>
                  <span className="font-mono tabular-nums text-foreground text-right">{fmtInt(item.obs)}</span>
                  <span className="text-muted-foreground">Exp</span>
                  <span className="font-mono tabular-nums text-foreground text-right">{item.exp != null ? item.exp.toFixed(1) : "\u2014"}</span>
                  <span className="text-muted-foreground">{item.statLabel}</span>
                  <span className="font-mono tabular-nums text-foreground text-right">{item.stat != null ? item.stat.toFixed(4) : "\u2014"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

// ============================================================================
// 3 — Dosage Sensitivity
// ============================================================================

/** Small score tile used inside grids */
function ScoreTile({
  label,
  value,
  help,
  showBar = false,
  barMax = 1,
}: {
  label: string;
  value: string | number | null | undefined;
  help?: string;
  showBar?: boolean;
  barMax?: number;
}) {
  const n = num(value);
  const display = fmt(value, 4);
  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {help && <InfoTip>{help}</InfoTip>}
      </div>
      <div className="text-lg font-semibold font-mono tabular-nums tracking-tight text-foreground">
        {display}
      </div>
      {showBar && <ScaleBar value={n} max={barMax} />}
    </div>
  );
}

function DosageSensitivitySection({
  posterior,
  damage,
}: {
  posterior: Gene["constraint_scores"]["posterior"];
  damage: Gene["constraint_scores"]["damage"];
}) {
  const phaplo = num(posterior?.phaplo);
  const ptriplo = num(posterior?.ptriplo);
  const pHI = num(damage?.p_hi);
  const hiPredScore = num(damage?.hi_pred_score);
  const hiPred = damage?.hi_pred;
  const ghis = num(damage?.ghis);

  const hasData = phaplo !== null || ptriplo !== null || pHI !== null || hiPredScore !== null || ghis !== null;
  if (!hasData) return null;

  return (
    <Card className="border border-border py-0 gap-0">
      <CardHeader className="border-b border-border px-6 py-5">
        <CardTitle className="text-sm font-semibold text-foreground">
          Dosage Sensitivity
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 py-5!">
        {/* Primary pair */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {phaplo !== null && (
            <ScoreTile
              label="pHaplo"
              value={phaplo}
              showBar
              help="Posterior probability of haploinsufficiency — sensitivity to losing one gene copy. Range 0–1. Published threshold: > 0.86 (Collins et al. 2022, Cell)."
            />
          )}
          {ptriplo !== null && (
            <ScoreTile
              label="pTriplo"
              value={ptriplo}
              showBar
              help="Posterior probability of triplosensitivity — sensitivity to gaining an extra gene copy. Range 0–1. Published threshold: > 0.94 (Collins et al. 2022, Cell)."
            />
          )}
        </div>

        {/* Secondary scores */}
        {(pHI !== null || hiPredScore !== null || hiPred || ghis !== null) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {pHI !== null && (
              <ScoreTile label="P(HI)" value={pHI} showBar help="Probability of haploinsufficiency (Huang et al. 2010). Range 0–1." />
            )}
            {hiPredScore !== null && (
              <ScoreTile label="HIPred Score" value={hiPredScore} showBar help="Machine-learning haploinsufficiency score (Shihab et al. 2017). Range 0–1." />
            )}
            {hiPred != null && hiPred !== "" && (
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    HIPred
                  </span>
                  <InfoTip>Binary call from the HIPred model (Shihab et al. 2017).</InfoTip>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                    /^(Y|Yes|true)$/i.test(hiPred)
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {/^(Y|Yes|true)$/i.test(hiPred) ? "Yes" : "No"}
                </span>
              </div>
            )}
            {ghis !== null && (
              <ScoreTile label="GHIS" value={ghis} showBar help="Gene Haploinsufficiency Score (Steinberg et al. 2015). Higher = more likely haploinsufficient." />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 4 — LoF Intolerance Model (pLI / pRec / pNull)
// ============================================================================

function LofIntoleranceSection({ gnomad }: { gnomad: Gene["constraint_scores"]["gnomad"] }) {
  const pLI = num(gnomad?.gnom_ad_p_li);
  const pRec = num(gnomad?.gnom_ad_p_rec);
  const pNull = num(gnomad?.gnom_ad_p_null);

  const hasData = pLI !== null || pRec !== null || pNull !== null;
  if (!hasData) return null;

  return (
    <Card className="border border-border py-0 gap-0">
      <CardHeader className="border-b border-border px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold text-foreground">
            LoF Intolerance Model
          </CardTitle>
          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
            gnomAD 2.1
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-6 py-5!">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ScoreTile
            label="pLI"
            value={pLI}
            showBar
            help="Probability this gene cannot tolerate any LoF variants. Commonly used threshold: > 0.9 (Lek et al. 2016, Nature)."
          />
          <ScoreTile
            label="pRec"
            value={pRec}
            showBar
            help="Probability this gene tolerates heterozygous LoF but not homozygous LoF (recessive pattern)."
          />
          <ScoreTile
            label="pNull"
            value={pNull}
            showBar
            help="Probability this gene tolerates LoF variants without major fitness effect."
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 5 — Mutational Tolerance & Selection
// ============================================================================

function MutationalToleranceSection({
  damage,
  shet,
}: {
  damage: Gene["constraint_scores"]["damage"];
  shet: Gene["constraint_scores"]["shet"];
}) {
  const rows: Array<{ label: string; value: string; help: string }> = [];

  if (damage) {
    if (num(damage.rvis_evs) !== null)
      rows.push({ label: "RVIS (EVS)", value: fmt(damage.rvis_evs, 4), help: "Residual Variation Intolerance Score (EVS). More negative = less functional variation than expected. Petrovski et al. 2013." });
    if (num(damage.rvis_percentile_evs) !== null)
      rows.push({ label: "RVIS Percentile (EVS)", value: fmt(damage.rvis_percentile_evs, 4), help: "Percentile rank of RVIS across all genes (EVS data)." });
    if (num(damage.rvis_ex_ac) !== null)
      rows.push({ label: "RVIS (ExAC)", value: fmt(damage.rvis_ex_ac, 4), help: "ExAC-based RVIS, using MAF filter at 0.05% across ethnic strata." });
    if (num(damage.rvis_percentile_ex_ac) !== null)
      rows.push({ label: "RVIS Percentile (ExAC)", value: fmt(damage.rvis_percentile_ex_ac, 4), help: "Genome-wide percentile for ExAC RVIS." });
    if (num(damage.lo_f_fdr_ex_ac) !== null)
      rows.push({ label: "LoF FDR (ExAC)", value: fmt(damage.lo_f_fdr_ex_ac, 4), help: "FDR p-value for LoF variant depletion. Smaller = more depleted than expected." });
    if (num(damage.p_rec) !== null)
      rows.push({ label: "P(Rec)", value: fmt(damage.p_rec, 4), help: "Probability of being a recessive disease gene (Blekhman et al. 2008)." });
    if (num(damage.gdi) !== null)
      rows.push({ label: "GDI", value: fmt(damage.gdi, 4), help: "Gene Damage Index. Higher = more accumulated damage in the population (Itan et al. 2015)." });
    if (num(damage.gdi_phred) !== null)
      rows.push({ label: "GDI (Phred)", value: fmt(damage.gdi_phred, 4), help: "Phred-scaled GDI for easier cross-gene comparison." });
    if (num(damage.ex_ac_del_score) !== null)
      rows.push({ label: "ExAC Del Score", value: fmt(damage.ex_ac_del_score, 4), help: "Deletion intolerance score from ExAC structural variant data." });
    if (num(damage.ex_ac_dup_score) !== null)
      rows.push({ label: "ExAC Dup Score", value: fmt(damage.ex_ac_dup_score, 4), help: "Duplication intolerance score from ExAC structural variant data." });
    if (num(damage.ex_ac_cnv_score) !== null)
      rows.push({ label: "ExAC CNV Score", value: fmt(damage.ex_ac_cnv_score, 4), help: "Combined CNV intolerance score from ExAC." });
  }

  if (shet) {
    const mean = num(shet.mean_s_het);
    const lo = num(shet.s_het_lower_95);
    const hi = num(shet.s_het_upper_95);
    if (mean !== null) {
      const ci = lo !== null && hi !== null ? ` (95% CI: ${lo.toFixed(4)} – ${hi.toFixed(4)})` : "";
      rows.push({ label: "S(Het)", value: `${mean.toFixed(4)}${ci}`, help: "Selection coefficient against heterozygous LoF carriers. Larger = stronger selection (Weghorn et al. 2019)." });
    }
  }

  if (rows.length === 0) return null;

  return (
    <Card className="border border-border py-0 gap-0">
      <CardHeader className="border-b border-border px-6 py-5">
        <CardTitle className="text-sm font-semibold text-foreground">
          Mutational Tolerance &amp; Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0!">
        <dl className="overflow-hidden">
          {rows.map((row, i) => (
            <MetricRow key={row.label} label={row.label} value={row.value} help={row.help} isEven={i % 2 === 0} />
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main
// ============================================================================

export function ConstraintsOverview({ gene, className }: ConstraintsOverviewProps) {
  const { loeuf, posterior, shet, damage, gnomad } = gene.constraint_scores ?? {};

  const hasAnyData = loeuf || posterior || shet || damage || gnomad;

  if (!hasAnyData) {
    return (
      <NoDataState
        categoryName="Constraints & Haploinsufficiency"
        description="No constraint or haploinsufficiency data is available for this gene."
      />
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      {loeuf && <LoeufSection loeuf={loeuf} />}
      {(posterior || damage) && (
        <DosageSensitivitySection posterior={posterior} damage={damage} />
      )}
      {gnomad && <LofIntoleranceSection gnomad={gnomad} />}
      {(damage || shet) && (
        <MutationalToleranceSection damage={damage} shet={shet} />
      )}
    </div>
  );
}
