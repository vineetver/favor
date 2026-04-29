import type { Variant } from "../types/variant";
import type { VariantPromptContext } from "./build-variant-prompt";

// ---------------------------------------------------------------------------
// Variant frame: deterministic class + evidence pattern, computed in TS so
// the LLM doesn't have to infer the variant's class from scattered fields
// before deciding how to interpret it.
// ---------------------------------------------------------------------------

export type VariantFrame =
  | { kind: "coding_missense"; protein: string | null }
  | { kind: "coding_lof"; protein: string | null; lofType: string }
  | { kind: "coding_synonymous_or_other" }
  | { kind: "splice_region" }
  | { kind: "regulatory_noncoding" }
  | { kind: "intergenic" }
  | { kind: "unknown" };

export type EvidencePattern =
  | "mendelian_candidate"
  | "lof_candidate"
  | "splice_candidate"
  | "common_quantitative_trait"
  | "hypomorphic_lof_candidate"
  | "regulatory_qtl_candidate"
  | "validated_regulatory_candidate"
  | "polygenic_contributor"
  | "vus"
  | "uninformative";

export interface FrameResult {
  frame: VariantFrame;
  pattern: EvidencePattern;
  /** One-line description of the headline evidence stream, for the prompt. */
  headline: string;
  /** Supporting evidence summary, for the prompt. */
  supporting: string;
  /** Symbolic name of the rule the LLM should apply (matches instructions). */
  rule: string;
}

// AlphaMissense calibration thresholds from Cheng et al. 2023 (Science).
// 0.34 / 0.564 are the canonical likely-benign / likely-pathogenic cutoffs.
// Critical caveat: AlphaMissense was trained as a Mendelian-pathogenicity
// prior using population-frequency weak labels — a low score does NOT rule
// out hypomorphic / partial-LOF effects, and the model was never trained
// on quantitative-trait or GWAS phenotype data.
const AM_BENIGN_MAX = 0.34;
const AM_PATHOGENIC_MIN = 0.564;

// Allele-frequency bands.
// PM2_Supporting (ClinGen SVI 2020): rare for Mendelian dominant if < 0.01%.
// We use a slightly looser 0.5% as the "rare" cutoff for frame purposes —
// the goal is to separate Mendelian-rare from common-quantitative-trait,
// not to apply ACMG criteria. BA1 (stand-alone benign for Mendelian) is
// > 5% but is irrelevant to GWAS / quantitative-trait causality.
const RARE_AF = 0.005;
const COMMON_AF = 0.01; // conventional GWAS "common" floor (MAF >= 1%)

// Pe'er et al. genome-wide significance and conventional suggestive bound.
const GENOME_WIDE_SIG_P = 5e-8;
const SUGGESTIVE_REG_P = 1e-6;

export function computeVariantFrame(
  variant: Variant,
  context?: VariantPromptContext,
): FrameResult {
  const frame = deriveFrame(variant);
  const af = pickAf(variant);
  const am = variant.alphamissense?.max_pathogenicity ?? null;
  const topGwasP = context?.gwas?.top?.[0]?.pvalue ?? null;
  const topGwasTrait = context?.gwas?.top?.[0]?.trait ?? null;
  const gwasCount = context?.gwas?.totalAssociations ?? 0;
  const hasClinvarPLP = hasPathogenicClinvar(variant);
  const hasRegulatoryEvidence = hasRegEvidence(variant, context);
  const aloftClass = aloftSeverityClass(variant);
  const hasValidation = hasValidationEvidence(variant, context);
  const pgsHits = context?.pgs?.totalHits ?? 0;
  const pgsTraits = context?.pgs?.uniqueTraits ?? 0;

  const pattern = decidePattern({
    frame,
    af,
    am,
    topGwasP,
    hasClinvarPLP,
    hasRegulatoryEvidence,
    aloftClass,
    hasValidation,
    pgsHits,
    pgsTraits,
  });

  return {
    frame,
    pattern,
    headline: headlineFor(pattern, {
      topGwasP,
      topGwasTrait,
      gwasCount,
      am,
      hasClinvarPLP,
      hasRegulatoryEvidence,
      aloftClass,
      hasValidation,
      pgsHits,
      pgsTraits,
    }),
    supporting: supportingFor({
      af,
      am,
      hasClinvarPLP,
      frame,
      aloftClass,
      hasValidation,
    }),
    rule: ruleNameFor(pattern),
  };
}

// ---------------------------------------------------------------------------
// Class derivation from consequence terms
// ---------------------------------------------------------------------------

