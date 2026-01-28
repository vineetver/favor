import type { Gene } from "@features/gene/types";
import {
  categories,
  cell,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";

const col = createColumns<Gene>();

const hiPredCategories = categories([
  {
    label: "Yes",
    match: /^(Y|Yes|true)$/i,
    color: "green",
    description: "Haploinsufficient",
  },
  {
    label: "No",
    match: /^(N|No|false)$/i,
    color: "gray",
    description: "Not haploinsufficient",
  },
]);

export const geneConstraintsColumns = [
  col.accessor("p_hi", {
    accessor: (row) => row.constraint_scores?.damage?.p_hi,
    header: "P HI",
    description: tooltip({
      title: "P HI",
      description:
        "Estimated probability of haploinsufficiency of the gene (from doi:10.1371/journal.pgen.1001154)",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("hi_pred_score", {
    accessor: (row) => row.constraint_scores?.damage?.hi_pred_score,
    header: "HI Pred Score",
    description: tooltip({
      title: "HI Pred Score",
      description:
        "Estimated probability of haploinsufficiency of the gene (from doi:10.1093/bioinformatics/btx028)",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("hi_pred", {
    accessor: (row) => row.constraint_scores?.damage?.hi_pred,
    header: "HI Pred",
    description: tooltip({
      title: "HI Pred",
      description:
        "HIPred prediction of haploinsufficiency of the gene. (from doi:10.1093/bioinformatics/btx028)",
      categories: hiPredCategories,
    }),
    cell: cell.badge<Gene>(hiPredCategories),
  }),

  col.accessor("rvis_evs", {
    accessor: (row) => row.constraint_scores?.damage?.rvis_evs,
    header: "RVIS EVS",
    description: tooltip({
      title: "RVIS EVS",
      description:
        "Residual Variation Intolerance Score, a measure of intolerance of mutational burden, the higher the score the more tolerant to mutational burden the gene is. Based on EVS (ESP6500) data. from doi:10.1371/journal.pgen.1003709",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("rvis_percentile_evs", {
    accessor: (row) => row.constraint_scores?.damage?.rvis_percentile_evs,
    header: "RVIS Percentile EVS",
    description: tooltip({
      title: "RVIS Percentile EVS",
      description:
        "The percentile rank of the gene based on RVIS, the higher the percentile the more tolerant to mutational burden the gene is. Based on EVS (ESP6500) data.",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("rvis_ex_ac", {
    accessor: (row) => row.constraint_scores?.damage?.rvis_ex_ac,
    header: "RVIS ExAC",
    description: tooltip({
      title: "RVIS ExAC",
      description:
        "ExAC-based RVIS; setting 'common' MAF filter at 0.05% in at least one of the six individual ethnic strata from ExAC. cited from RVIS document.",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("rvis_percentile_ex_ac", {
    accessor: (row) => row.constraint_scores?.damage?.rvis_percentile_ex_ac,
    header: "RVIS Percentile ExAC",
    description: tooltip({
      title: "RVIS Percentile ExAC",
      description:
        "Genome-Wide percentile for the new ExAC-based RVIS; setting 'common' MAF filter at 0.05% in at least one of the six individual ethnic strata from ExAC. cited from RVIS document.",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("lo_f_fdr_ex_ac", {
    accessor: (row) => row.constraint_scores?.damage?.lo_f_fdr_ex_ac,
    header: "LoF FDR ExAC",
    description: tooltip({
      title: "LoF FDR ExAC",
      description:
        "A gene's corresponding FDR p-value for preferential LoF depletion among the ExAC population. Lower FDR corresponds with genes that are increasingly depleted of LoF variants. cited from RVIS document.",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("gnom_ad_p_li", {
    accessor: (row) => row.constraint_scores?.gnomad?.gnom_ad_p_li,
    header: "GNOMAD P LI",
    description: tooltip({
      title: "GNOMAD P LI",
      description:
        "The probability of being loss-of-function intolerant (intolerant of both heterozygous and homozygous lof variants) based on gnomAD 2.1 data",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("gnom_ad_p_rec", {
    accessor: (row) => row.constraint_scores?.gnomad?.gnom_ad_p_rec,
    header: "GNOMAD P Rec",
    description: tooltip({
      title: "GNOMAD P Rec",
      description:
        "The probability of being intolerant of homozygous, but not heterozygous lof variants based on gnomAD 2.1 data",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("gnom_ad_p_null", {
    accessor: (row) => row.constraint_scores?.gnomad?.gnom_ad_p_null,
    header: "GNOMAD P Null",
    description: tooltip({
      title: "GNOMAD P Null",
      description:
        "The probability of being tolerant of both heterozygous and homozygous lof variants based on gnomAD 2.1 data",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("ghis", {
    accessor: (row) => row.constraint_scores?.damage?.ghis,
    header: "GHIS",
    description: tooltip({
      title: "GHIS",
      description:
        "A score predicting the gene haploinsufficiency. The higher the score the more likely the gene is haploinsufficient. (from doi: 10.1093/nar/gkv474)",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("p_rec", {
    accessor: (row) => row.constraint_scores?.damage?.p_rec,
    header: "P Rec",
    description: tooltip({
      title: "P Rec",
      description:
        "Estimated probability that gene is a recessive disease gene (from DOI:10.1126/science.1215040)",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("gdi", {
    accessor: (row) => row.constraint_scores?.damage?.gdi,
    header: "GDI",
    description: tooltip({
      title: "GDI",
      description:
        'GDI: gene damage index score, "a genome-wide, gene-level metric of the mutational damage that has accumulated in the general population" from doi: 10.1073/pnas.1518646112. The higher the score the less likely the gene is to be responsible for monogenic diseases.',
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("gdi_phred", {
    accessor: (row) => row.constraint_scores?.damage?.gdi_phred,
    header: "GDI PHRED",
    description: tooltip({
      title: "GDI PHRED",
      description: "GDI: phred-scaled gene damage index score.",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("mean_s_het", {
    accessor: (row) => row.constraint_scores?.shet?.mean_s_het,
    header: "S Het",
    description: tooltip({
      title: "S Het",
      description: "S Het: posterior estimate of heterozygous selection",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("phaplo", {
    accessor: (row) => row.constraint_scores?.posterior?.phaplo,
    header: "Haplo Insufficiency",
    description: tooltip({
      title: "Haplo Insufficiency",
      description:
        "pHaplo: posterior probability of being under haploinsufficiency.",
    }),
    cell: cell.decimal(4),
  }),

  col.accessor("ptriplo", {
    accessor: (row) => row.constraint_scores?.posterior?.ptriplo,
    header: "Triplo Sensitivity",
    description: tooltip({
      title: "Triplo Sensitivity",
      description:
        "pTriplo: posterior probability of being under triplosensitivity.",
    }),
    cell: cell.decimal(4),
  }),
];

export const geneConstraintsGroup = col.group(
  "constraints",
  "Constraints",
  geneConstraintsColumns,
);
