import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";

const helper = createColumnHelper<Variant>();

export const transcriptionFactorConfig = helper.group(
  "transcription-factors",
  "Transcription Factor",
  [
    helper.accessor("apc_transcription_factor", {
      header: "aPC-Transcription-Factor",
      description:
        "Integrative score combining transcription factor binding evidence (ReMap TF overlap, ReMap cell line overlap) into a single PHRED-scaled score. Range: [1.185, 86.238]. (Li et al., 2020)",
    }),
    helper.accessor("remap_overlap_tf", {
      header: "RemapOverlapTF",
      description:
        "ReMap TF Overlap: Number of different transcription factors that bind to this genomic region based on ChIP-seq data from the ReMap database. Range: [1, 350] (default: -0.5).",
    }),
    helper.accessor("remap_overlap_cl", {
      header: "RemapOverlapCL",
      description:
        "ReMap Cell Line Overlap: Number of different transcription factor-cell line combinations that show binding to this genomic region. Represents context-specific TF binding across diverse cellular conditions. Range: [1, 1068] (default: -0.5).",
    }),
  ],
);
