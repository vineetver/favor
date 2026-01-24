import type { Variant } from "../types/variant";

/**
 * Additional context that can be passed to extend the prompt
 * Design: Add new association types here as the system grows
 */
export interface VariantPromptContext {
  /** Drug associations from PharmGKB, DrugBank, etc. */
  drugAssociations?: DrugAssociation[];
  /** Disease associations from GWAS, ClinVar, etc. */
  diseaseAssociations?: DiseaseAssociation[];
  /** Custom context - for future extensibility */
  custom?: Record<string, unknown>;
}

export interface DrugAssociation {
  drug: string;
  evidence: string;
  source?: string;
}

export interface DiseaseAssociation {
  disease: string;
  evidence: string;
  source?: string;
}

/**
 * Builds a structured prompt for variant summarization
 *
 * Design principles:
 * 1. Tiered extraction - most important fields first
 * 2. Smart filtering - skip null/undefined values
 * 3. Structured output - easy for LLM to parse
 * 4. Extensible - accepts additional context objects
 */
export function buildVariantPrompt(
  variant: Variant,
  context?: VariantPromptContext,
): string {
  const sections: string[] = [];

  // === TIER 1: Core Identity (Always included) ===
  sections.push(buildCoreIdentity(variant));

  // === TIER 2: Clinical Significance (High priority) ===
  const clinical = buildClinicalSection(variant);
  if (clinical) sections.push(clinical);

  // === TIER 3: Predictive Scores (Include if notable) ===
  const scores = buildScoresSection(variant);
  if (scores) sections.push(scores);

  // === TIER 4: Population Genetics ===
  const population = buildPopulationSection(variant);
  if (population) sections.push(population);

  // === TIER 5: Regulatory/Functional (for non-coding) ===
  const regulatory = buildRegulatorySection(variant);
  if (regulatory) sections.push(regulatory);

  // === Extended Context (Associations) ===
  if (context) {
    const associations = buildAssociationsSection(context);
    if (associations) sections.push(associations);
  }

  // === Prompt Instructions ===
  const instructions = buildInstructions();

  return `${sections.join("\n\n")}\n\n---\n\n${instructions}`;
}

function buildCoreIdentity(v: Variant): string {
  const lines: string[] = ["## Variant Identity"];

  lines.push(`- VCF: ${v.variant_vcf}`);
  lines.push(`- Location: chr${v.chromosome}:${v.position.toLocaleString()}`);

  // rsID from dbSNP
  if (v.dbsnp?.rsid) {
    lines.push(`- rsID: ${v.dbsnp.rsid}`);
  }

  // Gene annotations (prefer Gencode, fallback to RefSeq)
  const genes = v.genecode?.genes?.filter(Boolean) ?? [];
  if (genes.length > 0) {
    lines.push(`- Gene(s): ${genes.join(", ")}`);
  }

  // Consequence
  const consequence = v.genecode?.consequence ?? v.refseq?.consequence;
  if (consequence) {
    lines.push(`- Consequence: ${consequence}`);
  }

  // Region type
  const regionType = v.genecode?.region_type ?? v.refseq?.region_type;
  if (regionType) {
    lines.push(`- Region: ${regionType}`);
  }

  return lines.join("\n");
}

