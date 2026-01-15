import type { Variant } from "@/features/variant/types";
import { createColumns, cell, tooltip } from "@/lib/table/column-builder";

const col = createColumns<Variant>();

// Helper to create chromatin state columns with specific thresholds
function chromatinCol(
  id: keyof Variant,
  header: string,
  title: string,
  description: string,
  highThreshold: string,
  highMeaning: string,
  lowMeaning: string
) {
  return col.accessor(id, {
    accessor: id,
    header,
    description: tooltip({
      title,
      description,
      range: "[0, 48]",
      defaultValue: "1.92",
      citation: "Ernst and Kellis, 2015",
      guides: [
        { threshold: highThreshold, meaning: highMeaning },
        { threshold: "Lower counts", meaning: lowMeaning },
      ],
    }),
    cell: cell.decimal(0),
  });
}

export const chromatinStateColumns = [
  // Promoter states (E1-E4)
  chromatinCol(
    "chmm_e1", "TssA (Active TSS)", "TssA (Active TSS)",
    "Number of cell types (out of 48) where this region is in the Active Transcription Start Site chromatin state. Active gene transcription initiation.",
    "Higher counts (>10 cell types)", "Broadly active promoter", "More cell-type specific activation"
  ),
  chromatinCol(
    "chmm_e2", "PromU (Promoter Upstream TSS)", "PromU (Promoter Upstream TSS)",
    "Number of cell types (out of 48) where this region is in the Promoter Upstream TSS chromatin state. Regulatory elements upstream of transcription start sites.",
    "Higher counts (>8 cell types)", "Broadly active upstream elements", "Cell-type specific upstream activity"
  ),
  chromatinCol(
    "chmm_e3", "PromD1 (Promoter Downstream TSS with DNase)", "PromD1 (Promoter Downstream TSS with DNase)",
    "Number of cell types (out of 48) where this region is in the Promoter Downstream TSS with DNase chromatin state. Accessible regulatory elements downstream of TSS.",
    "Higher counts (>8 cell types)", "Broadly accessible downstream regions", "Cell-type specific downstream activity"
  ),
  chromatinCol(
    "chmm_e4", "PromD2 (Promoter Downstream TSS)", "PromD2 (Promoter Downstream TSS)",
    "Number of cell types (out of 48) where this region is in the Promoter Downstream TSS chromatin state. Regulatory elements downstream of transcription start sites.",
    "Higher counts (>8 cell types)", "Broadly active downstream elements", "Cell-type specific downstream activity"
  ),

  // Transcription states (E5-E8)
  chromatinCol(
    "chmm_e5", "Tx5' (Transcription 5')", "Tx5' (Transcription 5')",
    "Number of cell types (out of 48) where this region is in the Transcription 5' chromatin state. Transcription at the 5' end of genes.",
    "Higher counts (>15 cell types)", "Broadly transcribed 5' regions", "Cell-type specific 5' transcription"
  ),
  chromatinCol(
    "chmm_e6", "Tx (Transcription)", "Tx (Transcription)",
    "Number of cell types (out of 48) where this region is in the Transcription chromatin state. Active transcription in gene bodies.",
    "Higher counts (>15 cell types)", "Broadly transcribed gene bodies", "Cell-type specific transcription"
  ),
  chromatinCol(
    "chmm_e7", "Tx3' (Transcription 3')", "Tx3' (Transcription 3')",
    "Number of cell types (out of 48) where this region is in the Transcription 3' chromatin state. Transcription at the 3' end of genes.",
    "Higher counts (>15 cell types)", "Broadly transcribed 3' regions", "Cell-type specific 3' transcription"
  ),
  chromatinCol(
    "chmm_e8", "TxWk (Transcription Weak)", "TxWk (Transcription Weak)",
    "Number of cell types (out of 48) where this region is in the Transcription Weak chromatin state. Low-level transcriptional activity.",
    "Higher counts (>15 cell types)", "Broadly weak transcription", "Cell-type specific weak activity"
  ),

  // Transcription regulatory (E9-E12)
  chromatinCol(
    "chmm_e9", "TxReg (Transcription Regulatory)", "TxReg (Transcription Regulatory)",
    "Number of cell types (out of 48) where this region is in the Transcription Regulatory chromatin state. Regulatory elements within transcribed regions.",
    "Higher counts (>10 cell types)", "Broadly regulatory transcription", "Cell-type specific regulatory activity"
  ),
  chromatinCol(
    "chmm_e10", "TxEnh5' (Transcription 5' Enhancer)", "TxEnh5' (Transcription 5' Enhancer)",
    "Number of cell types (out of 48) where this region is in the Transcription 5' Enhancer chromatin state. Enhancer activity at 5' end of transcribed regions.",
    "Higher counts (>10 cell types)", "Broadly active 5' enhancers", "Cell-type specific 5' enhancer activity"
  ),
  chromatinCol(
    "chmm_e11", "TxEnh3' (Transcription 3' Enhancer)", "TxEnh3' (Transcription 3' Enhancer)",
    "Number of cell types (out of 48) where this region is in the Transcription 3' Enhancer chromatin state. Enhancer activity at 3' end of transcribed regions.",
    "Higher counts (>10 cell types)", "Broadly active 3' enhancers", "Cell-type specific 3' enhancer activity"
  ),
  chromatinCol(
    "chmm_e12", "TxEnhW (Transcription Enhancer Weak)", "TxEnhW (Transcription Enhancer Weak)",
    "Number of cell types (out of 48) where this region is in the Transcription Enhancer Weak chromatin state. Low-level enhancer activity in transcribed regions.",
    "Higher counts (>10 cell types)", "Broadly weak enhancer activity", "Cell-type specific weak enhancers"
  ),

  // Active enhancer states (E13-E15)
  chromatinCol(
    "chmm_e13", "EnhA1 (Active Enhancer 1)", "EnhA1 (Active Enhancer 1)",
    "Number of cell types (out of 48) where this region is in the Active Enhancer 1 chromatin state. Strong regulatory element activity.",
    "Higher counts (>10 cell types)", "Broadly active enhancer", "Cell-type specific enhancer activity"
  ),
  chromatinCol(
    "chmm_e14", "EnhA2 (Active Enhancer 2)", "EnhA2 (Active Enhancer 2)",
    "Number of cell types (out of 48) where this region is in the Active Enhancer 2 chromatin state. Strong distal regulatory element activity.",
    "Higher counts (>10 cell types)", "Broadly active enhancer", "Cell-type specific enhancer activity"
  ),
  chromatinCol(
    "chmm_e15", "EnhAF (Active Enhancer Flanking)", "EnhAF (Active Enhancer Flanking)",
    "Number of cell types (out of 48) where this region is in the Active Enhancer Flanking chromatin state. Regulatory activity flanking strong enhancers.",
    "Higher counts (>8 cell types)", "Broadly active flanking regions", "Cell-type specific flanking activity"
  ),

  // Weak enhancer states (E16-E18)
  chromatinCol(
    "chmm_e16", "EnhW1 (Enhancer Weak 1)", "EnhW1 (Enhancer Weak 1)",
    "Number of cell types (out of 48) where this region is in the Enhancer Weak 1 chromatin state. Low-level distal regulatory element activity.",
    "Higher counts (>12 cell types)", "Broadly weak enhancer", "Cell-type specific weak enhancer activity"
  ),
  chromatinCol(
    "chmm_e17", "EnhW2 (Enhancer Weak 2)", "EnhW2 (Enhancer Weak 2)",
    "Number of cell types (out of 48) where this region is in the Enhancer Weak 2 chromatin state. Low-level proximal regulatory element activity.",
    "Higher counts (>12 cell types)", "Broadly weak enhancer", "Cell-type specific weak enhancer activity"
  ),
  chromatinCol(
    "chmm_e18", "EnhAc (Enhancer Acetylation Only)", "EnhAc (Enhancer Acetylation Only)",
    "Number of cell types (out of 48) where this region is in the Enhancer Acetylation Only chromatin state. Enhancers marked primarily by histone acetylation.",
    "Higher counts (>10 cell types)", "Broadly acetylated enhancer regions", "Cell-type specific acetylation"
  ),

  // Accessibility and special states (E19-E21)
  chromatinCol(
    "chmm_e19", "DNase (DNase Only)", "DNase (DNase Only)",
    "Number of cell types (out of 48) where this region is in the DNase Only chromatin state. Chromatin accessibility without strong histone signatures.",
    "Higher counts (>15 cell types)", "Broadly accessible regions", "Cell-type specific accessibility"
  ),
  chromatinCol(
    "chmm_e20", "ZNF/Rpts (ZNF Genes and Repeats)", "ZNF/Rpts (ZNF Genes and Repeats)",
    "Number of cell types (out of 48) where this region is in the ZNF Genes and Repeats chromatin state. Zinc finger gene clusters and repetitive elements.",
    "Higher counts (>20 cell types)", "Broadly active ZNF/repeat regions", "Cell-type specific ZNF/repeat activity"
  ),
  chromatinCol(
    "chmm_e21", "Het (Heterochromatin)", "Het (Heterochromatin)",
    "Number of cell types (out of 48) where this region is in the Heterochromatin chromatin state. Long-term gene silencing, repetitive elements.",
    "Higher counts (>30 cell types)", "Constitutively silenced regions", "Facultatively heterochromatic"
  ),

  // Poised and bivalent states (E22-E23)
  chromatinCol(
    "chmm_e22", "PromP (Poised Promoter)", "PromP (Poised Promoter)",
    "Number of cell types (out of 48) where this region is in the Poised Promoter chromatin state. Promoters ready for activation, often developmental genes.",
    "Higher counts (>12 cell types)", "Broadly poised promoters", "Cell-type specific poised states"
  ),
  chromatinCol(
    "chmm_e23", "PromBiv (Bivalent Promoter)", "PromBiv (Bivalent Promoter)",
    "Number of cell types (out of 48) where this region is in the Bivalent Promoter chromatin state. H3K4me3 + H3K27me3, ready for activation or repression.",
    "Higher counts (>15 cell types)", "Broadly poised developmental genes", "Cell-type specific bivalent states"
  ),

  // Repressed states (E24-E25)
  chromatinCol(
    "chmm_e24", "ReprPC (Repressed PolyComb)", "ReprPC (Repressed PolyComb)",
    "Number of cell types (out of 48) where this region is in the Repressed PolyComb chromatin state. Facultative heterochromatin, developmental gene silencing.",
    "Higher counts (>20 cell types)", "Broadly repressed across contexts", "Cell-type specific repression"
  ),
  chromatinCol(
    "chmm_e25", "Quies (Quiescent/Low)", "Quies (Quiescent/Low)",
    "Number of cell types (out of 48) where this region is in the Quiescent/Low chromatin state. Background chromatin with minimal regulatory activity.",
    "Higher counts (>35 cell types)", "Constitutively inactive", "Context-dependent activity"
  ),
];

export const chromatinStateGroup = col.group("chromatin-states", "Chromatin State", chromatinStateColumns);
