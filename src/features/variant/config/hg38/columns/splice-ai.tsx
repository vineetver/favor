import type { Variant } from "@/features/variant/types";
import { createColumns, cell, tooltip } from "@/lib/table/column-builder";

const col = createColumns<Variant>();

export const spliceAiColumns = [
  // Pangolin scores
  col.accessor("pangolin_largest_ds_exome", {
    accessor: "pangolin_largest_ds_exome",
    header: "Pangolin (Exome)",
    description: tooltip({
      title: "Pangolin (Exome)",
      description: "Pangolin's largest delta score across splicing consequences using exome training data. Reflects probability of variant affecting splicing.",
      range: "[0, 1]",
      guides: [
        { threshold: "Higher scores (≥0.2)", meaning: "More likely splice-altering" },
        { threshold: "Lower scores (<0.1)", meaning: "Less likely splice-altering" },
        { threshold: "Model type", meaning: "Deep learning on exome sequencing data" },
      ],
    }),
    cell: cell.percent(),
  }),

  col.accessor("pangolin_largest_ds_genome", {
    accessor: "pangolin_largest_ds_genome",
    header: "Pangolin (Genome)",
    description: tooltip({
      title: "Pangolin (Genome)",
      description: "Pangolin's largest delta score across splicing consequences using genome-wide training data. Reflects probability of variant affecting splicing.",
      range: "[0, 1]",
      guides: [
        { threshold: "Higher scores (≥0.2)", meaning: "More likely splice-altering" },
        { threshold: "Lower scores (<0.1)", meaning: "Less likely splice-altering" },
        { threshold: "Model type", meaning: "Deep learning on whole genome data" },
      ],
    }),
    cell: cell.percent(),
  }),

  // SpliceAI scores
  col.accessor("spliceai_ds_max_exome", {
    accessor: "spliceai_ds_max_exome",
    header: "SpliceAI (Exome)",
    description: tooltip({
      title: "SpliceAI (Exome)",
      description: "Illumina's SpliceAI maximum delta score using exome training data. Interpreted as probability of splice-altering effects.",
      range: "[0, 1]",
      guides: [
        { threshold: "Higher scores (≥0.5)", meaning: "High confidence splice-altering" },
        { threshold: "Medium scores (0.2-0.5)", meaning: "Moderate splice-altering potential" },
        { threshold: "Lower scores (<0.2)", meaning: "Unlikely to affect splicing" },
      ],
    }),
    cell: cell.percent(),
  }),

  col.accessor("spliceai_ds_max_genome", {
    accessor: "spliceai_ds_max_genome",
    header: "SpliceAI (Genome)",
    description: tooltip({
      title: "SpliceAI (Genome)",
      description: "Illumina's SpliceAI maximum delta score using genome-wide training data. Interpreted as probability of splice-altering effects.",
      range: "[0, 1]",
      guides: [
        { threshold: "Higher scores (≥0.5)", meaning: "High confidence splice-altering" },
        { threshold: "Medium scores (0.2-0.5)", meaning: "Moderate splice-altering potential" },
        { threshold: "Lower scores (<0.2)", meaning: "Unlikely to affect splicing" },
      ],
    }),
    cell: cell.percent(),
  }),
];

export const spliceAiGroup = col.group(
  "splice-ai",
  "Splice-AI",
  spliceAiColumns
);
