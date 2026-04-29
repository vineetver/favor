/**
 * FAVOR release notes — single source of truth across the entire platform.
 *
 * Every user-visible change lands here: data updates, portal features, CLI
 * releases, agent improvements, batch pipeline, search, and API changes.
 * Add a new release by prepending to RELEASES (newest first).
 */

export type ChangeArea =
  | "platform"
  | "data"
  | "cli"
  | "agent"
  | "batch"
  | "search"
  | "api";

export type ChangeKind = "added" | "updated" | "removed" | "fixed";

export interface ChangeEntry {
  kind: ChangeKind;
  area: ChangeArea;
  /** One-line description of the change. */
  text: string;
  /** Optional source / component label rendered as a leading tag. */
  source?: string;
  /**
   * Optional slug that drives <NewDot slug={...} /> in sub-nav. Set this
   * when the change ships a feature behind a deep nav item (sidebar tab,
   * sub-page) the user might miss. Leave unset for backend-only or
   * already-prominent changes.
   */
  navSlug?: string;
}

export type ReleaseTag = "major" | "minor" | "patch";

export interface Release {
  /**
   * Date-based version label, "YYYY.MM.DD" (CalVer). Append ".1", ".2"
   * etc. only as a tiebreaker when shipping multiple releases on the
   * same day. Used as the stable id for the page anchor (`#v{version}`)
   * and the What's New seen-set, so it must never change after release.
   */
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

export const AREA_LABEL: Record<ChangeArea, string> = {
  platform: "Platform",
  data: "Data",
  agent: "Agent",
  batch: "Batch",
  search: "Search",
  cli: "CLI",
  api: "API",
};

/** Render order for area sections inside a release. */
export const AREA_ORDER: ChangeArea[] = [
  "platform",
  "data",
  "agent",
  "batch",
  "search",
  "cli",
  "api",
];

export const RELEASES: Release[] = [
  {
    version: "2026.04.28",
    date: "2026-04-28",
    title: "Search history",
    tag: "minor",
    summary:
      "The search palette now remembers what you've looked at. Recent searches appear as soon as you focus the input; pin the ones you keep coming back to.",
    changes: [
      {
        kind: "added",
        area: "search",
        source: "Cmd-K",
        text: "Recent searches show in the empty-state dropdown, synced across your devices when signed in. ↑↓ to navigate, Enter to open, ⌘-click to open in a new tab, ⌫ to remove. Hover a row to pin it to the top.",
      },
    ],
  },
  {
    version: "2026.04.09",
    date: "2026-04-09",
    title: "GPN-MSA PHRED fix",
    tag: "patch",
    summary:
      "gpn_msa_phred in v2026.02.15 was wrong. Recomputed across the full genome. Raw gpn_msa_score is unchanged.",
    changes: [
      {
        kind: "fixed",
        area: "data",
        source: "GPN-MSA",
        text: "gpn_msa_phred is now a CADD-style rank PHRED. Variants are sorted by gpn_msa_score ascending (lower = more deleterious), then phred = -10 * log10(rank / N), where rank counts variants at or below each score. Tied scores get the same PHRED.",
      },
    ],
  },
  {
    version: "2026.02.15",
    date: "2026-02-15",
    title: "Missense, splicing, and non-coding pathogenicity expansion",
    tag: "major",
    summary:
      "A major expansion of variant effect prediction across protein-coding, splicing, and non-coding genome. Adds the full dbNSFP v5.2 missense suite, splicing and experimental assays, four non-coding pathogenicity scores, and gnomAD v4 regional constraint.",
    changes: [
      {
        kind: "added",
        area: "data",
        source: "dbNSFP v5.2",
        text: "Full missense prediction suite. REVEL, BayesDel, ClinPred, MPC, ESM-1b, MetaRNN, MetaLR, M-CAP, VEST4, PrimateAI, DEOGEN2, MutPred2, MVP, gMVP, SIFT4G, PROVEAN, PhACTboost, MutFormer, VARITY, LIST-S2, PolyPhen-2 HumDiv/HumVar, MutationTaster, and MutationAssessor. 20+ predictors exposed under the dbnsfp struct.",
      },
      {
        kind: "added",
        area: "data",
        source: "AlphaMissense",
        text: "Calibrated pathogenicity scores for every possible missense substitution, with per-transcript predictions and class labels (likely benign / ambiguous / likely pathogenic).",
      },
      {
        kind: "added",
        area: "data",
        source: "SpliceAI",
        text: "Donor and acceptor gain/loss delta scores and positions, plus a per-variant max delta score for splicing impact.",
      },
      {
        kind: "added",
        area: "data",
        source: "MaveDB",
        text: "Experimental variant effect scores from multiplexed assays of variant effect (MAVEs), linked by HGVS protein notation and scoreset URN.",
      },
      {
        kind: "added",
        area: "data",
        source: "GPN-MSA",
        text: "Genome-wide pathogenicity from the Genomic Pre-trained Network trained on multiple sequence alignments. Raw and PHRED-scaled.",
      },
      {
        kind: "added",
        area: "data",
        source: "JARVIS",
        text: "Non-coding variant importance and significance reclassifier. Raw and PHRED-scaled.",
      },
      {
        kind: "added",
        area: "data",
        source: "ReMM",
        text: "Regulatory Mendelian Mutation score for non-coding variants. Raw and PHRED-scaled.",
      },
      {
        kind: "added",
        area: "data",
        source: "NCBoost",
        text: "Non-coding variant pathogenicity with linked-gene assignment and region classification.",
      },
      {
        kind: "added",
        area: "data",
        source: "MACIE",
        text: "Multi-task classifier for non-coding pathogenicity with conserved, regulatory, and combined any-class predictions.",
      },
      {
        kind: "added",
        area: "data",
        source: "CV2F",
        text: "Tissue-specific functional scores from MPRA and liver variant assays — liver, baseline, MPRA, LVS, and combined classifiers.",
      },
      {
        kind: "added",
        area: "data",
        source: "gnomAD constraint (Gnocchi)",
        text: "gnomAD v4 regional mutational constraint scores. Raw and PHRED-scaled, surfacing depleted-variation regions across the non-coding genome.",
      },
      {
        kind: "added",
        area: "data",
        source: "NCER",
        text: "Non-Coding Essential Region percentile, ranking sites by predicted essentiality.",
      },
      {
        kind: "added",
        area: "data",
        source: "pgBoost",
        text: "Probabilistic SNP-gene link scores from a gradient boosting model trained on multiome fine-mapping data, with percentile and linked gene.",
      },
    ],
  },
];
