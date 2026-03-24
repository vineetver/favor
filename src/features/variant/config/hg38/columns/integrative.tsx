import type { Variant } from "@features/variant/types";
import {
  cell,
  createColumns,
  type DerivedColumn,
  tooltip,
} from "@infra/table/column-builder";
import type { ReactNode } from "react";
import { apcColumns } from "./shared";

// ============================================================================
// Percentile Derived Column
// ============================================================================

/**
 * Calculate percentile from PHRED score: 10^(score * -0.1) * 100
 * Higher scores = lower percentiles = greater significance.
 */
function calculatePercentile(score: unknown, _id?: string): number | null {
  if (score === null || score === undefined) return null;
  const num = typeof score === "number" ? score : parseFloat(String(score));
  if (Number.isNaN(num)) return null;
  return 10 ** (num * -0.1) * 100;
}

const PERCENTILE_TOOLTIP: ReactNode = (
  <div className="space-y-2">
    <p className="text-sm">
      Score transformed to percentile: 10^(score × -0.1) × 100
    </p>
    <p className="text-sm">Lower percentile = higher significance.</p>
  </div>
);

const percentileColumn: DerivedColumn = {
  header: "Percentile",
  headerTooltip: PERCENTILE_TOOLTIP,
  derive: calculatePercentile,
  render: (value) => {
    if (value === null) return "—";
    const pct = Math.min(value as number, 100);

    // Color based on significance (lower = more significant = red, higher = less significant = blue)
    const getColor = (percentile: number) => {
      if (percentile < 1) return "bg-red-500";
      if (percentile < 5) return "bg-orange-500";
      if (percentile < 10) return "bg-amber-500";
      return "bg-blue-500";
    };

    return (
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-medium tabular-nums text-foreground">
          {pct.toFixed(2)}%
        </span>
        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getColor(pct)}`}
            style={{ width: `${100 - pct}%` }}
          />
        </div>
      </div>
    );
  },
};

const col = createColumns<Variant>();

export const integrativeColumns = [
  apcColumns.proteinFunction,
  apcColumns.conservation,
  apcColumns.epigeneticsActive,
  apcColumns.epigeneticsRepressed,
  apcColumns.epigeneticsTranscription,

  col.accessor("apc_local_nucleotide_diversity_v3", {
    accessor: (row) => row.apc?.local_nucleotide_diversity_v3,
    header: "aPC-Local Nucleotide Diversity",
    description: tooltip({
      title: "aPC-Local Nucleotide Diversity",
      description:
        "Integrative score combining local genetic diversity measures (background selection statistic, recombination rate, nucleotide diversity) into a single PHRED-scaled score. Reflects evolutionary and recombination patterns.",
      range: "[0, 86.238]",
      citation: "Li et al., 2020",
      guides: [
        {
          threshold: "Higher scores (>10)",
          meaning: "Higher local genetic diversity",
        },
        { threshold: "Lower scores", meaning: "Lower local genetic diversity" },
      ],
    }),
    cell: cell.decimal(6),
  }),

  col.accessor("apc_mutation_density", {
    accessor: (row) => row.apc?.mutation_density,
    header: "aPC-Mutation Density",
    description: tooltip({
      title: "aPC-Mutation Density",
      description:
        "Integrative score combining mutation densities at different scales (100bp, 1kb, 10kb windows) for common, rare, and singleton variants into a single PHRED-scaled score. Reflects mutational burden in genomic region.",
      range: "[0, 84.477]",
      citation: "Li et al., 2020",
      guides: [
        {
          threshold: "Higher scores (>10)",
          meaning: "Higher local mutation density",
        },
        { threshold: "Lower scores", meaning: "Lower local mutation density" },
      ],
    }),
    cell: cell.decimal(6),
  }),

  apcColumns.transcriptionFactor,

  col.accessor("apc_mappability", {
    accessor: (row) => row.apc?.mappability,
    header: "aPC-Mappability",
    description: tooltip({
      title: "aPC-Mappability",
      description:
        "Integrative score combining sequence mappability measures at different read lengths (k=24, 36, 50, 100) for unique and multi-mapping reads into a single PHRED-scaled score. Affects sequencing read alignment quality.",
      range: "[0.007, 22.966]",
      citation: "Li et al., 2020",
      guides: [
        {
          threshold: "Higher scores (>10)",
          meaning: "Better sequence mappability",
        },
        { threshold: "Lower scores", meaning: "Poorer sequence mappability" },
      ],
    }),
    cell: cell.decimal(6),
  }),

  col.accessor("cadd_phred", {
    accessor: (row) => row.main?.cadd?.phred,
    header: "CADD phred",
    description: tooltip({
      title: "CADD PHRED",
      description:
        "The CADD score in PHRED scale (integrative score). A higher CADD score indicates more deleterious.",
      range: "[0.001, 84]",
      citation: "Kircher et al., 2014; Rentzsch et al., 2018",
      guides: [
        {
          threshold: "Higher scores (>10)",
          meaning: "More likely deleterious",
        },
        { threshold: "Lower scores", meaning: "More likely benign" },
      ],
    }),
    cell: cell.decimal(6),
  }),

  col.accessor("linsight", {
    accessor: (row) => row.linsight,
    header: "LINSIGHT",
    description: tooltip({
      title: "LINSIGHT",
      description:
        "The LINSIGHT score (integrative score). A higher LINSIGHT score indicates more functionality.",
      range: "[0.033, 0.995]",
      citation: "Huang et al., 2017",
      guides: [
        {
          threshold: "Higher scores (>0.5)",
          meaning: "More likely functional",
        },
        { threshold: "Lower scores", meaning: "Less likely functional" },
      ],
    }),
    cell: cell.decimal(6),
  }),

  col.accessor("fathmm_xf", {
    accessor: (row) => row.fathmm_xf,
    header: "Fathmm XF",
    description: tooltip({
      title: "FATHMM-XF",
      description:
        "The FATHMM-XF score for coding variants (integrative score). A higher FATHMM-XF score indicates more functionality.",
      range: "[0.001, 0.999]",
      citation: "Rogers et al., 2017",
      guides: [
        {
          threshold: "Higher scores (>0.5)",
          meaning: "More likely functional",
        },
        { threshold: "Lower scores", meaning: "Less likely functional" },
      ],
    }),
    cell: cell.decimal(6),
  }),
];

export const integrativeGroup = col.group(
  "integrative",
  "Integrative",
  integrativeColumns,
  {
    derivedColumn: percentileColumn,
    defaultSort: { column: "derived", direction: "asc" },
    view: {
      format: "transposed",
      search: true,
      export: true,
    },
  },
);
