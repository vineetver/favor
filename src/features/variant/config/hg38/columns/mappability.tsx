import type { Variant } from "@/features/variant/types";
import { cell, createColumns, tooltip } from "@/infrastructure/table/column-builder";
import { apcColumns } from "./shared";

const col = createColumns<Variant>();

export const mappabilityColumns = [
  apcColumns.mappability,

  // 100bp read length
  col.accessor("k100_umap", {
    accessor: (row) => row.mappability?.k100?.umap,
    header: "Umap k100",
    description: tooltip({
      title: "Umap k100",
      description:
        "Mappability of unconverted genome using 100bp reads. Measures the extent to which a position can be uniquely mapped by sequence reads.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Karimzadeh et al., 2018",
      guides: [
        {
          threshold: "High mappability (≥0.8)",
          meaning: "Unique, reliable mapping region",
        },
        {
          threshold: "Low mappability (<0.5)",
          meaning: "Repetitive regions, unreliable estimates",
        },
        {
          threshold: "Technical impact",
          meaning: "Lower values increase susceptibility to spurious mapping",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("k100_bismap", {
    accessor: (row) => row.mappability?.k100?.bismap,
    header: "Bismap k100",
    description: tooltip({
      title: "Bismap k100",
      description:
        "Mappability of the bisulfite-converted genome using 100bp reads. Identifies unique mapping regions for bisulfite sequencing, which introduces complexity due to C-to-T conversion.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Karimzadeh et al., 2018",
      guides: [
        {
          threshold: "High mappability (≥0.8)",
          meaning: "Reliable for methylation analysis",
        },
        {
          threshold: "Low mappability (<0.5)",
          meaning: "Ambiguous methylation calls, multi-mapping reads",
        },
        {
          threshold: "Bisulfite context",
          meaning: "C-to-T conversion reduces sequence complexity",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  // 50bp read length
  col.accessor("k50_umap", {
    accessor: (row) => row.mappability?.k50?.umap,
    header: "Umap k50",
    description: tooltip({
      title: "Umap k50",
      description:
        "Mappability of unconverted genome using 50bp reads. Measures the extent to which a position can be uniquely mapped by sequence reads.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Karimzadeh et al., 2018",
      guides: [
        {
          threshold: "High mappability (≥0.8)",
          meaning: "Unique, reliable mapping region",
        },
        {
          threshold: "Low mappability (<0.5)",
          meaning: "Repetitive regions, unreliable estimates",
        },
        {
          threshold: "Read length impact",
          meaning:
            "Shorter reads (50bp) have lower mappability than longer reads",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("k50_bismap", {
    accessor: (row) => row.mappability?.k50?.bismap,
    header: "Bismap k50",
    description: tooltip({
      title: "Bismap k50",
      description:
        "Mappability of the bisulfite-converted genome using 50bp reads. Identifies unique mapping regions for bisulfite sequencing, which introduces complexity due to C-to-T conversion.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Karimzadeh et al., 2018",
      guides: [
        {
          threshold: "High mappability (≥0.8)",
          meaning: "Reliable for methylation analysis",
        },
        {
          threshold: "Low mappability (<0.5)",
          meaning: "Ambiguous methylation calls, multi-mapping reads",
        },
        {
          threshold: "Combined effects",
          meaning:
            "Both shorter reads and bisulfite conversion reduce mappability",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  // 36bp read length
  col.accessor("k36_umap", {
    accessor: (row) => row.mappability?.k36?.umap,
    header: "Umap k36",
    description: tooltip({
      title: "Umap k36",
      description:
        "Mappability of unconverted genome using 36bp reads. Measures the extent to which a position can be uniquely mapped by sequence reads.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Karimzadeh et al., 2018",
      guides: [
        {
          threshold: "High mappability (≥0.8)",
          meaning: "Unique, reliable mapping region",
        },
        {
          threshold: "Low mappability (<0.5)",
          meaning: "Repetitive regions, unreliable estimates",
        },
        {
          threshold: "Short reads",
          meaning: "36bp reads have more mapping ambiguity than longer reads",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("k36_bismap", {
    accessor: (row) => row.mappability?.k36?.bismap,
    header: "Bismap k36",
    description: tooltip({
      title: "Bismap k36",
      description:
        "Mappability of the bisulfite-converted genome using 36bp reads. Identifies unique mapping regions for bisulfite sequencing, which introduces complexity due to C-to-T conversion.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Karimzadeh et al., 2018",
      guides: [
        {
          threshold: "High mappability (≥0.8)",
          meaning: "Reliable for methylation analysis",
        },
        {
          threshold: "Low mappability (<0.5)",
          meaning: "Ambiguous methylation calls, multi-mapping reads",
        },
        {
          threshold: "High complexity",
          meaning: "Shortest read length with bisulfite conversion challenges",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  // 24bp read length
  col.accessor("k24_umap", {
    accessor: (row) => row.mappability?.k24?.umap,
    header: "Umap k24",
    description: tooltip({
      title: "Umap k24",
      description:
        "Mappability of unconverted genome using 24bp reads. Measures the extent to which a position can be uniquely mapped by sequence reads.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Karimzadeh et al., 2018",
      guides: [
        {
          threshold: "High mappability (≥0.8)",
          meaning: "Unique, reliable mapping region",
        },
        {
          threshold: "Low mappability (<0.5)",
          meaning: "Repetitive regions, unreliable estimates",
        },
        {
          threshold: "Shortest reads",
          meaning: "24bp reads have highest mapping ambiguity",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("k24_bismap", {
    accessor: (row) => row.mappability?.k24?.bismap,
    header: "Bismap k24",
    description: tooltip({
      title: "Bismap k24",
      description:
        "Mappability of the bisulfite-converted genome using 24bp reads. Identifies unique mapping regions for bisulfite sequencing, which introduces complexity due to C-to-T conversion.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Karimzadeh et al., 2018",
      guides: [
        {
          threshold: "High mappability (≥0.8)",
          meaning: "Reliable for methylation analysis",
        },
        {
          threshold: "Low mappability (<0.5)",
          meaning: "Ambiguous methylation calls, multi-mapping reads",
        },
        {
          threshold: "Maximum complexity",
          meaning: "Shortest reads with maximum bisulfite mapping challenges",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),
];

export const mappabilityGroup = col.group(
  "mappability",
  "Mappability",
  mappabilityColumns,
);
