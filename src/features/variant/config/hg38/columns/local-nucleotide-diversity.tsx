import type { Variant } from "@/features/variant/types";
import { cell, createColumns, tooltip } from "@/infrastructure/table/column-builder";
import { apcColumns } from "./shared";

const col = createColumns<Variant>();

export const localNucleotideDiversityColumns = [
  apcColumns.localNucleotideDiversity,

  col.accessor("recombination_rate", {
    accessor: (row) => row.recombination_rate,
    header: "Recombination Rate",
    description: tooltip({
      title: "Recombination Rate",
      description:
        "Local recombination rate per base pair, indicating how frequently genetic recombination occurs in this genomic region during meiosis.",
      range: "cM/Mb",
      guides: [
        {
          threshold: "Higher rates (>2 cM/Mb)",
          meaning: "Recombination hotspots, higher genetic diversity",
        },
        {
          threshold: "Lower rates (<0.5 cM/Mb)",
          meaning: "Recombination coldspots, lower diversity",
        },
        {
          threshold: "Biological significance",
          meaning: "Affects linkage disequilibrium and population genetics",
        },
      ],
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("nucdiv", {
    accessor: (row) => row.nucdiv,
    header: "Nucleotide Diversity",
    description: tooltip({
      title: "Nucleotide Diversity",
      description:
        "Average number of nucleotide differences per site between randomly chosen DNA sequences from a population. A fundamental measure of genetic variation.",
      guides: [
        {
          threshold: "Higher diversity (>0.001)",
          meaning: "More genetic variation, less selective constraint",
        },
        {
          threshold: "Lower diversity (<0.0005)",
          meaning: "Less variation, stronger purifying selection",
        },
        {
          threshold: "Biological significance",
          meaning: "Reflects mutation-selection-drift balance",
        },
      ],
    }),
    cell: cell.decimal(6),
  }),

  col.accessor("bstatistic", {
    accessor: (row) => row.main?.conservation?.bstatistic,
    header: "bStatistic",
    description: tooltip({
      title: "Background Selection Statistic (B)",
      description:
        "Measures the reduction in neutral diversity due to selection against deleterious mutations linked to the focal site. Higher values indicate stronger background selection effects.",
      guides: [
        {
          threshold: "Higher B values (>0.8)",
          meaning: "Strong background selection, reduced diversity",
        },
        {
          threshold: "Lower B values (<0.5)",
          meaning: "Weak background selection, higher diversity",
        },
        {
          threshold: "Biological significance",
          meaning: "Indicates local selective pressure on linked sites",
        },
      ],
    }),
    cell: cell.decimal(4),
  }),
];

export const localNucleotideDiversityGroup = col.group(
  "local-nucleotide-diversity",
  "Local Nucleotide Diversity",
  localNucleotideDiversityColumns,
);
