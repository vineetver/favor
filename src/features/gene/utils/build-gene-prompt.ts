import type { Gene } from "../types";

// ---------------------------------------------------------------------------
// Context: regulatory & tissue evidence fetched server-side
// ---------------------------------------------------------------------------

export interface GenePromptContext {
  /** Region-level evidence counts across the gene body */
  regionCounts?: RegionCounts;
  /** cCRE signals grouped by tissue */
  signalTissues?: TissueStat[];
  /** Chromatin states grouped by tissue */
  chromatinTissues?: TissueStat[];
  /** Enhancer-gene predictions grouped by tissue */
  enhancerTissues?: TissueStat[];
  /** Accessibility peaks grouped by tissue */
  accessibilityTissues?: TissueStat[];
  /** Chromatin loops grouped by tissue */
  loopTissues?: TissueStat[];
  /** cCRE-gene links grouped by tissue */
  ccreLinkTissues?: TissueStat[];
  /** CRISPR perturbation screens grouped by tissue */
  crisprTissues?: TissueStat[];
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
  ase?: number;
  validated_enhancers?: number;
  crispr_screens?: number;
  perturb_seq?: number;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Builds a compact, data-dense prompt for gene summarization.
 *
 * Strategy: terse key:value lines, top-N with counts, no prose.
 * Target: ~2500 tokens of pure signal for the LLM.
 */
export function buildGenePrompt(
  gene: Gene,
  context?: GenePromptContext,
): string {
  const sections: string[] = [];

  sections.push(coreIdentity(gene));
  push(sections, geneFunction(gene));
  push(sections, constraintScores(gene));
  push(sections, diseasePhenotype(gene));
  push(sections, pathways(gene));
  push(sections, expression(gene));
  push(sections, essentiality(gene));
  push(sections, druggability(gene));
  push(sections, safetyAndCancer(gene));
  push(sections, proteinInfo(gene));

  if (context) {
    push(sections, regulatoryEvidence(context));
    push(sections, regionEvidenceSection(context.regionCounts));
  }

  return `${sections.join("\n\n")}\n\n---\n\n${instructions()}`;
}

// ---------------------------------------------------------------------------
// Gene annotation sections
// ---------------------------------------------------------------------------

function coreIdentity(g: Gene): string {
  const lines = ["## Gene Identity"];
  lines.push(`- Symbol: ${g.gene_symbol}`);
  lines.push(`- Ensembl: ${g.id}`);
  lines.push(`- Location: chr${g.chromosome}:${g.start_position}-${g.end_position} (${g.strand})`);
  lines.push(`- Type: ${g.gene_type}`);
  if (g.function_description) {
    lines.push(`- Function: ${truncate(g.function_description, 300)}`);
  }
  if (g.aliases) lines.push(`- Aliases: ${truncate(g.aliases, 100)}`);
  return lines.join("\n");
}

function geneFunction(g: Gene): string | null {
  const go = g.go;
  if (!go) return null;

  const bp = parseSemicolon(go.biological_process);
  const mf = parseSemicolon(go.molecular_function);
  const cc = parseSemicolon(go.cellular_component);

  if (!bp.length && !mf.length && !cc.length) return null;

  const lines = ["## Gene Ontology"];
  if (bp.length) lines.push(`- Biological Process: ${bp.slice(0, 5).join("; ")}`);
  if (mf.length) lines.push(`- Molecular Function: ${mf.slice(0, 3).join("; ")}`);
  if (cc.length) lines.push(`- Cellular Component: ${cc.slice(0, 3).join("; ")}`);

  return lines.join("\n");
}

function constraintScores(g: Gene): string | null {
  const cs = g.constraint_scores;
  if (!cs) return null;

  const lines = ["## Constraint & Intolerance"];
  const loeuf = cs.loeuf;
  if (loeuf) {
    if (loeuf.lof_oe != null) lines.push(`- LoF O/E: ${fmt(loeuf.lof_oe)} (CI: ${fmt(loeuf.lof_oe_ci_lower)}-${fmt(loeuf.lof_oe_ci_upper)})`);
    if (loeuf.lof_pLI != null) lines.push(`- pLI: ${fmt(loeuf.lof_pLI)}`);
    if (loeuf.mis_z_score != null) lines.push(`- Missense Z: ${fmt(loeuf.mis_z_score)}`);
    if (loeuf.syn_z_score != null) lines.push(`- Synonymous Z: ${fmt(loeuf.syn_z_score)}`);
  }

  const post = cs.posterior;
  if (post) {
    if (post.phaplo != null) lines.push(`- pHaplo: ${fmt(post.phaplo)}`);
    if (post.ptriplo != null) lines.push(`- pTriplo: ${fmt(post.ptriplo)}`);
  }

  const shet = cs.shet;
  if (shet?.mean_s_het != null) {
    lines.push(`- sHet: ${fmt(shet.mean_s_het)} (95% CI: ${fmt(shet.s_het_lower_95)}-${fmt(shet.s_het_upper_95)})`);
  }

  const dmg = cs.damage;
  if (dmg) {
    if (dmg.gdi_phred != null) lines.push(`- GDI Phred: ${fmt(dmg.gdi_phred)}`);
    if (dmg.ghis != null) lines.push(`- GHIS: ${fmt(dmg.ghis)}`);
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

function diseasePhenotype(g: Gene): string | null {
  const dp = g.disease_phenotype;
  if (!dp) return null;

  const lines: string[] = [];

  if (dp.disease_description) lines.push(`- Disease: ${truncate(dp.disease_description, 300)}`);
  if (dp.allelic_requirement) lines.push(`- Inheritance: ${dp.allelic_requirement}`);
  if (dp.mim_disease) lines.push(`- OMIM: ${truncate(dp.mim_disease, 150)}`);
  if (dp.orphanet_disorder) lines.push(`- Orphanet: ${truncate(dp.orphanet_disorder, 150)}`);
  if (dp.hpo_name) lines.push(`- HPO: ${truncate(dp.hpo_name, 200)}`);
  if (dp.trait_association_gwas) lines.push(`- GWAS Traits: ${truncate(dp.trait_association_gwas, 200)}`);

  if (!lines.length) return null;
  return ["## Disease & Phenotype", ...lines].join("\n");
}

function pathways(g: Gene): string | null {
  const pw = g.pathways;
  if (!pw) return null;

  const lines: string[] = [];

  if (pw.kegg_full) lines.push(`- KEGG: ${truncate(pw.kegg_full, 200)}`);
  if (pw.consensus_path_db) lines.push(`- ConsensusPathDB: ${truncate(pw.consensus_path_db, 200)}`);
  if (pw.uniprot) lines.push(`- UniProt: ${truncate(pw.uniprot, 150)}`);
  if (pw.biocarta_full) lines.push(`- BioCarta: ${truncate(pw.biocarta_full, 100)}`);

  const otPw = g.opentargets?.pathways;
  if (otPw?.length) {
    const topLevel = [...new Set(otPw.map((p) => p.topLevelTerm).filter(Boolean))];
    if (topLevel.length) {
      lines.push(`- Reactome Top-Level: ${topLevel.slice(0, 5).join("; ")}`);
    }
    lines.push(`- Total Pathways: ${otPw.length}`);
  }

  if (!lines.length) return null;
  return ["## Pathways", ...lines].join("\n");
}

function expression(g: Gene): string | null {
  const lines: string[] = [];
  const rna = g.rna_expression;

  if (rna) {
    if (rna.tissue_specificity) lines.push(`- Tissue Specificity: ${rna.tissue_specificity}`);
    if (rna.tissue_distribution) lines.push(`- Distribution: ${rna.tissue_distribution}`);
    if (rna.cancer_specificity) lines.push(`- Cancer Specificity: ${rna.cancer_specificity}`);
    if (rna.brain_regional_specificity) lines.push(`- Brain: ${rna.brain_regional_specificity}`);
  }

  const gtex = g.gtex;
  if (gtex) {
    const entries = Object.entries(gtex)
      .filter(([, v]) => v != null && v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (entries.length) {
      const top = entries.map(([tissue, tpm]) => `${humanize(tissue)}=${fmt(tpm)}`).join(", ");
      lines.push(`- Top GTEx (TPM): ${top}`);
    }
  }

  if (!lines.length) return null;
  return ["## Expression", ...lines].join("\n");
}

function essentiality(g: Gene): string | null {
  const e = g.essentiality;
  if (!e) return null;

  const lines: string[] = [];

  if (e.essential_gene) lines.push(`- Essential: ${e.essential_gene}`);
  if (e.essential_gene_crispr) lines.push(`- CRISPR: ${e.essential_gene_crispr}`);
  if (e.essential_gene_gene_trap) lines.push(`- Gene Trap: ${e.essential_gene_gene_trap}`);
  if (e.gene_indispensability_pred) lines.push(`- Indispensability: ${e.gene_indispensability_pred} (score: ${e.gene_indispensability_score})`);

  if (!lines.length) return null;
  return ["## Essentiality", ...lines].join("\n");
}

function druggability(g: Gene): string | null {
  const tract = g.opentargets?.tractability;
  const tc = g.opentargets?.target_class;
  const probes = g.opentargets?.chemical_probes;

  if (!tract?.length && !tc?.length && !probes?.length) return null;

  const lines = ["## Druggability & Tractability"];

  if (tc?.length) {
    const labels = tc.map((c) => c.label).filter(Boolean);
    if (labels.length) lines.push(`- Target Class: ${labels.join(", ")}`);
  }

  if (tract?.length) {
    const tractable = tract.filter((t) => t.value).map((t) => `${t.modality}:${t.id}`);
    if (tractable.length) {
      lines.push(`- Tractable: ${tractable.slice(0, 8).join(", ")}`);
    }
  }

  if (probes?.length) {
    const hq = probes.filter((p) => p.isHighQuality);
    lines.push(`- Chemical Probes: ${probes.length} total, ${hq.length} high-quality`);
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

function safetyAndCancer(g: Gene): string | null {
  const safety = g.opentargets?.safety_liabilities;
  const hallmarks = g.opentargets?.hallmarks;

  if (!safety?.length && !hallmarks?.cancerHallmarks?.length) return null;

  const lines: string[] = [];

  if (safety?.length) {
    lines.push("## Safety Liabilities");
    for (const s of safety.slice(0, 5)) {
      const effects = s.effects?.map((e) => `${e.direction} ${e.dosing}`).join(", ");
      lines.push(`- ${s.event}${effects ? ` (${effects})` : ""}`);
    }
    if (safety.length > 5) lines.push(`  (+${safety.length - 5} more)`);
  }

  if (hallmarks?.cancerHallmarks?.length) {
    if (lines.length) lines.push("");
    lines.push("## Cancer Hallmarks");
    for (const h of hallmarks.cancerHallmarks.slice(0, 5)) {
      lines.push(`- ${h.label}: ${h.impact} — ${truncate(h.description, 80)}`);
    }
    if (hallmarks.cancerHallmarks.length > 5) {
      lines.push(`  (+${hallmarks.cancerHallmarks.length - 5} more)`);
    }
  }

  return lines.join("\n");
}

function proteinInfo(g: Gene): string | null {
  const p = g.protein;
  if (!p) return null;

  const lines: string[] = [];

  if (p.subcellular_location) lines.push(`- Subcellular: ${truncate(p.subcellular_location, 150)}`);
  if (p.tissue_specificity_uniprot) lines.push(`- UniProt Tissue: ${truncate(p.tissue_specificity_uniprot, 150)}`);
  if (p.secretome_location) lines.push(`- Secretome: ${p.secretome_location}`);

  if (!lines.length) return null;
  return ["## Protein", ...lines].join("\n");
}

// ---------------------------------------------------------------------------
// Regulatory & tissue evidence sections (from context)
// ---------------------------------------------------------------------------

function regulatoryEvidence(ctx: GenePromptContext): string | null {
  const lines: string[] = [];

  const signals = ctx.signalTissues;
  if (signals?.length) {
    lines.push("## cCRE Tissue Activity");
    lines.push(`- ${signals.length} tissues with regulatory signals`);
    for (const t of topN(signals, 5)) {
      lines.push(`- ${t.tissue}: max_signal=${t.maxValue?.toFixed(1) ?? "N/A"}, ${t.count} elements`);
    }
  }

  const chromatin = ctx.chromatinTissues;
  if (chromatin?.length) {
    if (lines.length) lines.push("");
    lines.push("## Chromatin States by Tissue");
    lines.push(`- ${chromatin.length} tissues with chromatin annotations`);
    for (const t of topN(chromatin, 5)) {
      lines.push(`- ${t.tissue}: ${t.count} states`);
    }
  }

  const enhancers = ctx.enhancerTissues;
  if (enhancers?.length) {
    if (lines.length) lines.push("");
    lines.push("## Enhancer-Gene Predictions by Tissue");
    lines.push(`- ${enhancers.length} tissues with enhancer predictions`);
    for (const t of topN(enhancers, 3)) {
      lines.push(`- ${t.tissue}: ${t.count} predictions`);
    }
  }

  const access = ctx.accessibilityTissues;
  if (access?.length) {
    if (lines.length) lines.push("");
    lines.push(`## Accessibility: ${access.length} tissues with open chromatin`);
    for (const t of topN(access, 3)) {
      lines.push(`- ${t.tissue}: ${t.count} peaks, max=${t.maxValue?.toFixed(1) ?? "N/A"}`);
    }
  }

  const loops = ctx.loopTissues;
  if (loops?.length) {
    if (lines.length) lines.push("");
    lines.push(`## Chromatin Loops: ${loops.length} tissues`);
    for (const t of topN(loops, 3)) {
      lines.push(`- ${t.tissue}: ${t.count} loops`);
    }
  }

  const ccre = ctx.ccreLinkTissues;
  if (ccre?.length) {
    if (lines.length) lines.push("");
    lines.push(`## cCRE-Gene Links: ${ccre.length} tissues`);
    for (const t of topN(ccre, 3)) {
      lines.push(`- ${t.tissue}: ${t.count} links`);
    }
  }

  const crispr = ctx.crisprTissues;
  if (crispr?.length) {
    const sig = crispr.filter((t) => t.significant && t.significant > 0);
    if (lines.length) lines.push("");
    lines.push(`## CRISPR Perturbation: ${crispr.length} tissues, ${sig.length} with significant effects`);
    for (const t of topN(sig, 3)) {
      lines.push(`- ${t.tissue}: ${t.significant} sig of ${t.count} screens`);
    }
  }

  return lines.length ? lines.join("\n") : null;
}

function regionEvidenceSection(counts: RegionCounts | undefined): string | null {
  if (!counts) return null;

  const parts: string[] = [];
  if (counts.signals) parts.push(`${counts.signals} cCRE signals`);
  if (counts.chromatin_states) parts.push(`${counts.chromatin_states} chromatin states`);
  if (counts.enhancer_genes) parts.push(`${counts.enhancer_genes} enhancer-gene links`);
  if (counts.accessibility_peaks) parts.push(`${counts.accessibility_peaks} accessibility peaks`);
  if (counts.loops) parts.push(`${counts.loops} chromatin loops`);
  if (counts.ase) parts.push(`${counts.ase} allele-specific expression`);
  if (counts.validated_enhancers) parts.push(`${counts.validated_enhancers} validated enhancers`);
  if (counts.crispr_screens) parts.push(`${counts.crispr_screens} CRISPR screens`);
  if (counts.perturb_seq) parts.push(`${counts.perturb_seq} PerturbSeq`);

  if (!parts.length) return null;
  return `## Region Evidence Totals\n- ${parts.join(", ")}`;
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

function instructions(): string {
  return `**Instructions**: Based on the gene data above, provide a comprehensive summary:

1. **Function & Biology**: What does this gene do? Key molecular functions and biological processes.
2. **Disease Relevance**: Associated diseases, inheritance patterns, clinical significance.
3. **Constraint & Intolerance**: Is this gene intolerant to loss-of-function? What does that imply?
4. **Expression Pattern**: Where is it expressed? Tissue-specific patterns of note.
5. **Regulatory Landscape**: What regulatory evidence exists? Which tissues show the most activity? Enhancer-gene links? CRISPR perturbation effects?
6. **Therapeutic Potential**: Druggability, tractability, known safety concerns.
7. **Key Takeaways**: 2-3 bullet points highlighting the most important findings.

Emphasize what makes this gene biologically interesting — especially regulatory context and tissue-specific activity. Be concise but insightful.`;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function push(sections: string[], value: string | null): void {
  if (value) sections.push(value);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "N/A";
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

function parseSemicolon(s: string | null | undefined): string[] {
  if (!s) return [];
  return s.split(";").map((t) => t.trim()).filter(Boolean);
}

function humanize(snakeCase: string): string {
  return snakeCase
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Sort by significant (desc), then count (desc), return top N */
function topN(stats: TissueStat[], n: number): TissueStat[] {
  return [...stats]
    .sort((a, b) => (b.significant ?? 0) - (a.significant ?? 0) || b.count - a.count)
    .slice(0, n);
}