function deriveFrame(v: Variant): VariantFrame {
  // FAVOR populates `consequence` for coding variants (e.g. "Nonsynonymous
  // SNV", "Stopgain") and `region_type` for the gene-model category
  // ("Intronic", "Intergenic", "Exonic", "UTR", "Splicing"). For noncoding
  // variants `consequence` is often null while `region_type` carries the
  // signal. Combine both fields across genecode/refseq/ucsc so we don't
  // misclassify intronic / intergenic / UTR variants as `unknown` (which
  // would route them to `uninformative` and skip every regulatory rule).
  const consequence = [
    v.genecode?.consequence,
    v.refseq?.consequence,
    v.ucsc?.consequence,
    v.genecode?.region_type,
    v.refseq?.region_type,
    v.ucsc?.region_type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!consequence) return { kind: "unknown" };

  if (
    consequence.includes("missense") ||
    consequence.includes("nonsynonymous")
  ) {
    return { kind: "coding_missense", protein: pickProtein(v) };
  }

  // Predicted loss-of-function (pLoF) — stop-gained, stop-lost, frameshift,
  // start-lost. These are the canonical haploinsufficiency / recessive
  // disease drivers; ALoFT (Balasubramanian et al. 2017) classifies them
  // further into Dominant / Recessive / Tolerant. Worth a dedicated frame
  // because the interpretation rule differs from missense.
  if (
    consequence.includes("stopgain") ||
    consequence.includes("stoploss") ||
    consequence.includes("stop_gained") ||
    consequence.includes("stop_lost") ||
    consequence.includes("frameshift") ||
    consequence.includes("start_lost")
  ) {
    return {
      kind: "coding_lof",
      protein: pickProtein(v),
      lofType: classifyLofType(consequence),
    };
  }

  if (consequence.includes("synonymous") || consequence.includes("inframe")) {
    return { kind: "coding_synonymous_or_other" };
  }

  if (consequence.includes("splice")) {
    return { kind: "splice_region" };
  }

  if (
    consequence.includes("intergenic") ||
    consequence.includes("upstream") ||
    consequence.includes("downstream")
  ) {
    return { kind: "intergenic" };
  }

  if (
    consequence.includes("intron") ||
    consequence.includes("utr") ||
    consequence.includes("noncoding") ||
    consequence.includes("non_coding") ||
    consequence.includes("regulatory") ||
    consequence.includes("ncrna")
  ) {
    return { kind: "regulatory_noncoding" };
  }

  return { kind: "unknown" };
}

function classifyLofType(c: string): string {
  if (c.includes("stop_gained") || c.includes("stopgain")) return "stop-gained";
  if (c.includes("stop_lost") || c.includes("stoploss")) return "stop-lost";
  if (c.includes("frameshift")) return "frameshift";
  if (c.includes("start_lost")) return "start-lost";
  return "pLoF";
}

function pickProtein(v: Variant): string | null {
  const amProt = v.alphamissense?.predictions?.[0]?.protein_variant;
  if (amProt) return amProt;

  const hgvsp =
    v.genecode?.transcripts?.[0]?.hgvsp ??
    v.refseq?.exonic_details?.[0]?.hgvsp ??
    v.ucsc?.exonic_details?.[0]?.hgvsp;
  return hgvsp ?? null;
}

// ---------------------------------------------------------------------------
// Pattern decision
// ---------------------------------------------------------------------------

interface PatternInputs {
  frame: VariantFrame;
  af: number | null;
  am: number | null;
  topGwasP: number | null;
  hasClinvarPLP: boolean;
  hasRegulatoryEvidence: boolean;
  aloftClass: AloftClass;
  hasValidation: boolean;
  pgsHits: number;
  pgsTraits: number;
}

