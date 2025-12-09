import type { Variant } from "../../../types/types";
import { createColumns, cell, tooltip } from "@/lib/table/column-builder";

const col = createColumns<Variant>();

/** Reusable aPC (aggregated Pathogenicity Composite) column definitions */
export const apcColumns = {
  proteinFunction: col.accessor("apc_protein_function_v3", {
    accessor: "apc_protein_function_v3",
    header: "aPC-Protein Function",
    description: tooltip({
      title: "aPC-Protein Function",
      description: "Integrative score combining multiple protein function predictions (SIFT, PolyPhen, Grantham, PolyPhen2, MutationTaster, MutationAssessor) into a single PHRED-scaled score.",
      range: "[2.974, 86.238]",
      citation: "Li et al., 2020",
      guides: [
        { threshold: "Higher scores (>10)", meaning: "More likely to affect protein function" },
        { threshold: "Lower scores", meaning: "Less likely to affect protein function" },
        { threshold: "PHRED scale", meaning: "Higher = more confident. Each 10-point increase means 10× more confidence. Score of 20 means 99% confident, 30 means 99.9% confident." },
      ],
    }),
    cell: cell.decimal(6),
  }),

  conservation: col.accessor("apc_conservation_v2", {
    accessor: "apc_conservation_v2",
    header: "aPC-Conservation",
    description: tooltip({
      title: "aPC-Conservation",
      description: "Conservation annotation PC: the first PC of the standardized scores of GerpN, GerpS, priPhCons, mamPhCons, verPhCons, priPhyloP, mamPhyloP, verPhyloP in PHRED scale.",
      range: "[0, 75.824]",
      citation: "Li et al., 2020",
      guides: [
        { threshold: "Higher scores (>10)", meaning: "More evolutionarily conserved" },
        { threshold: "Lower scores", meaning: "Less evolutionarily conserved" },
        { threshold: "PHRED scale", meaning: "Higher = more confident. Each 10-point increase means 10× more confidence. Score of 20 means 99% confident, 30 means 99.9% confident." },
      ],
    }),
    cell: cell.decimal(6),
  }),

  epigeneticsActive: col.accessor("apc_epigenetics_active", {
    accessor: "apc_epigenetics_active",
    header: "aPC-Epigenetics Active",
    description: tooltip({
      title: "aPC-Epigenetics Active",
      description: "Integrative score combining active chromatin marks (H3K4me1, H3K4me2, H3K4me3, H3K9ac, H3K27ac, H4K20me1, H2AFZ) into a single PHRED-scaled score. Active marks are associated with gene expression and regulatory activity.",
      range: "[0, 86.238]",
      citation: "Li et al., 2020",
      guides: [
        { threshold: "Higher scores (>10)", meaning: "More active chromatin state" },
        { threshold: "Lower scores", meaning: "Less active chromatin state" },
        { threshold: "PHRED scale", meaning: "Higher = more confident. Each 10-point increase means 10× more confidence. Score of 20 means 99% confident, 30 means 99.9% confident." },
      ],
    }),
    cell: cell.decimal(6),
  }),

  epigeneticsRepressed: col.accessor("apc_epigenetics_repressed", {
    accessor: "apc_epigenetics_repressed",
    header: "aPC-Epigenetics Repressed",
    description: tooltip({
      title: "aPC-Epigenetics Repressed",
      description: "Integrative score combining repressive chromatin marks (H3K9me3, H3K27me3) into a single PHRED-scaled score. Repressed marks are associated with gene silencing and heterochromatin.",
      range: "[0, 86.238]",
      citation: "Li et al., 2020",
      guides: [
        { threshold: "Higher scores (>10)", meaning: "More repressed chromatin state" },
        { threshold: "Lower scores", meaning: "Less repressed chromatin state" },
        { threshold: "PHRED scale", meaning: "Higher = more confident. Each 10-point increase means 10× more confidence. Score of 20 means 99% confident, 30 means 99.9% confident." },
      ],
    }),
    cell: cell.decimal(6),
  }),

  epigeneticsTranscription: col.accessor("apc_epigenetics_transcription", {
    accessor: "apc_epigenetics_transcription",
    header: "aPC-Epigenetics Transcription",
    description: tooltip({
      title: "aPC-Epigenetics Transcription",
      description: "Integrative score combining transcription-associated chromatin marks (H3K36me3, H3K79me2) into a single PHRED-scaled score. These marks are associated with active gene transcription.",
      range: "[0, 86.238]",
      citation: "Li et al., 2020",
      guides: [
        { threshold: "Higher scores (>10)", meaning: "More transcriptionally active chromatin" },
        { threshold: "Lower scores", meaning: "Less transcriptionally active chromatin" },
        { threshold: "PHRED scale", meaning: "Higher = more confident. Each 10-point increase means 10× more confidence. Score of 20 means 99% confident, 30 means 99.9% confident." },
      ],
    }),
    cell: cell.decimal(6),
  }),

  transcriptionFactor: col.accessor("apc_transcription_factor", {
    accessor: "apc_transcription_factor",
    header: "aPC-Transcription Factor",
    description: tooltip({
      title: "aPC-Transcription Factor",
      description: "Integrative score combining transcription factor binding evidence (ReMap TF overlap, ReMap cell line overlap) into a single PHRED-scaled score. Indicates regulatory potential.",
      range: "[1.185, 86.238]",
      citation: "Li et al., 2020",
      guides: [
        { threshold: "Higher scores (>10)", meaning: "More transcription factor binding evidence" },
        { threshold: "Lower scores", meaning: "Less transcription factor binding evidence" },
        { threshold: "PHRED scale", meaning: "Higher = more confident. Each 10-point increase means 10× more confidence. Score of 20 means 99% confident, 30 means 99.9% confident." },
      ],
    }),
    cell: cell.decimal(6),
  }),

  localNucleotideDiversity: col.accessor("apc_local_nucleotide_diversity_v3", {
    accessor: "apc_local_nucleotide_diversity_v3",
    header: "aPC-Local Nucleotide Diversity",
    description: tooltip({
      title: "aPC-Local Nucleotide Diversity",
      description: "Integrative score combining local genetic diversity measures (background selection statistic, recombination rate, nucleotide diversity) into a single PHRED-scaled score.",
      range: "[0, 86.238]",
      citation: "Li et al., 2020",
      guides: [
        { threshold: "Higher scores (>10)", meaning: "Higher local genetic diversity" },
        { threshold: "Lower scores", meaning: "Lower local genetic diversity" },
        { threshold: "PHRED scale", meaning: "Higher = more confident. Each 10-point increase means 10× more confidence. Score of 20 means 99% confident, 30 means 99.9% confident." },
      ],
    }),
    cell: cell.decimal(6),
  }),

  mutationDensity: col.accessor("apc_mutation_density", {
    accessor: "apc_mutation_density",
    header: "aPC-Mutation Density",
    description: tooltip({
      title: "aPC-Mutation Density",
      description: "Integrative score combining mutation densities at different scales (100bp, 1kb, 10kb windows) for common, rare, and singleton variants into a single PHRED-scaled score.",
      range: "[0, 84.477]",
      citation: "Li et al., 2020",
      guides: [
        { threshold: "Higher scores (>10)", meaning: "Higher local mutation density" },
        { threshold: "Lower scores", meaning: "Lower local mutation density" },
        { threshold: "PHRED scale", meaning: "Higher = more confident. Each 10-point increase means 10× more confidence. Score of 20 means 99% confident, 30 means 99.9% confident." },
      ],
    }),
    cell: cell.decimal(6),
  }),

  mappability: col.accessor("apc_mappability", {
    accessor: "apc_mappability",
    header: "aPC-Mappability",
    description: tooltip({
      title: "aPC-Mappability",
      description: "Integrative score combining sequence mappability measures at different read lengths (k=24, 36, 50, 100) for unique and multi-mapping reads into a single PHRED-scaled score.",
      range: "[0.007, 22.966]",
      citation: "Li et al., 2020",
      guides: [
        { threshold: "Higher scores (>10)", meaning: "Better sequence mappability" },
        { threshold: "Lower scores", meaning: "Poorer sequence mappability" },
        { threshold: "PHRED scale", meaning: "Higher = more confident. Each 10-point increase means 10× more confidence. Score of 20 means 99% confident, 30 means 99.9% confident." },
      ],
    }),
    cell: cell.decimal(6),
  }),
} as const;
