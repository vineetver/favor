import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";
import { epigeneticsCCode } from "@/lib/utils/colors";
import { roundNumber } from "@/lib/data-display/helpers";

const helper = createColumnHelper<Variant>();

export const epigeneticsConfig = helper.group("epigenetics", "Epigenetics", [
  helper.accessor("apc_epigenetics_active", {
    header: "aPC Epigenetics Active",
    description:
      "Integrative score combining active chromatin marks (H3K4me1, H3K4me2, H3K4me3, H3K9ac, H3K27ac, H4K20me1, H2AFZ) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("apc_epigenetics_repressed", {
    header: "aPC Epigenetics Repressed",
    description:
      "Integrative score combining repressive chromatin marks (H3K9me3, H3K27me3) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("apc_epigenetics_transcription", {
    header: "aPC Epigenetics Transcription",
    description:
      "Integrative score combining transcription-associated chromatin marks (H3K36me3, H3K79me2) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encode_dnase_sum", {
    header: "DNase",
    description:
      "DNase: DNase-seq measures chromatin accessibility by identifying regions where DNA is accessible to DNase I enzyme. Range: [0.001, 118672] (default: 0.0). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encodeh3k27ac_sum", {
    header: "H3K27ac",
    description:
      "H3K27ac: Histone H3 lysine 27 acetylation mark, a key indicator of active enhancers and promoters. Range: [0.013, 288.608] (default: 0.36). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encodeh3k4me1_sum", {
    header: "H3K4me1",
    description:
      "H3K4me1: Histone H3 lysine 4 monomethylation mark, commonly found at enhancer regions and regulatory elements. Range: [0.015, 91.954] (default: 0.37). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encodeh3k4me2_sum", {
    header: "H3K4me2",
    description:
      "H3K4me2: Histone H3 lysine 4 dimethylation mark, associated with active promoters and transcriptional start sites. Range: [0.024, 148.887] (default: 0.37). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encodeh3k4me3_sum", {
    header: "H3K4me3",
    description:
      "H3K4me3: Histone H3 lysine 4 trimethylation mark, the classical marker of active promoters and transcriptional start sites. Range: [0.012, 239.512] (default: 0.38). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encodeh3k9ac_sum", {
    header: "H3K9ac",
    description:
      "H3K9ac: Histone H3 lysine 9 acetylation mark, associated with transcriptionally active chromatin and gene expression. Range: [0.019, 281.187] (default: 0.41). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encodeh4k20me1_sum", {
    header: "H4k20me1",
    description:
      "H4K20me1: Histone H4 lysine 20 monomethylation mark, associated with active chromatin and transcriptional elongation. Range: [0.054, 73.230] (default: 0.47). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encodeh2afz_sum", {
    header: "H2AFZ",
    description:
      "H2AFZ: Histone variant H2A.Z associated with transcriptional regulation, nucleosome positioning, and active chromatin regions. Range: [0.031, 96.072] (default: 0.42). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encodeh3k9me3_sum", {
    header: "H3K9me3",
    description:
      "H3K9me3: Histone H3 lysine 9 trimethylation mark, a key marker of constitutive heterochromatin and gene silencing. Range: [0.011, 58.712] (default: 0.38). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encodeh3k27me3_sum", {
    header: "H3K27me3",
    description:
      "H3K27me3: Histone H3 lysine 27 trimethylation mark, associated with facultative heterochromatin and Polycomb-mediated gene repression. Range: [0.014, 87.122] (default: 0.47). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encodeh3k36me3_sum", {
    header: "H3K36me3",
    description:
      "H3K36me3: Histone H3 lysine 36 trimethylation mark, associated with actively transcribed gene bodies and transcriptional elongation. Range: [0.009, 56.176] (default: 0.39). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encodeh3k79me2_sum", {
    header: "H3K79me2",
    description:
      "H3K79me2: Histone H3 lysine 79 dimethylation mark, associated with active transcription and transcriptional elongation. Range: [0.015, 118.706] (default: 0.34). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("encodetotal_rna_sum", {
    header: "totalRNA",
    description:
      "Total RNA: RNA sequencing signal measuring total RNA expression levels across multiple cell lines. Range: [0, 92282.7] (default: 0.0). (ENCODE Project Consortium, 2012)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("gc", {
    header: "GC",
    description:
      "GC Content: Percentage of guanine and cytosine nucleotides in a 150bp window around the variant. Range: [0, 1] (default: 0.42)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
  helper.accessor("cpg", {
    header: "CpG",
    description:
      "CpG Content: Percentage of CpG dinucleotides in a 150bp window around the variant. Range: [0, 0.6] (default: 0.02)",
    cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
  }),
]);
