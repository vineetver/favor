"use client";

import { createColumns, tooltip } from "@infra/table/column-builder";
import { DataSurface } from "@shared/components/ui/data-surface";
import { ExternalLink } from "@shared/components/ui/external-link";

// ============================================================================
// Row type — matches the Signal shape from fetchVariantSignals
// ============================================================================

export interface CredibleSetRow {
  id: string;
  signalId: string;
  studyId: string;
  studyType: string;
  studyTypeLabel: string;
  reportedTrait: string | null;
  methodName: string | null;
  numCredible95: number | null;
  numVariants: number | null;
  region: string | null;
  logBayesFactor: number | null;
  posteriorProbability: number | null;
  confidence: string | null;
  isLead: boolean;
}

// ============================================================================
// Columns
// ============================================================================

const col = createColumns<CredibleSetRow>();

/** PIP formatted to 3 decimals with a colored bar for visual scan */
function pipCell(pip: number | null) {
  if (pip == null) return <span className="text-muted-foreground">-</span>;
  const pct = Math.round(pip * 100);
  const strong = pip >= 0.95;
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
        <div
          className={strong ? "h-full bg-rose-500" : "h-full bg-amber-500"}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-foreground">
        {pip.toFixed(3)}
      </span>
    </div>
  );
}

const credibleSetsColumns = [
  // 1. Trait — biological meaning. Lead rows get a subtle ★ prefix so we
  //    can drop the standalone Lead column entirely.
  col.display("reportedTrait", {
    header: "Trait",
    description: tooltip({
      title: "Reported Trait",
      description:
        "Trait or phenotype from the underlying GWAS study. A ★ marks rows where this variant is the lead (top) variant in the credible set. QTL-typed signals may not have a human-readable trait.",
    }),
    cell: ({ row }) => {
      const t = row.original.reportedTrait;
      const isLead = row.original.isLead;
      const display = t
        ? t.length > 52
          ? `${t.slice(0, 52)}…`
          : t
        : null;
      return (
        <div className="flex items-center gap-1.5 min-w-0">
          {isLead && (
            <span
              className="text-rose-500 text-xs leading-none shrink-0"
              title="Lead variant in this credible set"
              aria-label="Lead variant"
            >
              ★
            </span>
          )}
          {display && (
            <span
              className="text-foreground truncate"
              title={t ?? undefined}
            >
              {display}
            </span>
          )}
        </div>
      );
    },
  }),

  // 2. Study type — GWAS / eQTL / pQTL / etc.
  col.display("studyTypeLabel", {
    header: "Type",
    description: tooltip({
      title: "Underlying Study Type",
      description:
        "Type of underlying analysis — GWAS, eQTL, pQTL, sQTL, tuQTL, or single-cell eQTL.",
    }),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.studyTypeLabel}
      </span>
    ),
  }),

  // 3. PIP — probability this variant is causal in the set
  col.display("posteriorProbability", {
    header: "PIP",
    description: tooltip({
      title: "Posterior Inclusion Probability",
      description:
        "Probability that this variant is the causal variant within the credible set. PIP ≥ 0.95 marks a confident inclusion.",
    }),
    cell: ({ row }) => pipCell(row.original.posteriorProbability),
  }),

  // 4. Credible set size — number of variants in the 95% credible set.
  //    A value of 1 = unambiguously fine-mapped to this variant.
  col.display("numCredible95", {
    header: "Set size",
    description: tooltip({
      title: "95% credible set size",
      description:
        "Number of variants in the 95% credible set. 1 = the variant is unambiguously fine-mapped; larger sets mean the causal variant could be any of several candidates.",
    }),
    cell: ({ row }) => {
      const cs = row.original.numCredible95;
      if (cs == null) return null;
      return (
        <span className="font-mono text-sm tabular-nums text-foreground">
          {cs.toLocaleString()}
        </span>
      );
    },
  }),

  // 5. Method — SuSiE / PICS
  col.display("methodName", {
    header: "Method",
    description: tooltip({
      title: "Fine-mapping Method",
      description:
        "Method used to produce the credible set (SuSiE, SuSiE-inf, or PICS).",
    }),
    cell: ({ row }) => {
      const m = row.original.methodName;
      if (!m) return <span className="text-muted-foreground">—</span>;
      return <span className="text-xs text-foreground">{m}</span>;
    },
  }),

  // 6. Study — which specific study (GCST linkout)
  col.display("studyId", {
    header: "Study",
    description: tooltip({
      title: "Underlying Study",
      description: "Study accession. Links to GWAS Catalog for GCST… IDs.",
    }),
    cell: ({ row }) => {
      const s = row.original.studyId;
      if (!s) return <span className="text-muted-foreground">—</span>;
      if (s.startsWith("GCST")) {
        return (
          <ExternalLink
            href={`https://www.ebi.ac.uk/gwas/studies/${s}`}
            className="font-mono text-xs"
          >
            {s}
          </ExternalLink>
        );
      }
      return (
        <span className="font-mono text-xs text-muted-foreground">{s}</span>
      );
    },
  }),

  // 7. Region — locus
  col.display("region", {
    header: "Region",
    description: tooltip({
      title: "Locus Region",
      description: "Genomic region of the credible set (chr:start-end).",
    }),
    cell: ({ row }) => {
      const r = row.original.region;
      if (!r) return <span className="text-muted-foreground">—</span>;
      return <span className="font-mono text-xs text-muted-foreground">{r}</span>;
    },
  }),

  // 8. log BF — technical / Bayesian evidence strength
  col.display("logBayesFactor", {
    header: "log BF",
    description: tooltip({
      title: "log Bayes Factor",
      description:
        "log₁₀ Bayes factor for the credible set. Higher = stronger evidence for a causal signal at this locus.",
    }),
    cell: ({ row }) => {
      const v = row.original.logBayesFactor;
      if (v == null) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="font-mono text-sm tabular-nums">{v.toFixed(1)}</span>
      );
    },
  }),

];

// ============================================================================
// Component
// ============================================================================

interface CredibleSetsTableProps {
  data: CredibleSetRow[];
}

export function CredibleSetsTable({ data }: CredibleSetsTableProps) {
  return (
    <DataSurface
      data={data}
      columns={credibleSetsColumns}
      title="Fine-mapped credible sets"
      subtitle={`${data.length.toLocaleString()} credible set memberships via SIGNAL_HAS_VARIANT (SuSiE / PICS from OpenTargets)`}
      searchPlaceholder="Search traits, studies, regions..."
      searchColumn="reportedTrait"
      exportable
      exportFilename="credible-sets"
      defaultPageSize={10}
      emptyMessage="No fine-mapped credible sets found for this variant"
    />
  );
}
