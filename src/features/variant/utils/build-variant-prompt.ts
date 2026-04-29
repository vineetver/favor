import type { Variant } from "../types/variant";
import {
  computeVariantFrame,
  type FrameResult,
  frameSection,
} from "./variant-frame";

// ---------------------------------------------------------------------------
// Citation strings — kept in sync with the source-of-truth in
// `src/features/variant/config/hg38/columns/*.tsx`. When a score's column
// has a `citation:` field, copy it verbatim here. Scores without a column
// entry (ALoFT, FunSeq2, pgboost) use the canonical paper.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Context: regulatory, GWAS, and target gene evidence fetched server-side
// ---------------------------------------------------------------------------

export interface VariantPromptContext {
  /** GWAS catalog hits */
  gwas?: GwasSummary;
  /** Top fine-mapped credible set memberships by PIP */
  credibleSets?: CredibleSetSummary[];
  /** Genes regulated by this variant (QTL, enhancer, ChromBPNet evidence) */
  targetGenes?: TargetGeneSummary[];
  /** QTL associations grouped by tissue */
  qtlTissues?: TissueStat[];
  /** ChromBPNet ML predictions grouped by tissue */
  chromBpnetTissues?: TissueStat[];
  /** Region-level evidence counts */
  regionCounts?: RegionCounts;
  /** Tissue signal activity (cCRE) grouped by tissue */
  signalTissues?: TissueStat[];
  /** Allelic imbalance grouped by tissue */
  allelicImbalanceTissues?: TissueStat[];
  /** Methylation grouped by tissue */
  methylationTissues?: TissueStat[];
  /** Polygenic Score Catalog: variant included as a weight in PGS models */
  pgs?: PgsSummary;
  /** Perturbation experiment availability for linked genes */
  perturbation?: PerturbationAvailability;
  /** Region-overlap counts (cCRE signals, enhancer-gene maps, EPIraction) */
  regionOverlaps?: RegionOverlaps;
}

export interface PgsSummary {
  totalHits: number;
  uniqueTraits: number;
  /** Top entries by absolute effect weight */
  top: Array<{
    pgsId: string;
    trait: string | null;
    effectWeight: number;
    /** Effect allele direction relative to the score */
    effectAllele: string | null;
  }>;
}

export interface PerturbationAvailability {
  /** Number of linked genes with CRISPR-screen perturbation data */
  crisprGenes?: number;
  /** Linked genes covered by Perturb-seq experiments */
  perturbSeqGenes?: number;
  /** Linked genes covered by MAVE / saturation-mutagenesis experiments */
  maveGenes?: number;
}

export interface RegionOverlaps {
  /** ENCODE cCRE signal tracks overlapping the variant */
  ccre_signals?: number;
  /** Enhancer-gene maps (ABC, ENCODE rE2G, EpiMap) overlapping the variant */
  enhancer_gene?: number;
  /** EPIraction-mapped enhancer-promoter contacts at this position */
  epiraction?: number;
}

export interface CredibleSetSummary {
  trait: string | null;
  studyId: string;
  studyType: string;
  pip: number;
  setSize: number | null;
  method: string | null;
  isLead: boolean;
}

export interface GwasSummary {
  totalAssociations: number;
  uniqueTraits: number;
  uniqueStudies: number;
  top: Array<{ trait: string; pvalue: number }>;
}

export interface TargetGeneSummary {
  gene: string;
  evidence: number;
  significant: number;
  tissues: number;
  sources: string[];
}

export interface TissueStat {
  tissue: string;
  count: number;
  significant?: number;
  maxValue?: number;
}