function decidePattern(inputs: PatternInputs): EvidencePattern {
  const {
    frame,
    af,
    am,
    topGwasP,
    hasClinvarPLP,
    hasRegulatoryEvidence,
    aloftClass,
    hasValidation,
    pgsHits,
    pgsTraits,
  } = inputs;
  const isCoding =
    frame.kind === "coding_missense" ||
    frame.kind === "coding_lof" ||
    frame.kind === "coding_synonymous_or_other" ||
    frame.kind === "splice_region";
  const strongGwas = topGwasP != null && topGwasP < GENOME_WIDE_SIG_P;
  const suggestiveGwas = topGwasP != null && topGwasP < SUGGESTIVE_REG_P;
  const isRare = af != null && af < RARE_AF;
  const isCommon = af != null && af >= COMMON_AF;

  // 1. Mendelian: rare + ClinVar P/LP at >=2 stars. Most specific.
  if (hasClinvarPLP && (isRare || af == null)) {
    return "mendelian_candidate";
  }

  // 2. LoF candidate: stop_gained / frameshift / etc. + ALoFT predicts
  //    Dominant or Recessive disease impact + rare. Strong Mendelian
  //    framing even when no ClinVar entry exists yet.
  if (
    frame.kind === "coding_lof" &&
    (isRare || af == null) &&
    (aloftClass === "dominant" || aloftClass === "recessive")
  ) {
    return "lof_candidate";
  }

  // 3. Splice candidate: variant in splice region. (We do not have SpliceAI
  //    delta scores in this payload — if added later, gate on ds_max >= 0.5.)
  if (frame.kind === "splice_region") {
    return "splice_candidate";
  }

  // 4. Hypomorphic LOF: coding missense, low AlphaMissense, no Mendelian
  //    anchor, but a genome-wide-significant GWAS signal. Textbook
  //    drug-target pattern (PCSK9 R46L). Do NOT collapse this into "vus."
  if (
    frame.kind === "coding_missense" &&
    !hasClinvarPLP &&
    am != null &&
    am < AM_BENIGN_MAX &&
    strongGwas
  ) {
    return "hypomorphic_lof_candidate";
  }

  // 5. Common quantitative-trait variant.
  if (isCoding && isCommon && strongGwas) {
    return "common_quantitative_trait";
  }

  // 6. Validated regulatory: noncoding/intergenic with MPRA / CRISPR /
  //    Perturb-seq / MAVE evidence. Stronger than purely-annotated
  //    regulatory_qtl_candidate.
  if (
    (frame.kind === "regulatory_noncoding" || frame.kind === "intergenic") &&
    hasValidation
  ) {
    return "validated_regulatory_candidate";
  }

  // 7. Regulatory QTL candidate: noncoding/intergenic with cCRE / eQTL /
  //    chromatin / suggestive GWAS.
  if (
    (frame.kind === "regulatory_noncoding" || frame.kind === "intergenic") &&
    (hasRegulatoryEvidence || suggestiveGwas)
  ) {
    return "regulatory_qtl_candidate";
  }

  // 8. Polygenic contributor: many PGS effect-weights for varied traits
  //    but no single GWAS-significant hit. Variant contributes additively
  //    to multiple polygenic scores; not a Mendelian or single-trait story.
  if (pgsHits >= 5 && pgsTraits >= 3 && !strongGwas) {
    return "polygenic_contributor";
  }

  // 9. Genuine ambiguity: missense in mid-range AlphaMissense.
  if (
    frame.kind === "coding_missense" &&
    am != null &&
    am >= AM_BENIGN_MAX &&
    am < AM_PATHOGENIC_MIN
  ) {
    return "vus";
  }

  return "uninformative";
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

function pickAf(v: Variant): number | null {
  return (
    v.gnomad_genome?.af ??
    v.gnomad_exome?.af ??
    v.tg?.tg_all ??
    v.bravo?.bravo_af ??
    null
  );
}

// ClinVar review-status stars (NCBI):
//   0 — no assertion criteria / no assertion provided
//   1 — criteria provided, single submitter
//   2 — criteria provided, multiple submitters, no conflicts
//   3 — reviewed by expert panel
//   4 — practice guideline
// ClinGen SVI guidance: 0–1 star assertions are not authoritative — a
// substantial fraction get downgraded on re-review. We require >= 2 stars
// before treating clnsig as a Mendelian anchor.
function clinvarStars(clnrevstat: string | null | undefined): number {
  if (!clnrevstat) return 0;
  const s = clnrevstat.toLowerCase();
  if (s.includes("practice_guideline") || s.includes("practice guideline"))
    return 4;
  if (s.includes("expert_panel") || s.includes("expert panel")) return 3;
  if (s.includes("multiple_submitters") || s.includes("multiple submitters"))
    return 2;
  if (s.includes("single_submitter") || s.includes("single submitter"))
    return 1;
  return 0;
}

function hasPathogenicClinvar(v: Variant): boolean {
  const sigs = v.clinvar?.clnsig;
  if (!sigs?.length) return false;
  if (clinvarStars(v.clinvar?.clnrevstat) < 2) return false;
  return sigs.some((s) => {
    if (!s) return false;
    const lower = s.toLowerCase();
    return (
      lower.includes("pathogenic") &&
      !lower.includes("conflicting") &&
      !lower.includes("non-pathogenic")
    );
  });
}

function hasRegEvidence(
  v: Variant,
  context: VariantPromptContext | undefined,
): boolean {
  if (v.ccre?.annotations) return true;
  if (v.genehancer?.id) return true;
  if (v.cage?.cage_promoter || v.cage?.cage_enhancer) return true;
  if (v.super_enhancer?.ids?.length) return true;
  // pgboost: predicted enhancer-gene link (Sethi 2020). Score > 0.5 with
  // top percentile is a high-confidence regulatory predictor.
  if (v.pgboost?.some((p) => (p.score ?? 0) >= 0.5)) return true;
  // ChromHMM dominant state in an active enhancer / promoter / TSS class
  // (states 1-4, 9-18, 19, 22-23 by Roadmap 25-state model) is real
  // regulatory evidence even when no cCRE / GeneHancer call exists.
  if (hasActiveChromHmmState(v)) return true;
  // ReMap TF ChIP-seq overlap (any TF binding here in any cell line) is
  // direct evidence of regulatory occupancy.
  if ((v.main?.remap?.overlap_tf ?? 0) > 0) return true;
  // Top FAVOR aPC epigenetics PHRED >=10 = top 10% chromatin signal.
  const apc = v.apc;
  if (apc) {
    if ((apc.epigenetics_active ?? 0) >= 10) return true;
    if ((apc.transcription_factor ?? 0) >= 10) return true;
  }
  if (context?.qtlTissues?.some((t) => (t.significant ?? 0) > 0)) return true;
  if (context?.signalTissues?.some((t) => t.count > 0)) return true;
  if (context?.chromBpnetTissues?.some((t) => t.count > 0)) return true;
  if (
    context?.regionOverlaps?.enhancer_gene ||
    context?.regionOverlaps?.epiraction
  ) {
    return true;
  }
  return false;
}

// Active chromatin states from Roadmap 25-state ChromHMM:
//   1-4 = TssA / promoter classes
//   9-18 = transcribed-regulatory / enhancer classes
//   19 = primary DNase
//   22-23 = poised / bivalent promoter
// Repressed (24-25), heterochromatin (21), quiescent (25) are NOT active.
const ACTIVE_CHROMHMM_STATES = new Set([
  1, 2, 3, 4, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 22, 23,
]);

function hasActiveChromHmmState(v: Variant): boolean {
  const ch = v.main?.chromhmm;
  if (!ch) return false;
  let bestKey = 0;
  let bestVal = -Infinity;
  for (let i = 1; i <= 25; i++) {
    const val = (ch as Record<string, number | null | undefined>)[`e${i}`];
    if (val != null && val > bestVal) {
      bestVal = val;
      bestKey = i;
    }
  }
  if (bestVal <= 0 || !bestKey) return false;
  return ACTIVE_CHROMHMM_STATES.has(bestKey);
}

// MPRA / CRISPR / Perturb-seq / MAVE — actual functional validation in a
// cell context, distinct from annotation-only regulatory evidence. We
// route these into a dedicated `validated_regulatory_candidate` pattern
// so the LLM treats them as the headline rather than secondary annotation.
function hasValidationEvidence(
  _v: Variant,
  context: VariantPromptContext | undefined,
): boolean {
  if (
    context?.regionCounts?.validated_enhancers ||
    context?.regionCounts?.crispr_screens
  ) {
    return true;
  }
  const p = context?.perturbation;
  if (p) {
    if (
      (p.crisprGenes ?? 0) > 0 ||
      (p.perturbSeqGenes ?? 0) > 0 ||
      (p.maveGenes ?? 0) > 0
    ) {
      return true;
    }
  }
  // ALoFT lives in the LoF / coding pathway, not regulatory validation.
  return false;
}

// ALoFT (Annotation of LoF Transcripts; Balasubramanian et al. Nat Commun
// 2017) classifies pLoF variants into three classes:
//   Dominant (DM)  — predicted high-impact, dominant disease-relevant
//   Recessive (RC) — predicted recessive disease-relevant
//   Tolerant (TL)  — no detectable phenotype expected
// The `aloft.description` field carries the predicted class label; the
// score is the classifier confidence. We extract a coarse class label.
export type AloftClass = "dominant" | "recessive" | "tolerant" | "unknown";

function aloftSeverityClass(v: Variant): AloftClass {
  const desc = v.aloft?.description?.toLowerCase() ?? "";
  if (!desc) return "unknown";
  if (desc.includes("dominant")) return "dominant";
  if (desc.includes("recessive")) return "recessive";
  if (desc.includes("tolerant") || desc.includes("benign")) return "tolerant";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Headline / supporting / rule labels
// ---------------------------------------------------------------------------

interface HeadlineInputs {
  topGwasP: number | null;
  topGwasTrait: string | null;
  gwasCount: number;
  am: number | null;
  hasClinvarPLP: boolean;
  hasRegulatoryEvidence: boolean;
  aloftClass: AloftClass;
  hasValidation: boolean;
  pgsHits: number;
  pgsTraits: number;
}

function headlineFor(pattern: EvidencePattern, inp: HeadlineInputs): string {
  const gwasBlurb =
    inp.topGwasP != null
      ? `${inp.gwasCount} GWAS associations, top p=${inp.topGwasP.toExponential(1)}${inp.topGwasTrait ? ` for ${inp.topGwasTrait}` : ""}`
      : "no GWAS hits";

  switch (pattern) {
    case "mendelian_candidate":
      return `ClinVar pathogenic/likely-pathogenic at >=2 stars${inp.am != null ? ` + AlphaMissense ${inp.am.toFixed(2)}` : ""}`;
    case "lof_candidate":
      return `Predicted loss-of-function (ALoFT class: ${inp.aloftClass}) — high-impact Mendelian framing without curated ClinVar entry`;
    case "splice_candidate":
      return "Splice-region variant — splicing impact analysis is the headline";
    case "hypomorphic_lof_candidate":
      return `${gwasBlurb} (low Mendelian-pathogenicity AlphaMissense in coding region — consistent with hypomorphic / partial-LOF allele)`;
    case "common_quantitative_trait":
      return `${gwasBlurb} (common variant, quantitative-trait architecture)`;
    case "validated_regulatory_candidate":
      return `Functionally validated regulatory variant (MPRA / CRISPR / Perturb-seq / MAVE)${inp.topGwasP != null ? `; ${gwasBlurb}` : ""}`;
    case "regulatory_qtl_candidate":
      return inp.hasRegulatoryEvidence
        ? `Regulatory annotation (cCRE / QTL / enhancer evidence)${inp.topGwasP != null ? `; ${gwasBlurb}` : ""}`
        : `${gwasBlurb} in noncoding region`;
    case "polygenic_contributor":
      return `Polygenic contributor: ${inp.pgsHits} PGS weights across ${inp.pgsTraits} traits, no single GWAS-significant hit`;
    case "vus":
      return "Genuinely ambiguous: AlphaMissense in mid-range, no decisive ClinVar or GWAS signal";
    case "uninformative":
      return "No dominant evidence stream";
  }
}

function supportingFor(opts: {
  af: number | null;
  am: number | null;
  hasClinvarPLP: boolean;
  frame: VariantFrame;
  aloftClass: AloftClass;
  hasValidation: boolean;
}): string {
  const parts: string[] = [];
  if (opts.af != null) {
    const pct = (opts.af * 100).toFixed(3);
    const band =
      opts.af >= COMMON_AF
        ? "common"
        : opts.af >= RARE_AF
          ? "uncommon"
          : "rare";
    parts.push(`AF=${pct}% (${band})`);
  }
  if (opts.am != null) {
    parts.push(`AlphaMissense=${opts.am.toFixed(3)}`);
  }
  if (opts.aloftClass !== "unknown") {
    parts.push(`ALoFT=${opts.aloftClass}`);
  }
  parts.push(opts.hasClinvarPLP ? "ClinVar P/LP present" : "no ClinVar P/LP");
  if (opts.hasValidation) parts.push("functional validation evidence");
  return parts.join(", ");
}

function ruleNameFor(pattern: EvidencePattern): string {
  return pattern.toUpperCase();
}

// ---------------------------------------------------------------------------
// Frame section text (rendered into the prompt)
// ---------------------------------------------------------------------------

export function frameSection(result: FrameResult): string {
  const lines = ["## Variant Frame"];
  const f = result.frame;
  const classLabel =
    f.kind === "coding_missense"
      ? `coding_missense${f.protein ? ` (${f.protein})` : ""}`
      : f.kind === "coding_lof"
        ? `coding_lof: ${f.lofType}${f.protein ? ` (${f.protein})` : ""}`
        : f.kind;
  lines.push(`- Class: ${classLabel}`);
  lines.push(`- Evidence pattern: ${result.pattern}`);
  lines.push(`- Headline evidence: ${result.headline}`);
  lines.push(`- Supporting evidence: ${result.supporting}`);
  lines.push(
    `- Interpretation rule: ${result.rule} (apply the matching rule from the instructions)`,
  );
  return lines.join("\n");
}
