import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";
import { roundNumber } from "@/lib/data-display/helpers";

const helper = createColumnHelper<Variant>();

export const integrativeConfig = helper.group("integrative", "Integrative", [
  helper.accessor("apc_protein_function_v3", {
    header: "aPC-Protein Function",
    description:
      "Integrative score combining multiple protein function predictions (SIFT, PolyPhen, Grantham, PolyPhen2, MutationTaster, MutationAssessor) into a single PHRED-scaled score. Range: [2.974, 86.238]. (Li et al., 2020)",
    cell: helper.format.custom((num) =>
      num >= 0 ? <span>{roundNumber(num)} </span> : undefined,
    ),
  }),
  helper.accessor("apc_conservation_v2", {
    header: "aPC-Conservation",
    description:
      'Conservation annotation PC: the first PC of the standardized scores of "GerpN, GerpS, priPhCons, mamPhCons, verPhCons, priPhyloP, mamPhyloP, verPhyloP" in PHRED scale. Range: [0, 75.824]. (Li et al., 2020)',
    cell: helper.format.custom((num) =>
      num >= 0 ? <span>{roundNumber(num)} </span> : undefined,
    ),
  }),
  helper.accessor("apc_epigenetics_active", {
    header: "aPC-Epigenetics Active",
    description:
      "Integrative score combining active chromatin marks (H3K4me1, H3K4me2, H3K4me3, H3K9ac, H3K27ac, H4K20me1, H2AFZ) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)",
    cell: helper.format.custom((num) =>
      num >= 0 ? <span>{roundNumber(num)} </span> : undefined,
    ),
  }),
  helper.accessor("apc_epigenetics_repressed", {
    header: "aPC-Epigenetics Repressed",
    description:
      "Integrative score combining repressive chromatin marks (H3K9me3, H3K27me3) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)",
    cell: helper.format.custom((num) =>
      num >= 0 ? <span>{roundNumber(num)} </span> : undefined,
    ),
  }),
  helper.accessor("apc_epigenetics_transcription", {
    header: "aPC-Epigenetics Transcription",
    description:
      "Integrative score combining transcription-associated chromatin marks (H3K36me3, H3K79me2) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)",
    cell: helper.format.custom((num) =>
      num >= 0 ? <span>{roundNumber(num)} </span> : undefined,
    ),
  }),
  helper.accessor("apc_local_nucleotide_diversity_v3", {
    header: "aPC-Local Nucleotide Diversity",
    description:
      "Integrative score combining local genetic diversity measures (background selection statistic, recombination rate, nucleotide diversity) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)",
    cell: helper.format.custom((num) =>
      num >= 0 ? <span>{roundNumber(num)} </span> : undefined,
    ),
  }),
  helper.accessor("apc_mutation_density", {
    header: "aPC-Mutation Density",
    description:
      "Integrative score combining mutation densities at different scales (100bp, 1kb, 10kb windows) for common, rare, and singleton variants into a single PHRED-scaled score. Range: [0, 84.477]. (Li et al., 2020)",
    cell: helper.format.custom((num) =>
      num >= 0 ? <span>{roundNumber(num)} </span> : undefined,
    ),
  }),
  helper.accessor("apc_transcription_factor", {
    header: "aPC-Transcription Factor",
    description:
      "Integrative score combining transcription factor binding evidence (ReMap TF overlap, ReMap cell line overlap) into a single PHRED-scaled score. Range: [1.185, 86.238]. (Li et al., 2020)",
    cell: helper.format.custom((num) =>
      num >= 0 ? <span>{roundNumber(num)} </span> : undefined,
    ),
  }),
  helper.accessor("apc_mappability", {
    header: "aPC-Mappability",
    description:
      "Integrative score combining sequence mappability measures at different read lengths (k=24, 36, 50, 100) for unique and multi-mapping reads into a single PHRED-scaled score. Range: [0.007, 22.966]. (Li et al., 2020)",
    cell: helper.format.custom((num) =>
      num >= 0 ? <span>{roundNumber(num)} </span> : undefined,
    ),
  }),
  helper.accessor("cadd_phred", {
    header: "CADD phred",
    description:
      "The CADD score in PHRED scale (integrative score). A higher CADD score indicates more deleterious. Range: [0.001, 84]. (Kircher et al., 2014; Rentzsch et al., 2018)",
    cell: helper.format.custom((num) =>
      num >= 0 ? <span>{roundNumber(num)} </span> : undefined,
    ),
  }),
  helper.accessor("linsight", {
    header: "LINSIGHT",
    description:
      "The LINSIGHT score (integrative score). A higher LINSIGHT score indicates more functionality. Range: [0.033, 0.995]. (Huang et al., 2017)",
    cell: helper.format.custom((num) =>
      num >= 0 ? <span>{roundNumber(num)} </span> : undefined,
    ),
  }),
  helper.accessor("fathmm_xf", {
    header: "Fathmm XF",
    description:
      "The FATHMM-XF score for coding variants (integrative score). A higher FATHMM-XF score indicates more functionality. Range: [0.001, 0.999]. (Rogers et al., 2017)",
    cell: helper.format.custom((num) =>
      num >= 0 ? <span>{roundNumber(num)} </span> : undefined,
    ),
  }),
]);
