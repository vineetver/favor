export type RegulatoryState = "Active" | "Repressed" | "Transcription" | null;

export const REGULATORY_STATE_MAP: Record<string, RegulatoryState> = {
  apc_epigenetics_active: "Active",
  apc_epigenetics_repressed: "Repressed",
  apc_epigenetics_transcription: "Transcription",
  encode_dnase_sum: "Active",
  encodeh3k27ac_sum: "Active",
  encodeh3k4me1_sum: "Active",
  encodeh3k4me2_sum: "Active",
  encodeh3k4me3_sum: "Active",
  encodeh3k9ac_sum: "Active",
  encodeh4k20me1_sum: "Active",
  encodeh2afz_sum: "Active",
  encodeh3k9me3_sum: "Repressed",
  encodeh3k27me3_sum: "Repressed",
  encodeh3k36me3_sum: "Transcription",
  encodeh3k79me2_sum: "Transcription",
  encodetotal_rna_sum: "Transcription",
  gc: null,
  cpg: null,
};
