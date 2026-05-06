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
  /**
   * Optional screenshots rendered as a row of cards below the summary.
   * Each card opens a lightbox on click.
   */
  images?: ReleaseImage[];
  changes: ChangeEntry[];
}

export interface ReleaseImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
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
    version: "2026.05.06",
    date: "2026-05-06",
    title: "AlphaGenome predictions",
    tag: "minor",
    summary:
      "Run Google DeepMind's AlphaGenome from the variant and gene pages and view the results inline. Predictions are computed live — first runs take 1–10 minutes, subsequent requests are cached.",
    images: [
      {
        src: "/docs/alphagenome-variant.png",
        alt: "AlphaGenome scores for rs7412 — High Impact classification with a tissue-by-gene expression-change heatmap across APOC2, APOC4, MARK4, and other nearby genes.",
        width: 2738,
        height: 1690,
        caption: "Variant page → Regulatory → AlphaGenome for rs7412.",
      },
    ],
    changes: [
      {
        kind: "added",
        area: "platform",
        source: "Variant",
        navSlug: "alphagenome",
        text: "Regulatory → AlphaGenome on any variant page scores the variant across seven scorers (regulatory disruption, DNA folding, expression change, gene activation, RNA splicing, RNA processing, splice site) and renders reference vs. alternate signal for CAGE, DNase, ATAC, RNA-seq, ChIP histone, ChIP TF, splicing, and contact maps. Filter by tissue group before predicting tracks.",
      },
      {
        kind: "added",
        area: "platform",
        source: "Gene",
        navSlug: "alphagenome",
        text: "Cell/Tissue → AlphaGenome on any gene page returns region expression scores. AlphaGenome operates on fixed windows (≥512kb here), so any other gene inside the window also appears as a row in the heatmap — there is no single-gene scorer yet, read the row for your gene.",
      },
    ],
  },
  {
    version: "2026.04.29",
    date: "2026-04-29",
    title: "Disease and drug pages",
    tag: "minor",
    summary:
      "Every disease and drug now has its own page. Search takes you straight there.",
    images: [
      {
        src: "/docs/disease-page.png",
        alt: "Acute Myeloid Leukemia disease page — clinical group, ClinGen and GenCC verdicts, prevalence, key phenotypes, and synonyms.",
        width: 2764,
        height: 1704,
        caption: "Disease — Acute Myeloid Leukemia.",
      },
      {
        src: "/docs/drug-page.png",
        alt: "Metformin drug page — clinical phase, approval year, black box warning, mechanism, and inline 2D structure.",
        width: 2698,
        height: 1710,
        caption: "Drug — Metformin.",
      },
    ],
    changes: [
      {
        kind: "added",
        area: "platform",
        source: "Disease",
        text: "Cross-references across MONDO, EFO, OMIM, Orphanet, MeSH, and DOID; clinical group; rare-disease flag; ClinGen and GenCC verdicts; prevalence and incidence; key phenotypes; full list of synonyms. Sections for genes (split into confirmed, implicated, and associated), drugs that treat it, GWAS variants, studies, phenotypes, and parent and sibling diseases — each labelled with how many it has so you know what's there before you open it.",
      },
      {
        kind: "added",
        area: "platform",
        source: "Drug",
        text: "Clinical phase, approval year, FDA flags such as black box warnings, mechanism of action, and the molecule rendered inline. Sections for targets, indications, pharmacogenomics, adverse effects, and drug-drug interactions — each labelled with how many it has so you know what's there before you open it.",
      },
      {
        kind: "fixed",
        area: "search",
        source: "Cmd-K",
        text: "Results are restricted to things that have a real page (genes, variants, diseases, drugs, phenotypes, cCREs). No more clicking a hit and landing somewhere dead.",
      },
    ],
  },
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