export interface RegionCounts {
  signals?: number;
  chromatin_states?: number;
  enhancer_genes?: number;
  accessibility_peaks?: number;
  loops?: number;
  qtls?: number;
  chrombpnet?: number;
  allelic_imbalance?: number;
  methylation?: number;
  validated_enhancers?: number;
  crispr_screens?: number;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Builds a compact, data-dense prompt for variant summarization.
 *
 * Tiered extraction: core identity → clinical → scores → population →
 * regulatory → GWAS → target genes → tissue-level evidence.
 *
 * Target: ~2500 tokens of pure signal.
 */
export function buildVariantPrompt(
  variant: Variant,
  context?: VariantPromptContext,
): string {
  const frame = computeVariantFrame(variant, context);
  const sections: string[] = [];

  sections.push(frameSection(frame));
  sections.push(coreIdentity(variant));
  push(sections, qualityFlags(variant));
  push(sections, clinicalSignificance(variant, frame));
  push(sections, codingPredictors(variant, frame));
  push(sections, noncodingPredictors(variant, frame));
  push(sections, populationFrequency(variant));
  push(sections, regulatoryAnnotations(variant));

  if (context) {
    push(sections, traitAssociations(context.gwas, context.credibleSets));
    push(sections, pgsSection(context.pgs));
    push(sections, targetGenesSection(context.targetGenes));
    push(sections, tissueEvidenceSection(context));
    push(sections, regionEvidenceSection(context.regionCounts));
    push(sections, regionOverlapsSection(context.regionOverlaps));
    push(sections, perturbationSection(context.perturbation));
  }

  return `${sections.join("\n\n")}\n\n---\n\n${instructions()}`;
}

// Coding-impact predictors (AlphaMissense / SIFT / PolyPhen / CADD coding
// signal) are not appropriate for noncoding variants — AlphaMissense was
// trained only on missense substitutions, SIFT/PolyPhen require a coding
// substitution, and CADD's noncoding signal is much weaker than coding.
// For noncoding/intergenic frames we suppress these at prompt-build time
// rather than instructing the LLM to ignore them.
function showsCodingPredictors(frame: FrameResult): boolean {
  return (
    frame.frame.kind === "coding_missense" ||
    frame.frame.kind === "coding_lof" ||
    frame.frame.kind === "coding_synonymous_or_other" ||
    frame.frame.kind === "splice_region" ||
    frame.frame.kind === "unknown"
  );
}

function showsNoncodingPredictors(frame: FrameResult): boolean {
  return (
    frame.frame.kind === "regulatory_noncoding" ||
    frame.frame.kind === "intergenic" ||
    frame.frame.kind === "unknown"
  );
}

// ---------------------------------------------------------------------------
// Tier 1: Core Identity
// ---------------------------------------------------------------------------

function coreIdentity(v: Variant): string {
  const lines = ["## Variant Identity"];

  lines.push(`- VCF: ${v.variant_vcf}`);
  lines.push(`- Location: chr${v.chromosome}:${v.position.toLocaleString()}`);

  if (v.dbsnp?.rsid) lines.push(`- rsID: ${v.dbsnp.rsid}`);

  const genes = v.genecode?.genes?.filter(Boolean) ?? [];
  if (genes.length) lines.push(`- Gene(s): ${genes.join(", ")}`);

  const consequence = v.genecode?.consequence ?? v.refseq?.consequence;
  if (consequence) lines.push(`- Consequence: ${consequence}`);

  const regionType = v.genecode?.region_type ?? v.refseq?.region_type;
  if (regionType) lines.push(`- Region: ${regionType}`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Quality Flags — surface upstream caveats (mappability, ascertainment) that
// should make the LLM discount certain scores when they apply.
// ---------------------------------------------------------------------------

function qualityFlags(v: Variant): string | null {
  const flags: string[] = [];

  // Umap k50: fraction of overlapping 50-mers that map uniquely (1 = fully
  // unique, <1 = some 50-mers map elsewhere). Below ~0.5 makes any
  // chromatin / TF-binding / mapping-derived score unreliable.
  const umap50 = v.mappability?.k50?.umap;
  if (umap50 != null && umap50 < 0.5) {
    flags.push(
      `- Low mappability: Umap k50 = ${umap50.toFixed(2)} — chromatin / TF / read-mapping-derived scores are unreliable here`,
    );
  }

  if (!flags.length) return null;
  return ["## Quality Flags", ...flags].join("\n");
}

// ---------------------------------------------------------------------------
// Tier 2: Clinical Significance
// ---------------------------------------------------------------------------

function clinicalSignificance(v: Variant, frame: FrameResult): string | null {
  const lines: string[] = [];

  if (v.clinvar) {
    const cv = v.clinvar;
    if (cv.clnsig?.length || cv.clndn?.length || cv.origin_decoded?.length) {
      lines.push("## Clinical Significance");
      if (cv.clnsig?.length) {
        const stars = clinvarReviewStars(cv.clnrevstat);
        const reliability =
          stars >= 2
            ? "authoritative (>=2 stars)"
            : "low-confidence (<2 stars; ClinGen SVI guidance: do not anchor on this)";
        lines.push(
          `- ClinVar (Landrum et al., 2017, 2013): ${cv.clnsig.join(", ")} — ${reliability}`,
        );
      }
      if (cv.clndn?.length) {
        const conds = cv.clndn.filter(Boolean).slice(0, 5);
        lines.push(
          `- Conditions: ${conds.join("; ")}${cv.clndn.length > 5 ? ` (+${cv.clndn.length - 5} more)` : ""}`,
        );
      }
      if (cv.origin_decoded?.length)
        lines.push(`- Origin: ${cv.origin_decoded.join(", ")}`);
      if (cv.clnrevstat) lines.push(`- Review: ${cv.clnrevstat}`);
    }
  }

  if (v.cosmic?.sample_count) {
    heading(lines, "## Clinical Significance");
    const c = v.cosmic;
    const cosmicParts: string[] = [`${c.sample_count} tumor samples`];
    if (c.tier) cosmicParts.push(`tier ${c.tier}`);
    if (c.gene) cosmicParts.push(`gene ${c.gene}`);
    if (c.hgvsp) cosmicParts.push(`${c.hgvsp}`);
    if (c.so_term) cosmicParts.push(`${c.so_term}`);
    lines.push(`- COSMIC (Tate et al., 2019): ${cosmicParts.join(", ")}`);
  }

  // AlphaMissense applies only to coding missense / coding-other variants
  // (it scores per-amino-acid substitutions). Suppress for noncoding frames
  // even if a stale upstream score exists, to avoid the model treating it
  // as evidence about a noncoding variant.
  const am = v.alphamissense?.max_pathogenicity;
  if (am != null && showsCodingPredictors(frame)) {
    heading(lines, "## Clinical Significance");
    lines.push(
      `- AlphaMissense (Cheng et al., 2023): ${am.toFixed(3)} — ${alphaMissenseSemantic(am)}`,
    );
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

// ---------------------------------------------------------------------------
// Tier 3a: Coding-Variant Predictors
// ---------------------------------------------------------------------------

function codingPredictors(v: Variant, frame: FrameResult): string | null {
  // Coding-targeted predictors only — AlphaMissense / SIFT / PolyPhen / CADD
  // require a coding substitution to produce meaningful signal. Suppressed
  // entirely for noncoding/intergenic frames.
  if (!showsCodingPredictors(frame)) return null;

  const lines: string[] = [];
  const m = v.main;

  // Annotation helper for "below conventional threshold" hints.
  const annotate = (
    value: number,
    threshold: number,
    label = "below threshold",
  ) => (value < threshold ? ` (${label})` : "");

  // CADD PHRED — meta-score, ranked across all possible substitutions.
  if (m?.cadd?.phred != null) {
    lines.push("## Coding-Variant Predictors");
    lines.push(
      `- CADD Phred (Kircher et al., 2014; Rentzsch et al., 2018): ${m.cadd.phred.toFixed(1)} — ${caddInterp(m.cadd.phred)}`,
    );
  }

  // SIFT / PolyPhen-2 — coding-substitution predictors.
  if (m?.protein_predictions) {
    const pp = m.protein_predictions;
    const preds: string[] = [];
    if (pp.sift_cat) {
      preds.push(
        `SIFT (Ng and Henikoff, 2003): ${pp.sift_cat}${pp.sift_val != null ? ` (${pp.sift_val.toFixed(3)})` : ""}`,
      );
    }
    if (pp.polyphen_cat) {
      preds.push(
        `PolyPhen-2 (Adzhubei et al., 2010): ${pp.polyphen_cat}${pp.polyphen_val != null ? ` (${pp.polyphen_val.toFixed(3)})` : ""}`,
      );
    }
    if (pp.grantham != null) {
      // Grantham distance — chemical similarity between original / new AA.
      // Conservative <50, Moderate 51-100, Radical >100.
      const band =
        pp.grantham >= 100
          ? "radical"
          : pp.grantham >= 50
            ? "moderate"
            : "conservative";
      preds.push(
        `Grantham (Grantham, 1974): ${pp.grantham} (${band} chemical change)`,
      );
    }
    if (preds.length) {
      heading(lines, "## Coding-Variant Predictors");
      lines.push(`- Protein Impact: ${preds.join("; ")}`);
    }
  }

  // dbNSFP ensemble predictors (Liu et al.). Each was trained on a different
  // labeling scheme, so showing the full set lets the LLM see consensus vs.
  // disagreement. PolyPhen-2 HumDiv vs HumVar matters: HumDiv is calibrated
  // for rare-allele complex-disease analysis; HumVar for Mendelian.
  if (v.dbnsfp) {
    const d = v.dbnsfp;
    const ds: string[] = [];
    if (d.metasvm_pred) {
      ds.push(
        `MetaSVM (Dong et al., 2014): ${d.metasvm_pred} (D=damaging, T=tolerated; ensemble of 9 functional scores)`,
      );
    }
    if (d.mutation_taster != null) {
      ds.push(
        `MutationTaster (Schwarz et al., 2014): ${d.mutation_taster.toFixed(3)} (>0.5 disease-causing)`,
      );
    }
    if (d.mutation_assessor != null) {
      const ma = d.mutation_assessor;
      const band =
        ma >= 3.5
          ? "High"
          : ma >= 1.935
            ? "Medium"
            : ma >= -0.65
              ? "Low"
              : "Neutral";
      ds.push(
        `MutationAssessor (Reva et al., 2011): ${ma.toFixed(2)} (${band})`,
      );
    }
    if (d.polyphen2_hdiv != null) {
      ds.push(
        `PolyPhen-2 HumDiv (Adzhubei et al., 2010): ${d.polyphen2_hdiv.toFixed(3)} (calibrated for rare alleles in complex disease / GWAS fine-mapping)${annotate(d.polyphen2_hdiv, 0.957)}`,
      );
    }
    if (d.polyphen2_hvar != null) {
      ds.push(
        `PolyPhen-2 HumVar (Adzhubei et al., 2010): ${d.polyphen2_hvar.toFixed(3)} (calibrated for Mendelian diagnostics)${annotate(d.polyphen2_hvar, 0.909)}`,
      );
    }
    if (ds.length) {
      heading(lines, "## Coding-Variant Predictors");
      for (const s of ds) lines.push(`- ${s}`);
    }
  }

  // ALoFT — applicable only to predicted loss-of-function variants
  // (stop_gained / stop_lost / frameshift / start_lost). Classifies them
  // into Dominant / Recessive / Tolerant.
  if (frame.frame.kind === "coding_lof" && v.aloft) {
    const a = v.aloft;
    if (a.description || a.score != null) {
      heading(lines, "## Coding-Variant Predictors");
      lines.push(
        `- ALoFT (Balasubramanian et al., 2017) (LoF classifier): ${a.description ?? "—"}${a.score != null ? ` (score=${a.score.toFixed(3)})` : ""} — Dominant/Recessive predict disease impact; Tolerant predicts no detectable phenotype`,
      );
    }
  }

  // FAVOR aPC.protein_function — PHRED-scaled aggregate of SIFT, PolyPhen,
  // Grantham, PolyPhen-2, MutationTaster, MutationAssessor. PHRED >= 10
  // = top 10%; >= 20 = top 1%.
  if (v.apc?.protein_function_v3 != null) {
    heading(lines, "## Coding-Variant Predictors");
    const p = v.apc.protein_function_v3;
    lines.push(
      `- aPC-Protein-Function (Li et al., 2020; FAVOR PHRED aggregate of 6 protein scores): ${p.toFixed(1)} — ${phredInterp(p)}`,
    );
  }

  // Conservation (PhyloP / phastCons / GERP++) — meaningful on coding too.
  // PhyloP thresholds from Pollard 2010 (vert >2.0, mam >1.5, 5%-FDR mam
  // ~2.27). phastCons is an independent constraint signal: posterior
  // probability the base lies in a conserved element (0-1, >=0.8 typically
  // taken as "conserved element"). PhyloP and phastCons can disagree; both
  // worth surfacing.
  surfaceConservation(lines, m?.conservation, "## Coding-Variant Predictors");

  if (m?.gerp?.rs != null) {
    heading(lines, "## Coding-Variant Predictors");
    lines.push(
      `- GERP++ RS (Davydov et al., 2010): ${m.gerp.rs.toFixed(2)} (>2 sensitive constraint; >4 strict)${annotate(m.gerp.rs, 2)}`,
    );
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

// ---------------------------------------------------------------------------
// Tier 3b: Noncoding-Variant Predictors
// ---------------------------------------------------------------------------

function noncodingPredictors(v: Variant, frame: FrameResult): string | null {
  if (!showsNoncodingPredictors(frame)) return null;

  const lines: string[] = [];
  const annotate = (
    value: number,
    threshold: number,
    label = "below threshold",
  ) => (value < threshold ? ` (${label})` : "");

  // FunSeq2 (Khurana et al. 2014) — noncoding pathogenicity score
  // combining conservation, regulatory annotation, motif disruption.
  // Score >= 1.5 is highlighted as deleterious by the authors.
  if (v.funseq?.score != null) {
    lines.push("## Noncoding-Variant Predictors");
    lines.push(
      `- FunSeq2 (Khurana et al. 2014): ${v.funseq.score.toFixed(2)}${v.funseq.description ? ` — ${v.funseq.description}` : ""} (>=1.5 noncoding-deleterious)${annotate(v.funseq.score, 1.5)}`,
    );
  }

  if (v.linsight != null) {
    heading(lines, "## Noncoding-Variant Predictors");
    lines.push(
      `- LINSIGHT (Huang et al., 2017; PHRED-scaled noncoding-functional probability — same scale as CADD): ${v.linsight.toFixed(1)} — ${phredInterp(v.linsight)}`,
    );
  }

  if (v.fathmm_xf != null) {
    heading(lines, "## Noncoding-Variant Predictors");
    lines.push(
      `- FATHMM-XF (Rogers et al., 2017; PHRED-scaled noncoding deleteriousness — same scale as CADD): ${v.fathmm_xf.toFixed(1)} — ${phredInterp(v.fathmm_xf)}`,
    );
  }

  // FAVOR aPC noncoding aggregates — PHRED-scaled. Each captures a
  // different mechanism; multiple lighting up = stronger evidence.
  if (v.apc) {
    const a = v.apc;
    const phredEntries: Array<[string, number | null | undefined, string]> = [
      [
        "aPC-Conservation (Li et al., 2020)",
        a.conservation_v2,
        "PHRED aggregate of 8 conservation scores",
      ],
      [
        "aPC-Epigenetics-Active (Li et al., 2020)",
        a.epigenetics_active,
        "active enhancer/promoter chromatin marks",
      ],
      [
        "aPC-Epigenetics-Repressed (Li et al., 2020)",
        a.epigenetics_repressed,
        "H3K9me3 / H3K27me3 repressive marks",
      ],
      [
        "aPC-Epigenetics-Transcription (Li et al., 2020)",
        a.epigenetics_transcription,
        "H3K36me3 / H3K79me2 gene-body marks",
      ],
      [
        "aPC-Transcription-Factor (Li et al., 2020)",
        a.transcription_factor,
        "ReMap TF / cell-line overlap",
      ],
      [
        "aPC-Local-Nucleotide-Diversity (Li et al., 2020)",
        a.local_nucleotide_diversity_v3,
        "background selection / recombination signal",
      ],
      ["aPC-Mappability (Li et al., 2020)", a.mappability, "k-mer uniqueness"],
      [
        "aPC-Mutation-Density (Li et al., 2020)",
        a.mutation_density,
        "local mutation density",
      ],
      [
        "aPC-MicroRNA (Li et al., 2020)",
        a.micro_rna,
        "miRNA target site disruption",
      ],
      [
        "aPC-Proximity-to-TSS/TES (Li et al., 2020)",
        a.proximity_to_tsstes,
        "distance to gene boundaries",
      ],
    ];
    let added = false;
    for (const [name, value, blurb] of phredEntries) {
      if (value == null) continue;
      if (!added) {
        heading(lines, "## Noncoding-Variant Predictors");
        added = true;
      }
      lines.push(
        `- ${name}: ${value.toFixed(1)} (${blurb}) — ${phredInterp(value)}`,
      );
    }
  }

  // Conservation (PhyloP + phastCons + GERP++) — independent signals.
  surfaceConservation(
    lines,
    v.main?.conservation,
    "## Noncoding-Variant Predictors",
  );
  if (v.main?.gerp?.rs != null) {
    heading(lines, "## Noncoding-Variant Predictors");
    lines.push(
      `- GERP++ RS (Davydov et al., 2010): ${v.main.gerp.rs.toFixed(2)} (>2 sensitive constraint; >4 strict)${annotate(v.main.gerp.rs, 2)}`,
    );
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

// PhyloP + phastCons under one section. PhyloP measures per-base
// substitution rate vs neutral (positive = constrained). phastCons gives
// the posterior probability the base is in a conserved element (0-1, >=0.8
// is conventionally a conserved-element call). Both are surfaced because
// they can disagree — phastCons captures element-level constraint, PhyloP
// captures per-base constraint.
function surfaceConservation(
  lines: string[],
  c: NonNullable<Variant["main"]>["conservation"] | null | undefined,
  sectionHeading: string,
): void {
  if (!c) return;
  const annotate = (
    value: number,
    threshold: number,
    label = "below threshold",
  ) => (value < threshold ? ` (${label})` : "");

  if (c.mamphylop != null || c.verphylop != null) {
    heading(lines, sectionHeading);
    const s: string[] = [];
    if (c.mamphylop != null) {
      s.push(
        `mammalian: ${c.mamphylop.toFixed(2)}${annotate(c.mamphylop, 1.5)}`,
      );
    }
    if (c.verphylop != null) {
      s.push(
        `vertebrate: ${c.verphylop.toFixed(2)}${annotate(c.verphylop, 2)}`,
      );
    }
    lines.push(
      `- PhyloP (Pollard et al., 2010; per-base constraint; >2 vert / >1.5 mam = conserved): ${s.join(", ")}`,
    );
  }

  if (c.mamphcons != null || c.verphcons != null || c.priphcons != null) {
    heading(lines, sectionHeading);
    const s: string[] = [];
    if (c.mamphcons != null) {
      s.push(
        `mammalian: ${c.mamphcons.toFixed(2)}${annotate(c.mamphcons, 0.8)}`,
      );
    }
    if (c.verphcons != null) {
      s.push(
        `vertebrate: ${c.verphcons.toFixed(2)}${annotate(c.verphcons, 0.8)}`,
      );
    }
    if (c.priphcons != null) {
      s.push(`primate: ${c.priphcons.toFixed(2)}${annotate(c.priphcons, 0.8)}`);
    }
    lines.push(
      `- phastCons (Siepel et al., 2005; P(conserved-element); >=0.8 = conserved): ${s.join(", ")}`,
    );
  }
}

// API returns literal 0 for p-values that underflow below double precision
// (~1e-308). Number(0).toExponential() prints "0.0e+0" which the LLM
// reads as "not significant." Render underflow as "<1e-300 (underflow)".
function formatPValue(p: number): string {
  if (!Number.isFinite(p) || p <= 0) return "<1e-300 (underflow — extreme)";
  if (p < 1e-300) return "<1e-300 (extreme)";
  return p.toExponential(1);
}

function caddInterp(phred: number): string {
  if (phred >= 30)
    return "top 0.1% (PHRED scale; soft prior, not a clinical cutoff)";
  if (phred >= 20) return "top 1%";
  if (phred >= 15) return "top 3.2% (median for nonsynonymous/splice)";
  if (phred >= 10) return "top 10%";
  return "below top 10% (uninformative)";
}

// Generic PHRED-percentile interpretation, used for FAVOR aPC aggregates
// and for any other PHRED-scaled FAVOR signal. Same scale as CADD: PHRED 10
// = top 10%, PHRED 20 = top 1%, PHRED 30 = top 0.1%.
function phredInterp(phred: number): string {
  if (phred >= 30) return "top 0.1%";
  if (phred >= 20) return "top 1%";
  if (phred >= 15) return "top 3.2%";
  if (phred >= 10) return "top 10%";
  return "below top 10% (uninformative)";
}

// ---------------------------------------------------------------------------
// Tier 4: Population Frequency
// ---------------------------------------------------------------------------

function populationFrequency(v: Variant): string | null {
  const lines: string[] = [];
  const gnomad = v.gnomad_genome ?? v.gnomad_exome;

  if (gnomad?.af != null) {
    lines.push("## Population Frequency");
    const pct = (gnomad.af * 100).toFixed(4);
    lines.push(
      `- gnomAD AF (Karczewski et al., 2020): ${pct}% — ${afBand(gnomad.af)}`,
    );
    if (gnomad.grpmax) lines.push(`- Highest pop: ${gnomad.grpmax}`);
  }

  if (v.tg?.tg_all != null) {
    heading(lines, "## Population Frequency");
    const tg = v.tg;
    const pops: string[] = [];
    if (tg.tg_afr != null) pops.push(`AFR=${(tg.tg_afr * 100).toFixed(2)}%`);
    if (tg.tg_amr != null) pops.push(`AMR=${(tg.tg_amr * 100).toFixed(2)}%`);
    if (tg.tg_eas != null) pops.push(`EAS=${(tg.tg_eas * 100).toFixed(2)}%`);
    if (tg.tg_eur != null) pops.push(`EUR=${(tg.tg_eur * 100).toFixed(2)}%`);
    if (tg.tg_sas != null) pops.push(`SAS=${(tg.tg_sas * 100).toFixed(2)}%`);
    if (pops.length) lines.push(`- 1KG: ${pops.join(", ")}`);
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

// ---------------------------------------------------------------------------
// Tier 5: Regulatory Annotations (from core Variant object)
// ---------------------------------------------------------------------------

function regulatoryAnnotations(v: Variant): string | null {
  const lines: string[] = [];

  if (v.ccre?.annotations) {
    lines.push("## Regulatory Annotations");
    lines.push(
      `- cCRE (ENCODE Project Consortium, 2020; candidate cis-regulatory element): ${v.ccre.annotations}`,
    );
  }

  if (v.genehancer?.id) {
    heading(lines, "## Regulatory Annotations");
    const targets =
      v.genehancer.targets
        ?.slice(0, 5)
        .map((t) =>
          t.score != null ? `${t.gene} (score=${t.score.toFixed(1)})` : t.gene,
        )
        .filter(Boolean) ?? [];
    lines.push(
      `- GeneHancer (Fishilevich et al., 2017; predicted enhancer): ${v.genehancer.id}${v.genehancer.feature_score != null ? ` [feature_score=${v.genehancer.feature_score.toFixed(2)}]` : ""}${targets.length ? ` → ${targets.join(", ")}` : ""}`,
    );
  }

  if (v.super_enhancer?.ids?.length) {
    heading(lines, "## Regulatory Annotations");
    lines.push(
      `- Super Enhancer (Hnisz et al., 2013): ${v.super_enhancer.ids.length} regions (large clusters of enhancers; cell-type defining)`,
    );
  }

  if (v.cage?.cage_promoter || v.cage?.cage_enhancer) {
    heading(lines, "## Regulatory Annotations");
    if (v.cage.cage_promoter)
      lines.push(
        `- CAGE Promoter (Forrest et al., 2014; FANTOM5): ${v.cage.cage_promoter}`,
      );
    if (v.cage.cage_enhancer)
      lines.push(
        `- CAGE Enhancer (Forrest et al., 2014; FANTOM5): ${v.cage.cage_enhancer}`,
      );
  }

  // ChromHMM 25-state model — surface the highest-overlap state(s) as a
  // chromatin-state label rather than dumping all 25 e1-e25 fields. State
  // labels follow Roadmap Epigenomics 25-state (Ernst & Kellis).
  const chromState = dominantChromHmmState(v);
  if (chromState) {
    heading(lines, "## Regulatory Annotations");
    lines.push(
      `- ChromHMM dominant state (Ernst and Kellis, 2015): ${chromState}`,
    );
  }

  // Distance to TSS / TES — anchors regulatory framing (proximal promoter
  // vs distal enhancer vs intergenic).
  const dist = v.main?.distance;
  if (dist?.min_dist_tss != null || dist?.min_dist_tse != null) {
    heading(lines, "## Regulatory Annotations");
    const parts: string[] = [];
    if (dist.min_dist_tss != null) {
      const d = dist.min_dist_tss;
      const proximity =
        Math.abs(d) < 2000
          ? "proximal promoter region"
          : Math.abs(d) < 50000
            ? "near-gene"
            : "distal";
      parts.push(`TSS=${d.toLocaleString()} bp (${proximity})`);
    }
    if (dist.min_dist_tse != null) {
      parts.push(`TES=${dist.min_dist_tse.toLocaleString()} bp`);
    }
    lines.push(`- Gene-boundary distance: ${parts.join(", ")}`);
  }

  // ReMap TF binding overlap — number of distinct TFs and cell lines whose
  // ChIP-seq peaks overlap this position. >0 indicates a bound regulatory
  // region, with higher counts = more pleiotropic regulatory activity.
  const remap = v.main?.remap;
  if (remap && (remap.overlap_tf || remap.overlap_cl)) {
    heading(lines, "## Regulatory Annotations");
    const parts: string[] = [];
    if (remap.overlap_tf != null) parts.push(`${remap.overlap_tf} TFs`);
    if (remap.overlap_cl != null) parts.push(`${remap.overlap_cl} cell lines`);
    lines.push(
      `- ReMap TF binding overlap (Hammal et al., 2022): ${parts.join(", ")} (ChIP-seq atlas — bound regulatory region)`,
    );
  }

  // pgboost — predicted enhancer→gene links (Sethi 2020). Score 0-1; a
  // score > 0.5 with a high percentile is a confident link.
  if (v.pgboost?.length) {
    const top = [...v.pgboost]
      .filter((p) => p.score != null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5);
    if (top.length) {
      heading(lines, "## Regulatory Annotations");
      const targets = top
        .map((p) => {
          const score = p.score?.toFixed(2) ?? "—";
          const pct =
            p.percentile != null ? ` p${p.percentile.toFixed(0)}` : "";
          return `${p.gene} (score=${score}${pct})`;
        })
        .join(", ");
      lines.push(
        `- pgboost predicted enhancer-gene links (Dorans et al., 2025; >=0.5 confident): ${targets}`,
      );
    }
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

// Roadmap 25-state ChromHMM labels (Ernst & Kellis). Used to convert the
// stored e1-e25 PHRED overlaps into the dominant chromatin-state label.
const CHROMHMM_25: Record<number, string> = {
  1: "TssA (active TSS)",
  2: "PromU (promoter upstream TSS)",
  3: "PromD1 (promoter downstream TSS 1)",
  4: "PromD2 (promoter downstream TSS 2)",
  5: "Tx5' (transcription 5')",
  6: "Tx (strong transcription)",
  7: "Tx3' (transcription 3')",
  8: "TxWk (weak transcription)",
  9: "TxReg (transcribed regulatory)",
  10: "TxEnh5' (transcribed 5' enhancer)",
  11: "TxEnh3' (transcribed 3' enhancer)",
  12: "TxEnhW (transcribed weak enhancer)",
  13: "EnhA1 (active enhancer 1)",
  14: "EnhA2 (active enhancer 2)",
  15: "EnhAF (active enhancer flank)",
  16: "EnhW1 (weak enhancer 1)",
  17: "EnhW2 (weak enhancer 2)",
  18: "EnhAc (primary H3K27ac enhancer)",
  19: "DNase (primary DNase)",
  20: "ZNF/Rpts (ZNF genes & repeats)",
  21: "Het (heterochromatin)",
  22: "PromP (poised promoter)",
  23: "PromBiv (bivalent promoter)",
  24: "ReprPC (repressed Polycomb)",
  25: "Quies (quiescent / low signal)",
};

function dominantChromHmmState(v: Variant): string | null {
  const ch = v.main?.chromhmm;
  if (!ch) return null;
  let bestKey = 0;
  let bestVal = -Infinity;
  for (let i = 1; i <= 25; i++) {
    const val = (ch as Record<string, number | null | undefined>)[`e${i}`];
    if (val != null && val > bestVal) {
      bestVal = val;
      bestKey = i;
    }
  }
  if (!bestKey || bestVal <= 0) return null;
  const label = CHROMHMM_25[bestKey] ?? `state ${bestKey}`;
  return `${label} [PHRED ${bestVal.toFixed(1)}]`;
}

// ---------------------------------------------------------------------------
// Extended Context: Trait Associations (GWAS + fine-mapping combined)
// ---------------------------------------------------------------------------

function traitAssociations(
  gwas: GwasSummary | undefined,
  credibleSets: CredibleSetSummary[] | undefined,
): string | null {
  const hasGwas = gwas?.totalAssociations;
  const hasCs = credibleSets && credibleSets.length > 0;
  if (!hasGwas && !hasCs) return null;

  const lines = ["## Trait Associations"];

  if (hasGwas) {
    lines.push(
      `- GWAS Catalog (Sollis et al., 2023): ${gwas.totalAssociations} associations across ${gwas.uniqueTraits} traits, ${gwas.uniqueStudies} studies`,
    );
    for (const hit of gwas.top.slice(0, 5)) {
      lines.push(`  - ${hit.trait} (p=${formatPValue(hit.pvalue)})`);
    }
  }

  if (hasCs) {
    // Show top fine-mapped sets — surface lead-variant status and small sets
    // because those are the high-confidence inclusions worth narrating
    lines.push(
      `- Fine-mapped credible sets: ${credibleSets.length} top memberships`,
    );
    for (const cs of credibleSets.slice(0, 5)) {
      const traitLabel = cs.trait || cs.studyId;
      const setSize = cs.setSize != null ? `set=${cs.setSize}` : "set=?";
      const method = cs.method ? `, ${cs.method}` : "";
      const lead = cs.isLead ? ", lead" : "";
      lines.push(
        `  - ${traitLabel} [${cs.studyType}] PIP=${cs.pip.toFixed(3)}, ${setSize}${method}${lead}`,
      );
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Extended Context: PGS Catalog effect-weights
// ---------------------------------------------------------------------------

function pgsSection(pgs: PgsSummary | undefined): string | null {
  if (!pgs?.totalHits) return null;

  const lines = ["## Polygenic Score Memberships (PGS Catalog)"];
  lines.push(
    `- Variant carries effect weights in ${pgs.totalHits} PGS models across ${pgs.uniqueTraits} traits. NOTE: PGS effect_weight is a per-variant contribution to a polygenic score (sign + magnitude per trait); it is NOT a pathogenicity score.`,
  );
  for (const hit of pgs.top.slice(0, 5)) {
    const allele = hit.effectAllele ? `, effect=${hit.effectAllele}` : "";
    const trait = hit.trait ?? "(unspecified trait)";
    const sign = hit.effectWeight >= 0 ? "+" : "";
    lines.push(
      `  - ${hit.pgsId}: ${trait} (weight=${sign}${hit.effectWeight.toExponential(2)}${allele})`,
    );
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Extended Context: Target Genes
// ---------------------------------------------------------------------------

function targetGenesSection(
  genes: TargetGeneSummary[] | undefined,
): string | null {
  if (!genes?.length) return null;

  const lines = ["## Target Genes (variant → gene regulatory evidence)"];
  for (const g of genes.slice(0, 5)) {
    lines.push(
      `- ${g.gene}: ${g.evidence} assocs, ${g.significant} sig, ${g.tissues} tissues [${g.sources.join(",")}]`,
    );
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Extended Context: Tissue-Level Evidence
// ---------------------------------------------------------------------------

function tissueEvidenceSection(ctx: VariantPromptContext): string | null {
  const lines: string[] = [];

  const qtls = ctx.qtlTissues;
  if (qtls?.length) {
    lines.push("## QTL Associations by Tissue");
    const sig = qtls.filter((t) => t.significant && t.significant > 0);
    lines.push(
      `- ${qtls.length} tissues total, ${sig.length} with significant QTLs`,
    );
    for (const t of topN(sig, 5)) {
      lines.push(`- ${t.tissue}: ${t.count} QTLs, ${t.significant} sig`);
    }
  }

  const cbp = ctx.chromBpnetTissues;
  if (cbp?.length) {
    if (lines.length) lines.push("");
    lines.push("## ChromBPNet Predictions by Tissue");
    lines.push(`- ${cbp.length} tissues with predictions`);
    for (const t of topN(cbp, 3)) {
      lines.push(
        `- ${t.tissue}: max_score=${t.maxValue?.toFixed(2) ?? "N/A"}, ${t.count} predictions`,
      );
    }
  }

  const signals = ctx.signalTissues;
  if (signals?.length) {
    if (lines.length) lines.push("");
    lines.push("## Tissue cCRE Activity");
    lines.push(`- ${signals.length} tissues with regulatory signals`);
    for (const t of topN(signals, 3)) {
      lines.push(
        `- ${t.tissue}: max_signal=${t.maxValue?.toFixed(1) ?? "N/A"}`,
      );
    }
  }

  const ai = ctx.allelicImbalanceTissues;
  if (ai?.length) {
    const sigAi = ai.filter((t) => t.significant && t.significant > 0);
    if (sigAi.length) {
      if (lines.length) lines.push("");
      lines.push(
        `## Allelic Imbalance: ${ai.length} tissues, ${sigAi.length} significant`,
      );
      for (const t of topN(sigAi, 3)) {
        lines.push(`- ${t.tissue}: ${t.significant} sig marks`);
      }
    }
  }

  const meth = ctx.methylationTissues;
  if (meth?.length) {
    const sigM = meth.filter((t) => t.significant && t.significant > 0);
    if (sigM.length) {
      if (lines.length) lines.push("");
      lines.push(
        `## Methylation: ${meth.length} tissues, ${sigM.length} significant`,
      );
    }
  }

  return lines.length ? lines.join("\n") : null;
}

// ---------------------------------------------------------------------------
// Extended Context: Region Evidence Counts
// ---------------------------------------------------------------------------

function regionEvidenceSection(
  counts: RegionCounts | undefined,
): string | null {
  if (!counts) return null;

  const parts: string[] = [];
  if (counts.signals) parts.push(`${counts.signals} cCRE signals`);
  if (counts.chromatin_states)
    parts.push(`${counts.chromatin_states} chromatin states`);
  if (counts.enhancer_genes)
    parts.push(`${counts.enhancer_genes} enhancer-gene links`);
  if (counts.accessibility_peaks)
    parts.push(`${counts.accessibility_peaks} accessibility peaks`);
  if (counts.loops) parts.push(`${counts.loops} chromatin loops`);
  if (counts.validated_enhancers)
    parts.push(`${counts.validated_enhancers} validated enhancers`);
  if (counts.crispr_screens)
    parts.push(`${counts.crispr_screens} CRISPR screens`);

  if (!parts.length) return null;
  return `## Region Evidence\n- ${parts.join(", ")}`;
}

// ---------------------------------------------------------------------------
// Extended Context: Region Overlaps (cCRE signal tracks, enhancer-gene maps)
// ---------------------------------------------------------------------------

function regionOverlapsSection(
  overlaps: RegionOverlaps | undefined,
): string | null {
  if (!overlaps) return null;
  const parts: string[] = [];
  if (overlaps.ccre_signals)
    parts.push(`${overlaps.ccre_signals} ENCODE cCRE signal tracks`);
  if (overlaps.enhancer_gene)
    parts.push(
      `${overlaps.enhancer_gene} enhancer-gene maps (ABC / ENCODE rE2G / EpiMap / GeneHancer)`,
    );
  if (overlaps.epiraction)
    parts.push(`${overlaps.epiraction} EPIraction enhancer-promoter contacts`);
  if (!parts.length) return null;
  return `## Region Overlaps\n- ${parts.join(", ")}`;
}

// ---------------------------------------------------------------------------
// Extended Context: Perturbation Evidence
//
// Surface availability of perturbation experiments (CRISPR screen,
// Perturb-seq, MAVE) on linked genes. This is functional validation
// rather than annotation — drives the validated_regulatory_candidate
// pattern in the frame classifier.
// ---------------------------------------------------------------------------

function perturbationSection(
  pert: PerturbationAvailability | undefined,
): string | null {
  if (!pert) return null;
  const parts: string[] = [];
  if (pert.crisprGenes)
    parts.push(`${pert.crisprGenes} linked genes with CRISPR-screen evidence`);
  if (pert.perturbSeqGenes)
    parts.push(`${pert.perturbSeqGenes} with Perturb-seq evidence`);
  if (pert.maveGenes)
    parts.push(`${pert.maveGenes} with MAVE / saturation-mutagenesis evidence`);
  if (!parts.length) return null;
  return `## Perturbation Evidence (functional validation)\n- ${parts.join(", ")}`;
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

function instructions(): string {
  // The data lines above already carry calibrated semantics inline (e.g.
  // "AlphaMissense: 0.087 — low Mendelian-disease pathogenicity prior...").
  // The instructions only need to teach the LLM HOW to use the Frame and
  // resolve cross-stream conflicts. Total prompt budget is 18000 chars
  // (cap in actions/ai-summary.ts). Even data-rich variants run ~10KB,
  // leaving comfortable headroom for context-heavy variants (deep PGS /
  // tissue / GWAS arrays).
  return `---

You are an expert variant interpreter. Write a focused, biologically committed narrative for ONE variant using the data above. The **Variant Frame** at the top names the variant's class and evidence pattern — use it to decide which evidence is the headline, not what the surrounding text is.

**Data fidelity**
Use only values from the data block. No fabrication. If a section has no evidence, one sentence and move on. Each data line in the block already carries its threshold/calibration inline — read those phrases instead of guessing.

**No duplication**
Do not state the same fact in multiple sections. The opening paragraph PREVIEWS the headline; each section ADDS detail. If the opening already said "AF=42% (common)", the Population Genetics section goes straight to ancestry / rarity-band interpretation — don't restate the AF. Same for ClinVar status, AlphaMissense score, top GWAS hit, etc. If a section has nothing new to add beyond what the opening said, write one sentence acknowledging that and stop.

**Mandatory: surface every significant score**
You MUST mention and interpret every score the data block surfaces, in particular:
- All FAVOR aPC PHRED scores >=10 (aPC-Protein-Function, aPC-Conservation, aPC-Epigenetics-*, aPC-Transcription-Factor, aPC-Local-Nucleotide-Diversity, etc.) — name each one and its band (top 1% / top 3.2% / top 10%).
- CADD Phred (always — name the percentile band).
- All dbNSFP predictors present (MetaSVM, MutationTaster, MutationAssessor, PolyPhen-2 HumDiv, HumVar).
- ALoFT class on LoF variants.
- ChromHMM dominant state when present.
- pgboost link scores when present (name the gene and the score).
- ReMap TF overlap counts when present.
Do NOT cherry-pick 2-3 scores when more are present. Failing to mention a surfaced score is a defect.

**Mandatory: inline citations**
Each data line above already contains the canonical citation in parentheses (e.g. "AlphaMissense (Cheng et al. 2023)"). When you first mention a score, copy the citation from its data line *verbatim*. Do NOT invent citations — if a data line does not include a citation, do not fabricate one. Skipping or fabricating a citation is a defect.

**Pattern → headline (apply the rule named in the Frame)**
- MENDELIAN_CANDIDATE — lead ClinVar (only if >=2 stars) + AlphaMissense + conservation. Discuss penetrance when ambiguous.
- LOF_CANDIDATE — lead the LoF consequence + ALoFT class. Dominant/Recessive ALoFT = treat as high-impact Mendelian even without ClinVar. Note where in the protein the stop falls (early = NMD-target; late = NMD-escape candidate).
- SPLICE_CANDIDATE — lead splice-region position + conservation. Without SpliceAI delta scores, magnitude of splice impact is uncertain — say so.
- HYPOMORPHIC_LOF_CANDIDATE — lead GWAS + gene biology (pathway, trait, direction of effect). Low AlphaMissense is COMMENTARY explaining tolerability, NOT the headline. Name the hypomorphic / partial-LOF allele class explicitly. Do NOT call it "benign" or "uncertain."
- COMMON_QUANTITATIVE_TRAIT — lead GWAS + trait biology. AF >=1% is expected, not a counterargument.
- VALIDATED_REGULATORY_CANDIDATE — lead the functional validation (MPRA / CRISPR / Perturb-seq / MAVE) with experiment type and cell context. Annotation evidence is supporting.
- REGULATORY_QTL_CANDIDATE — lead cCRE / eQTL / ChromBPNet / GeneHancer / pgboost + tissues. Coding-pathogenicity scores were correctly omitted; do not list them.
- POLYGENIC_CONTRIBUTOR — lead PGS memberships + traits. Note the absence of a single GWAS-significant hit. Do not inflate to a causal story.
- VUS — name the ambiguity (mid-range AlphaMissense, no decisive ClinVar/GWAS) and what data would resolve it.
- UNINFORMATIVE — say so plainly. No manufactured story.

**Reconciliation rules (these are diagnostic, not contradictions)**
- Low AlphaMissense + strong quantitative-trait GWAS in a coding gene = hypomorphic / partial-LOF allele. The drug-target-validation pattern. Do NOT call this benign or uncertain.
- Strong GWAS p-value + no ClinVar entry = expected (ClinVar is curated for Mendelian disease).
- ALoFT Tolerant on stop-gained = NMD-escape or C-terminal stop; do not assume LoF means pathogenic.
- High CADD + low AlphaMissense on missense = CADD's meta-signal is conservation/annotation, not protein effect. Defer to AlphaMissense / aPC-Protein-Function for protein impact.
- Multiple aPC-Epigenetics PHRED >=10 + cCRE = converging real regulatory element; chromatin context is the mechanism.
- pgboost >0.5 to a gene + eQTL same gene/tissue = converging enhancer-target nomination. Name the gene and tissue.
- ChromHMM Quies/Het + low aPC-Epigenetics + no cCRE = quiescent context; weak regulatory signal regardless of conservation.
- cCRE/GeneHancer overlap on a coding missense = annotation overlap, not a parallel mechanism.
- AF >5% (BA1) is benign for Mendelian disease ONLY. Common AF + large GWAS effect = expected for common-disease loci, frequency does not argue against importance.
- ClinVar P/LP at <=1 star = tentative anchor; flag the low review status.
- Low Umap k50 (<0.5) = multi-mapping region; discount chromatin/TF/mapping-derived scores.
- MaveDB/CRISPR/MPRA experimental result trumps any computational predictor.

**Output structure**
Begin with ONE paragraph (3–5 sentences, no header) committing to the most likely biological story for the Frame. Lead with the pattern's headline evidence — NOT a generic recap. Name hypomorphic/quantitative-trait/regulatory patterns in plain English. Use chr-pos-ref-alt notation (e.g. "19-44908822-C-T") and explain HGVS protein notation on first use ("p.Arg46Leu = arginine at 46 → leucine").

Then these #### sections in order, skipping (with one sentence) any without evidence:

#### Variant Identity & Genomic Context
Position, gene, molecular consequence, protein change if coding.

#### Clinical Significance
ClinVar (state review-star reliability), COSMIC if relevant, AlphaMissense if coding.

#### Predicted Functional Impact
Coding frames: emphasis follows pattern (CADD/SIFT/PolyPhen/MetaSVM/Grantham/aPC-Protein-Function/conservation are headline for mendelian_candidate, commentary for hypomorphic/quant-trait; ALoFT headline for coding_lof). Noncoding frames: lead FunSeq2/LINSIGHT/FATHMM-XF/aPC-Epigenetics/aPC-TF/aPC-Conservation; do NOT list omitted coding scores. ChromHMM state + distance-to-TSS anchor the framing; pgboost + ReMap support.

#### Regulatory Evidence
cCRE, GeneHancer, super-enhancer, ChromHMM, distance-to-TSS, ReMap TF, pgboost links, QTL/ChromBPNet by tissue, allelic-imbalance, methylation, region overlaps. Headline for regulatory/validated patterns; secondary or omitted for coding frames.

#### Trait Associations
GWAS top traits + p-values, fine-mapped credible sets (PIP >=0.5 noteworthy), PGS memberships. Headline for common_quantitative_trait / hypomorphic_lof_candidate / regulatory_qtl / validated_regulatory. For polygenic_contributor, lead the PGS pattern and note no single causal hit.

#### Population Genetics
gnomAD AF + band label. Do NOT conflate common-AF with benign outside Mendelian context. 1000G ancestry if informative.

#### Interpretation
ONE paragraph committing to the biological story. Lead with the Frame's headline evidence, not pathogenicity scores. Name the pattern explicitly when it's hypomorphic/quantitative-trait/regulatory.

#### Caveats
Falsification statements ("this interpretation would be wrong if X"), not hedging. Examples: "if the GWAS top hit is driven by LD with a separate causal variant"; "if ClinVar reanalysis downgrades the call"; "if the eQTL doesn't replicate in the relevant tissue."

**Style**: narrative prose, not bullets (except where required). Bold key findings. Translate jargon on first use. Explain WHY a score matters in this Frame, not just what it is.`;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function push(sections: string[], value: string | null): void {
  if (value) sections.push(value);
}

/** Add heading only if it's not already the first line */
function heading(lines: string[], h: string): void {
  if (lines.length === 0) lines.push(h);
}

// AlphaMissense (Cheng et al. 2023) was trained as a per-AA Mendelian-
// pathogenicity prior using population-frequency weak labels. The model
// was never trained on quantitative-trait or GWAS phenotype data. Saying
// "likely benign" leaks the training-objective label into the report as
// if it were ground truth about the variant's importance — but a low
// AlphaMissense score does NOT rule out hypomorphic / partial-LOF effects
// (e.g. PCSK9 R46L scores low yet drives lipid-trait GWAS signal). We
// emit the calibrated semantic instead.
function alphaMissenseSemantic(score: number): string {
  if (score >= 0.564) {
    return "high Mendelian-disease pathogenicity prior (>=0.564; ~90% precision against ClinVar)";
  }
  if (score <= 0.34) {
    return "low Mendelian-disease pathogenicity prior (<=0.34) — does NOT rule out hypomorphic / partial-LOF or quantitative-trait effects (model was not trained on GWAS phenotype data)";
  }
  return "ambiguous Mendelian-disease pathogenicity (0.34-0.564 grey zone)";
}

// Allele-frequency band labels follow ACMG/ClinGen-SVI conventions but
// kept domain-agnostic in the prompt so the LLM does not collapse them
// across question types:
//   <0.0001 (0.01%) — Mendelian-rare (PM2_Supporting region)
//   0.0001 - 0.005 — uncommon
//   0.005 - 0.01 — borderline (low-frequency variant)
//   0.01 - 0.05 — common (typical GWAS common-variant range)
//   >=0.05 — common; ACMG BA1 stand-alone benign for Mendelian disease
//           ONLY (irrelevant to GWAS / quantitative-trait causality)
function afBand(af: number): string {
  if (af < 0.0001) return "Mendelian-rare (<0.01%; PM2_Supporting range)";
  if (af < 0.005) return "rare (<0.5%)";
  if (af < 0.01) return "low-frequency (0.5-1%)";
  if (af < 0.05)
    return "common (>=1%; consistent with common-disease GWAS variant — frequency does NOT argue against causality on quantitative traits)";
  return "common (>=5%; ACMG BA1 stand-alone benign for Mendelian disease only — common-disease GWAS causality remains possible)";
}

// ClinVar review-status stars per NCBI. We surface the star count alongside
// clnsig because 0-1 star assertions are unreliable (substantial fraction
// downgraded on re-review per ClinGen SVI).
function clinvarReviewStars(s: string | null | undefined): number {
  if (!s) return 0;
  const t = s.toLowerCase();
  if (t.includes("practice_guideline") || t.includes("practice guideline"))
    return 4;
  if (t.includes("expert_panel") || t.includes("expert panel")) return 3;
  if (t.includes("multiple_submitters") || t.includes("multiple submitters"))
    return 2;
  if (t.includes("single_submitter") || t.includes("single submitter"))
    return 1;
  return 0;
}

/** Sort by significant (desc), then count (desc), return top N */
function topN(stats: TissueStat[], n: number): TissueStat[] {
  return [...stats]
    .sort(
      (a, b) =>
        (b.significant ?? 0) - (a.significant ?? 0) || b.count - a.count,
    )
    .slice(0, n);
}
