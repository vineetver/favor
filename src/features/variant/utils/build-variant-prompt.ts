import type { Variant } from "../types/variant";

// ---------------------------------------------------------------------------
// Context: regulatory, GWAS, and target gene evidence fetched server-side
// ---------------------------------------------------------------------------

export interface VariantPromptContext {
  /** GWAS catalog hits */
  gwas?: GwasSummary;
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
  const sections: string[] = [];

  sections.push(coreIdentity(variant));
  push(sections, clinicalSignificance(variant));
  push(sections, pathogenicityScores(variant));
  push(sections, populationFrequency(variant));
  push(sections, regulatoryAnnotations(variant));

  if (context) {
    push(sections, gwasSection(context.gwas));
    push(sections, targetGenesSection(context.targetGenes));
    push(sections, tissueEvidenceSection(context));
    push(sections, regionEvidenceSection(context.regionCounts));
  }

  return `${sections.join("\n\n")}\n\n---\n\n${instructions()}`;
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
// Tier 2: Clinical Significance
// ---------------------------------------------------------------------------

function clinicalSignificance(v: Variant): string | null {
  const lines: string[] = [];

  if (v.clinvar) {
    const cv = v.clinvar;
    if (cv.clnsig?.length || cv.clndn?.length || cv.origin_decoded?.length) {
      lines.push("## Clinical Significance");
      if (cv.clnsig?.length) lines.push(`- ClinVar: ${cv.clnsig.join(", ")}`);
      if (cv.clndn?.length) {
        const conds = cv.clndn.filter(Boolean).slice(0, 5);
        lines.push(`- Conditions: ${conds.join("; ")}${cv.clndn.length > 5 ? ` (+${cv.clndn.length - 5} more)` : ""}`);
      }
      if (cv.origin_decoded?.length) lines.push(`- Origin: ${cv.origin_decoded.join(", ")}`);
      if (cv.clnrevstat) lines.push(`- Review: ${cv.clnrevstat}`);
    }
  }

  if (v.cosmic?.sample_count) {
    heading(lines, "## Clinical Significance");
    lines.push(`- COSMIC: ${v.cosmic.sample_count} tumor samples${v.cosmic.tier ? `, tier ${v.cosmic.tier}` : ""}`);
  }

  const am = v.alphamissense?.max_pathogenicity;
  if (am != null) {
    heading(lines, "## Clinical Significance");
    const cls = v.alphamissense?.predictions?.[0]?.class ?? alphaMissenseClass(am);
    lines.push(`- AlphaMissense: ${am.toFixed(3)} (${cls})`);
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

// ---------------------------------------------------------------------------
// Tier 3: Pathogenicity Scores
// ---------------------------------------------------------------------------

function pathogenicityScores(v: Variant): string | null {
  const lines: string[] = [];
  const m = v.main;

  if (m?.cadd?.phred != null && m.cadd.phred > 10) {
    lines.push("## Pathogenicity Scores");
    lines.push(`- CADD Phred: ${m.cadd.phred.toFixed(1)}`);
  }

  if (m?.protein_predictions) {
    const pp = m.protein_predictions;
    const preds: string[] = [];
    if (pp.sift_cat) preds.push(`SIFT: ${pp.sift_cat}`);
    if (pp.polyphen_cat) preds.push(`PolyPhen: ${pp.polyphen_cat}`);
    if (preds.length) {
      heading(lines, "## Pathogenicity Scores");
      lines.push(`- Protein Impact: ${preds.join(", ")}`);
    }
  }

  if (m?.conservation) {
    const c = m.conservation;
    if ((c.mamphylop != null && c.mamphylop > 2) || (c.verphylop != null && c.verphylop > 2)) {
      heading(lines, "## Pathogenicity Scores");
      const s: string[] = [];
      if (c.mamphylop != null) s.push(`mammalian: ${c.mamphylop.toFixed(2)}`);
      if (c.verphylop != null) s.push(`vertebrate: ${c.verphylop.toFixed(2)}`);
      lines.push(`- PhyloP: ${s.join(", ")}`);
    }
  }

  if (m?.gerp?.rs != null && m.gerp.rs > 2) {
    heading(lines, "## Pathogenicity Scores");
    lines.push(`- GERP++: ${m.gerp.rs.toFixed(2)}`);
  }

  if (v.linsight != null && v.linsight > 0.5) {
    heading(lines, "## Pathogenicity Scores");
    lines.push(`- LINSIGHT: ${v.linsight.toFixed(3)}`);
  }

  if (v.fathmm_xf != null && v.fathmm_xf > 0.5) {
    heading(lines, "## Pathogenicity Scores");
    lines.push(`- FATHMM-XF: ${v.fathmm_xf.toFixed(3)}`);
  }

  return lines.length > 1 ? lines.join("\n") : null;
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
    const rarity = gnomad.af < 0.001 ? " (very rare)" : gnomad.af < 0.01 ? " (rare)" : "";
    lines.push(`- gnomAD AF: ${pct}%${rarity}`);
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
    lines.push(`- cCRE: ${v.ccre.annotations}`);
  }

  if (v.genehancer?.id) {
    heading(lines, "## Regulatory Annotations");
    const targets = v.genehancer.targets?.slice(0, 3).map((t) => t.gene).filter(Boolean) ?? [];
    lines.push(`- GeneHancer: ${v.genehancer.id}${targets.length ? ` → ${targets.join(", ")}` : ""}`);
  }

  if (v.super_enhancer?.ids?.length) {
    heading(lines, "## Regulatory Annotations");
    lines.push(`- Super Enhancer: ${v.super_enhancer.ids.length} regions`);
  }

  if (v.cage?.cage_promoter || v.cage?.cage_enhancer) {
    heading(lines, "## Regulatory Annotations");
    if (v.cage.cage_promoter) lines.push(`- CAGE Promoter: ${v.cage.cage_promoter}`);
    if (v.cage.cage_enhancer) lines.push(`- CAGE Enhancer: ${v.cage.cage_enhancer}`);
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

// ---------------------------------------------------------------------------
// Extended Context: GWAS
// ---------------------------------------------------------------------------

function gwasSection(gwas: GwasSummary | undefined): string | null {
  if (!gwas || !gwas.totalAssociations) return null;

  const lines = ["## GWAS Associations"];
  lines.push(`- ${gwas.totalAssociations} associations, ${gwas.uniqueTraits} traits, ${gwas.uniqueStudies} studies`);

  for (const hit of gwas.top.slice(0, 5)) {
    lines.push(`- ${hit.trait} (p=${hit.pvalue.toExponential(1)})`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Extended Context: Target Genes
// ---------------------------------------------------------------------------

function targetGenesSection(genes: TargetGeneSummary[] | undefined): string | null {
  if (!genes?.length) return null;

  const lines = ["## Target Genes (variant → gene regulatory evidence)"];
  for (const g of genes.slice(0, 5)) {
    lines.push(`- ${g.gene}: ${g.evidence} assocs, ${g.significant} sig, ${g.tissues} tissues [${g.sources.join(",")}]`);
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
    lines.push(`- ${qtls.length} tissues total, ${sig.length} with significant QTLs`);
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
      lines.push(`- ${t.tissue}: max_score=${t.maxValue?.toFixed(2) ?? "N/A"}, ${t.count} predictions`);
    }
  }

  const signals = ctx.signalTissues;
  if (signals?.length) {
    if (lines.length) lines.push("");
    lines.push("## Tissue cCRE Activity");
    lines.push(`- ${signals.length} tissues with regulatory signals`);
    for (const t of topN(signals, 3)) {
      lines.push(`- ${t.tissue}: max_signal=${t.maxValue?.toFixed(1) ?? "N/A"}`);
    }
  }

  const ai = ctx.allelicImbalanceTissues;
  if (ai?.length) {
    const sigAi = ai.filter((t) => t.significant && t.significant > 0);
    if (sigAi.length) {
      if (lines.length) lines.push("");
      lines.push(`## Allelic Imbalance: ${ai.length} tissues, ${sigAi.length} significant`);
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
      lines.push(`## Methylation: ${meth.length} tissues, ${sigM.length} significant`);
    }
  }

  return lines.length ? lines.join("\n") : null;
}

// ---------------------------------------------------------------------------
// Extended Context: Region Evidence Counts
// ---------------------------------------------------------------------------

function regionEvidenceSection(counts: RegionCounts | undefined): string | null {
  if (!counts) return null;

  const parts: string[] = [];
  if (counts.signals) parts.push(`${counts.signals} cCRE signals`);
  if (counts.chromatin_states) parts.push(`${counts.chromatin_states} chromatin states`);
  if (counts.enhancer_genes) parts.push(`${counts.enhancer_genes} enhancer-gene links`);
  if (counts.accessibility_peaks) parts.push(`${counts.accessibility_peaks} accessibility peaks`);
  if (counts.loops) parts.push(`${counts.loops} chromatin loops`);
  if (counts.validated_enhancers) parts.push(`${counts.validated_enhancers} validated enhancers`);
  if (counts.crispr_screens) parts.push(`${counts.crispr_screens} CRISPR screens`);

  if (!parts.length) return null;
  return `## Region Evidence\n- ${parts.join(", ")}`;
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

function instructions(): string {
  return `**Instructions**: Based on the variant data above, provide a comprehensive summary:

1. **Overview**: What is this variant, where is it located, and what gene(s) does it affect?
2. **Clinical Significance**: Pathogenicity classification, associated conditions, somatic relevance.
3. **Functional Impact**: Predicted effects from scores, protein impact, and conservation.
4. **Regulatory Evidence**: Is this variant in a regulatory element? What tissues show activity? QTL associations? Target genes it may regulate?
5. **Population Context**: Allele frequency, population-specific patterns.
6. **Key Takeaways**: 2-3 bullet points highlighting the most important and unique findings.

Emphasize the regulatory and tissue-specific context — this is what makes each variant biologically unique. Be concise but insightful.`;
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

function alphaMissenseClass(score: number): string {
  if (score >= 0.564) return "likely pathogenic";
  if (score <= 0.34) return "likely benign";
  return "ambiguous";
}

/** Sort by significant (desc), then count (desc), return top N */
function topN(stats: TissueStat[], n: number): TissueStat[] {
  return [...stats]
    .sort((a, b) => (b.significant ?? 0) - (a.significant ?? 0) || b.count - a.count)
    .slice(0, n);
}