function buildClinicalSection(v: Variant): string | null {
  const lines: string[] = [];

  // ClinVar
  if (v.clinvar) {
    const cv = v.clinvar;
    const hasData =
      cv.clnsig?.length || cv.clndn?.length || cv.origin_decoded?.length;

    if (hasData) {
      lines.push("## Clinical Significance");

      if (cv.clnsig?.length) {
        lines.push(`- ClinVar Classification: ${cv.clnsig.join(", ")}`);
      }
      if (cv.clndn?.length) {
        const conditions = cv.clndn.filter(Boolean).slice(0, 5); // Limit to 5
        lines.push(`- Associated Conditions: ${conditions.join("; ")}`);
        if (cv.clndn.length > 5) {
          lines.push(`  (and ${cv.clndn.length - 5} more)`);
        }
      }
      if (cv.origin_decoded?.length) {
        lines.push(`- Origin: ${cv.origin_decoded.join(", ")}`);
      }
      if (cv.clnrevstat) {
        lines.push(`- Review Status: ${cv.clnrevstat}`);
      }
    }
  }

  // COSMIC (somatic)
  if (v.cosmic?.sample_count) {
    if (lines.length === 0) lines.push("## Clinical Significance");
    lines.push(`- COSMIC: Found in ${v.cosmic.sample_count} tumor samples`);
    if (v.cosmic.tier) {
      lines.push(`  - Tier: ${v.cosmic.tier}`);
    }
  }

  // AlphaMissense
  const amScore = v.alphamissense?.max_pathogenicity;
  if (amScore != null) {
    if (lines.length === 0) lines.push("## Clinical Significance");
    const classification =
      v.alphamissense?.predictions?.[0]?.class ?? getAlphaMissenseClass(amScore);
    lines.push(`- AlphaMissense: ${amScore.toFixed(3)} (${classification})`);
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

function buildScoresSection(v: Variant): string | null {
  const lines: string[] = [];
  const main = v.main;

  // CADD - most widely used
  if (main?.cadd?.phred != null && main.cadd.phred > 10) {
    lines.push("## Pathogenicity Scores");
    lines.push(`- CADD Phred: ${main.cadd.phred.toFixed(1)}`);
  }

  // Protein predictions (if coding)
  if (main?.protein_predictions) {
    const pp = main.protein_predictions;
    const predictions: string[] = [];

    if (pp.sift_cat) {
      predictions.push(`SIFT: ${pp.sift_cat}`);
    }
    if (pp.polyphen_cat) {
      predictions.push(`PolyPhen: ${pp.polyphen_cat}`);
    }

    if (predictions.length) {
      if (lines.length === 0) lines.push("## Pathogenicity Scores");
      lines.push(`- Protein Impact: ${predictions.join(", ")}`);
    }
  }

  // Conservation
  if (main?.conservation) {
    const cons = main.conservation;
    const highlyConserved =
      (cons.mamphylop != null && cons.mamphylop > 2) ||
      (cons.verphylop != null && cons.verphylop > 2);

    if (highlyConserved) {
      if (lines.length === 0) lines.push("## Pathogenicity Scores");
      const scores: string[] = [];
      if (cons.mamphylop != null) scores.push(`mammalian: ${cons.mamphylop.toFixed(2)}`);
      if (cons.verphylop != null) scores.push(`vertebrate: ${cons.verphylop.toFixed(2)}`);
      lines.push(`- Conservation (PhyloP): ${scores.join(", ")}`);
    }
  }

  // GERP
  if (main?.gerp?.rs != null && main.gerp.rs > 2) {
    if (lines.length === 0) lines.push("## Pathogenicity Scores");
    lines.push(`- GERP++: ${main.gerp.rs.toFixed(2)}`);
  }

  // Other scores
  if (v.linsight != null && v.linsight > 0.5) {
    if (lines.length === 0) lines.push("## Pathogenicity Scores");
    lines.push(`- LINSIGHT: ${v.linsight.toFixed(3)}`);
  }

  if (v.fathmm_xf != null && v.fathmm_xf > 0.5) {
    if (lines.length === 0) lines.push("## Pathogenicity Scores");
    lines.push(`- FATHMM-XF: ${v.fathmm_xf.toFixed(3)}`);
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

function buildPopulationSection(v: Variant): string | null {
  const lines: string[] = [];

  // gnomAD (prefer genome over exome)
  const gnomad = v.gnomad_genome ?? v.gnomad_exome;
  if (gnomad?.af != null) {
    lines.push("## Population Frequency");
    const afPercent = (gnomad.af * 100).toFixed(4);
    lines.push(`- Global AF: ${afPercent}%`);

    // Note if rare
    if (gnomad.af < 0.001) {
      lines.push(`  (Very rare: <0.1%)`);
    } else if (gnomad.af < 0.01) {
      lines.push(`  (Rare variant: <1%)`);
    }

    // Show highest population if available
    if (gnomad.grpmax) {
      lines.push(`- Highest frequency population: ${gnomad.grpmax}`);
    }
  }

  // 1000 Genomes for population breakdown
  if (v.tg?.tg_all != null) {
    if (lines.length === 0) lines.push("## Population Frequency");
    const tg = v.tg;
    const pops: string[] = [];

    if (tg.tg_afr != null) pops.push(`AFR: ${(tg.tg_afr * 100).toFixed(2)}%`);
    if (tg.tg_amr != null) pops.push(`AMR: ${(tg.tg_amr * 100).toFixed(2)}%`);
    if (tg.tg_eas != null) pops.push(`EAS: ${(tg.tg_eas * 100).toFixed(2)}%`);
    if (tg.tg_eur != null) pops.push(`EUR: ${(tg.tg_eur * 100).toFixed(2)}%`);
    if (tg.tg_sas != null) pops.push(`SAS: ${(tg.tg_sas * 100).toFixed(2)}%`);

    if (pops.length) {
      lines.push(`- 1000 Genomes: ${pops.join(", ")}`);
    }
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

function buildRegulatorySection(v: Variant): string | null {
  const lines: string[] = [];

  // cCREs (candidate regulatory elements)
  if (v.ccre?.annotations) {
    lines.push("## Regulatory Annotations");
    lines.push(`- cCRE Type: ${v.ccre.annotations}`);
  }

  // GeneHancer
  if (v.genehancer?.id) {
    if (lines.length === 0) lines.push("## Regulatory Annotations");
    lines.push(`- GeneHancer: ${v.genehancer.id}`);
    if (v.genehancer.targets?.length) {
      const targets = v.genehancer.targets
        .slice(0, 3)
        .map((t) => t.gene)
        .filter(Boolean);
      if (targets.length) {
        lines.push(`  - Target genes: ${targets.join(", ")}`);
      }
    }
  }

  // Super enhancer
  if (v.super_enhancer?.ids?.length) {
    if (lines.length === 0) lines.push("## Regulatory Annotations");
    lines.push(`- Super Enhancer: Yes (${v.super_enhancer.ids.length} regions)`);
  }

  // CAGE (promoter/enhancer)
  if (v.cage?.cage_promoter || v.cage?.cage_enhancer) {
    if (lines.length === 0) lines.push("## Regulatory Annotations");
    if (v.cage.cage_promoter) lines.push(`- CAGE Promoter: ${v.cage.cage_promoter}`);
    if (v.cage.cage_enhancer) lines.push(`- CAGE Enhancer: ${v.cage.cage_enhancer}`);
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

function buildAssociationsSection(context: VariantPromptContext): string | null {
  const lines: string[] = [];

  // Drug associations
  if (context.drugAssociations?.length) {
    lines.push("## Drug Associations");
    for (const assoc of context.drugAssociations.slice(0, 5)) {
      lines.push(`- ${assoc.drug}: ${assoc.evidence}`);
      if (assoc.source) lines.push(`  (Source: ${assoc.source})`);
    }
  }

  // Disease associations
  if (context.diseaseAssociations?.length) {
    if (lines.length > 0) lines.push("");
    lines.push("## Disease Associations");
    for (const assoc of context.diseaseAssociations.slice(0, 5)) {
      lines.push(`- ${assoc.disease}: ${assoc.evidence}`);
      if (assoc.source) lines.push(`  (Source: ${assoc.source})`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

function buildInstructions(): string {
  return `**Instructions**: Based on the variant data above, provide a comprehensive summary that includes:

1. **Overview**: What is this variant and where is it located?
2. **Clinical Significance**: Is it pathogenic, benign, or uncertain? What conditions is it associated with?
3. **Functional Impact**: Based on scores and predictions, what is the likely functional effect?
4. **Population Context**: How common is this variant? Any population-specific patterns?
5. **Key Takeaways**: 2-3 bullet points summarizing the most important findings.

Be concise but thorough. If data is missing for a section, briefly note that. Focus on clinically relevant interpretations.`;
}

function getAlphaMissenseClass(score: number): string {
  if (score >= 0.564) return "likely pathogenic";
  if (score <= 0.34) return "likely benign";
  return "ambiguous";
}
