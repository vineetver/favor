/**
 * FAVOR data changelog — single source of truth.
 *
 * Add a new release by prepending an object to RELEASES.
 * Releases must be sorted newest-first; the page renders them in array order.
 */

export type ChangeKind = "added" | "updated" | "removed" | "fixed";

export interface ChangeEntry {
  kind: ChangeKind;
  /** One-line description of the change. */
  text: string;
  /** Optional source label rendered as a leading tag, e.g. "dbNSFP". */
  source?: string;
}

export type ReleaseTag = "major" | "minor" | "patch";

export interface Release {
  /** Human-facing version label, e.g. "2026.1". */
  version: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Short headline summarising the release. */
  title: string;
  /** Optional 1-2 sentence overview shown above the change list. */
  summary?: string;
  /** Optional tag for visual emphasis. Defaults to "minor". */
  tag?: ReleaseTag;
  changes: ChangeEntry[];
}

export const RELEASES: Release[] = [
  {
    version: "2026.2",
    date: "2026-04-09",
    title: "GPN-MSA PHRED fix",
    tag: "patch",
    summary:
      "gpn_msa_phred in v2026.1 was wrong. Recomputed across the full genome. Raw gpn_msa_score is unchanged.",
    changes: [
      {
        kind: "fixed",
        source: "GPN-MSA",
        text: "gpn_msa_phred is now a CADD-style rank PHRED. Variants are sorted by gpn_msa_score ascending (lower = more deleterious), then phred = -10 * log10(rank / N), where rank counts variants at or below each score. Tied scores get the same PHRED.",
      },
    ],
  },
  {
    version: "2026.1",
    date: "2026-04-09",
    title: "Missense, splicing, and non-coding pathogenicity expansion",
    tag: "major",
    summary:
      "A major expansion of variant effect prediction across protein-coding, splicing, and non-coding genome. Adds the full dbNSFP v5.2 missense suite, splicing and experimental assays, four non-coding pathogenicity scores, and gnomAD v4 regional constraint.",
    changes: [
      {
        kind: "added",
        source: "dbNSFP v5.2",
        text: "Full missense prediction suite — REVEL, BayesDel, ClinPred, MPC, ESM-1b, MetaRNN, MetaLR, M-CAP, VEST4, PrimateAI, DEOGEN2, MutPred2, MVP, gMVP, SIFT4G, PROVEAN, PhACTboost, MutFormer, VARITY, LIST-S2, PolyPhen-2 HumDiv/HumVar, MutationTaster, and MutationAssessor. 20+ predictors exposed under the dbnsfp struct.",
      },
      {
        kind: "added",
        source: "AlphaMissense",
        text: "Calibrated pathogenicity scores for every possible missense substitution, with per-transcript predictions and class labels (likely benign / ambiguous / likely pathogenic).",
      },
      {
        kind: "added",
        source: "SpliceAI",
        text: "Donor and acceptor gain/loss delta scores and positions, plus a per-variant max delta score for splicing impact.",
      },
      {
        kind: "added",
        source: "MaveDB",
        text: "Experimental variant effect scores from multiplexed assays of variant effect (MAVEs), linked by HGVS protein notation and scoreset URN.",
      },
      {
        kind: "added",
        source: "GPN-MSA",
        text: "Genome-wide pathogenicity from the Genomic Pre-trained Network trained on multiple sequence alignments. Raw and PHRED-scaled.",
      },
      {
        kind: "added",
        source: "JARVIS",
        text: "Non-coding variant importance and significance reclassifier. Raw and PHRED-scaled.",
      },
      {
        kind: "added",
        source: "ReMM",
        text: "Regulatory Mendelian Mutation score for non-coding variants. Raw and PHRED-scaled.",
      },
      {
        kind: "added",
        source: "NCBoost",
        text: "Non-coding variant pathogenicity with linked-gene assignment and region classification.",
      },
      {
        kind: "added",
        source: "MACIE",
        text: "Multi-task classifier for non-coding pathogenicity with conserved, regulatory, and combined any-class predictions.",
      },
      {
        kind: "added",
        source: "CV2F",
        text: "Tissue-specific functional scores from MPRA and liver variant assays — liver, baseline, MPRA, LVS, and combined classifiers.",
      },
      {
        kind: "added",
        source: "gnomAD constraint (Gnocchi)",
        text: "gnomAD v4 regional mutational constraint scores. Raw and PHRED-scaled, surfacing depleted-variation regions across the non-coding genome.",
      },
      {
        kind: "added",
        source: "NCER",
        text: "Non-Coding Essential Region percentile, ranking sites by predicted essentiality.",
      },
      {
        kind: "added",
        source: "pgBoost",
        text: "Probabilistic SNP-gene link scores from a gradient boosting model trained on multiome fine-mapping data, with percentile and linked gene.",
      },
    ],
  },
];
