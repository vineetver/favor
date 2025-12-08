import type { Variant } from "../../../types/types";
import { createColumns, cell, tooltip } from "@/lib/table/column-builder";
import { apcColumns } from "./shared";

const col = createColumns<Variant>();

export const epigeneticsColumns = [
  apcColumns.epigeneticsActive,
  apcColumns.epigeneticsRepressed,
  apcColumns.epigeneticsTranscription,

  col.accessor("encode_dnase_sum", {
    accessor: "encode_dnase_sum",
    header: "DNase",
    description: tooltip({
      title: "DNase-seq",
      description: "Measures chromatin accessibility by identifying regions sensitive to DNase I digestion. Higher values indicate more open chromatin.",
      range: "[0.001, 118672]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "More accessible chromatin" },
        { threshold: "Lower scores", meaning: "Less accessible chromatin" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k27ac_sum", {
    accessor: "encodeh3k27ac_sum",
    header: "H3K27ac",
    description: tooltip({
      title: "H3K27ac",
      description: "Histone H3 lysine 27 acetylation. Key indicator of active enhancers and promoters.",
      range: "[0.013, 288.608]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "Active enhancer/promoter region" },
        { threshold: "Lower scores", meaning: "Less regulatory activity" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k4me1_sum", {
    accessor: "encodeh3k4me1_sum",
    header: "H3K4me1",
    description: tooltip({
      title: "H3K4me1",
      description: "Histone H3 lysine 4 mono-methylation. Found at enhancer regions and regulatory elements.",
      range: "[0.015, 91.954]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "Enhancer or regulatory region" },
        { threshold: "Lower scores", meaning: "Less regulatory activity" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k4me2_sum", {
    accessor: "encodeh3k4me2_sum",
    header: "H3K4me2",
    description: tooltip({
      title: "H3K4me2",
      description: "Histone H3 lysine 4 di-methylation. Associated with active promoters and transcription start sites.",
      range: "[0.024, 148.887]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "Active promoter/TSS region" },
        { threshold: "Lower scores", meaning: "Less promoter activity" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k4me3_sum", {
    accessor: "encodeh3k4me3_sum",
    header: "H3K4me3",
    description: tooltip({
      title: "H3K4me3",
      description: "Histone H3 lysine 4 tri-methylation. Classical marker of active promoters and transcription start sites.",
      range: "[0.012, 239.512]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "Active promoter region" },
        { threshold: "Lower scores", meaning: "Less promoter activity" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k9ac_sum", {
    accessor: "encodeh3k9ac_sum",
    header: "H3K9ac",
    description: tooltip({
      title: "H3K9ac",
      description: "Histone H3 lysine 9 acetylation. Associated with transcriptionally active chromatin.",
      range: "[0.019, 281.187]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "Transcriptionally active region" },
        { threshold: "Lower scores", meaning: "Less transcriptional activity" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh4k20me1_sum", {
    accessor: "encodeh4k20me1_sum",
    header: "H4K20me1",
    description: tooltip({
      title: "H4K20me1",
      description: "Histone H4 lysine 20 mono-methylation. Associated with active chromatin and transcriptional elongation.",
      range: "[0.054, 73.230]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "Active transcription elongation" },
        { threshold: "Lower scores", meaning: "Less transcriptional activity" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh2afz_sum", {
    accessor: "encodeh2afz_sum",
    header: "H2AFZ",
    description: tooltip({
      title: "H2AFZ",
      description: "H2A.Z histone variant. Associated with transcriptional regulation and nucleosome positioning at regulatory regions.",
      range: "[0.031, 96.072]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "Regulatory region" },
        { threshold: "Lower scores", meaning: "Less regulatory activity" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k9me3_sum", {
    accessor: "encodeh3k9me3_sum",
    header: "H3K9me3",
    description: tooltip({
      title: "H3K9me3",
      description: "Histone H3 lysine 9 tri-methylation. Key marker of constitutive heterochromatin and gene silencing.",
      range: "[0.011, 58.712]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "Silenced/heterochromatin region" },
        { threshold: "Lower scores", meaning: "Less repressive state" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k27me3_sum", {
    accessor: "encodeh3k27me3_sum",
    header: "H3K27me3",
    description: tooltip({
      title: "H3K27me3",
      description: "Histone H3 lysine 27 tri-methylation. Associated with facultative heterochromatin and Polycomb-mediated gene repression.",
      range: "[0.014, 87.122]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "Polycomb-repressed region" },
        { threshold: "Lower scores", meaning: "Less repressive state" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k36me3_sum", {
    accessor: "encodeh3k36me3_sum",
    header: "H3K36me3",
    description: tooltip({
      title: "H3K36me3",
      description: "Histone H3 lysine 36 tri-methylation. Associated with actively transcribed gene bodies.",
      range: "[0.009, 56.176]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "Actively transcribed gene body" },
        { threshold: "Lower scores", meaning: "Less transcriptional activity" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k79me2_sum", {
    accessor: "encodeh3k79me2_sum",
    header: "H3K79me2",
    description: tooltip({
      title: "H3K79me2",
      description: "Histone H3 lysine 79 di-methylation. Associated with active transcription and transcriptional elongation.",
      range: "[0.015, 118.706]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "Active transcription elongation" },
        { threshold: "Lower scores", meaning: "Less transcriptional activity" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodetotal_rna_sum", {
    accessor: "encodetotal_rna_sum",
    header: "totalRNA",
    description: tooltip({
      title: "Total RNA",
      description: "Total RNA expression levels aggregated across multiple cell lines from ENCODE.",
      range: "[0, 92282.7]",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        { threshold: "Higher scores", meaning: "Higher expression level" },
        { threshold: "Lower scores", meaning: "Lower expression level" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("gc", {
    accessor: "gc",
    header: "GC",
    description: tooltip({
      title: "GC Content",
      description: "GC nucleotide content (proportion of G and C bases) in a 150bp window around the variant.",
      range: "[0, 1]",
      guides: [
        { threshold: "Higher values (>0.5)", meaning: "GC-rich region" },
        { threshold: "Lower values (<0.4)", meaning: "AT-rich region" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("cpg", {
    accessor: "cpg",
    header: "CpG",
    description: tooltip({
      title: "CpG Content",
      description: "CpG dinucleotide percentage in a 150bp window around the variant. CpG islands are often associated with gene promoters.",
      range: "[0, 0.6]",
      guides: [
        { threshold: "Higher values (>0.1)", meaning: "CpG island region, potential promoter" },
        { threshold: "Lower values", meaning: "CpG-poor region" },
      ],
    }),
    cell: cell.decimal(3),
  }),
];

export const epigeneticsGroup = col.group("epigenetics", "Epigenetics", epigeneticsColumns);
