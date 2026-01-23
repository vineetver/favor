import {
  getVariantConsequences,
  getVariantCredibleSets,
  getVariantEffects,
  getVariantEvidences,
  getVariantPharmacogenomics,
} from "@/infrastructure/opentargets/api";
import type {
  OpenTargetsConsequenceRow,
  OpenTargetsCredibleSetRow,
  OpenTargetsEvidenceRow,
  OpenTargetsL2GRow,
  OpenTargetsPharmacogenomicsRow,
  OpenTargetsVariantEffectRow,
} from "../types/opentargets";

export function vcfToOpenTargetsId(vcf: string): string {
  const parts = vcf.split("-");
  if (parts.length !== 4) throw new Error(`Invalid VCF format: ${vcf}`);
  const [chr, pos, ref, alt] = parts;
  return `${chr.replace(/^chr/i, "")}_${pos}_${ref}_${alt}`;
}

function computePValue(
  mantissa: number | null,
  exponent: number | null,
): number | null {
  if (mantissa === null || exponent === null) return null;
  return mantissa * 10 ** exponent;
}

export async function fetchOpenTargetsConsequences(
  vcf: string,
): Promise<OpenTargetsConsequenceRow[]> {
  try {
    const data = await getVariantConsequences(vcfToOpenTargetsId(vcf));
    if (!data?.variant?.transcriptConsequences) return [];

    return data.variant.transcriptConsequences.map((tc) => ({
      targetId: tc.target?.id ?? "",
      approvedSymbol: tc.target?.approvedSymbol ?? "",
      transcriptId: tc.transcriptId,
      impact: tc.impact,
      consequenceTerms: tc.variantConsequences.map((c) => c.label).join(", "),
      aminoAcidChange: tc.aminoAcidChange,
      isEnsemblCanonical: tc.isEnsemblCanonical,
      codons: tc.codons,
      lofteePrediction: tc.lofteePrediction,
      consequenceScore: tc.consequenceScore,
      distanceFromTss: tc.distanceFromTss,
    }));
  } catch (error) {
    console.error("Open Targets consequences error:", error);
    return [];
  }
}

export async function fetchOpenTargetsL2G(
  vcf: string,
): Promise<OpenTargetsL2GRow[]> {
  try {
    const data = await getVariantCredibleSets(vcfToOpenTargetsId(vcf));
    if (!data?.variant?.credibleSets?.rows) return [];

    const rows: OpenTargetsL2GRow[] = [];
    for (const cs of data.variant.credibleSets.rows) {
      for (const l2g of cs.l2GPredictions.rows) {
        if (l2g.target) {
          rows.push({
            geneId: l2g.target.id,
            geneSymbol: l2g.target.approvedSymbol,
            score: l2g.score,
            studyId: cs.studyId,
            traitFromSource: cs.study?.traitFromSource ?? null,
            studyType: cs.studyType,
            confidence: cs.confidence,
          });
        }
      }
    }

    const geneMap = new Map<string, OpenTargetsL2GRow>();
    for (const row of rows.sort((a, b) => b.score - a.score)) {
      if (!geneMap.has(row.geneId)) geneMap.set(row.geneId, row);
    }
    return Array.from(geneMap.values());
  } catch (error) {
    console.error("Open Targets L2G error:", error);
    return [];
  }
}

export async function fetchOpenTargetsCredibleSets(
  vcf: string,
): Promise<OpenTargetsCredibleSetRow[]> {
  try {
    const data = await getVariantCredibleSets(vcfToOpenTargetsId(vcf));
    if (!data?.variant?.credibleSets?.rows) return [];

    return data.variant.credibleSets.rows.map((cs) => ({
      studyLocusId: cs.studyLocusId,
      studyId: cs.studyId,
      traitFromSource: cs.study?.traitFromSource ?? null,
      studyType: cs.studyType,
      confidence: cs.confidence,
      beta: cs.beta,
      pValue: computePValue(cs.pValueMantissa, cs.pValueExponent),
      sampleSize: cs.sampleSize,
      finemappingMethod: cs.finemappingMethod,
      l2gGeneCount: cs.l2GPredictions.count,
      locusVariantCount: cs.locus.count,
    }));
  } catch (error) {
    console.error("Open Targets credible sets error:", error);
    return [];
  }
}

export async function fetchOpenTargetsPharmacogenomics(
  vcf: string,
): Promise<OpenTargetsPharmacogenomicsRow[]> {
  try {
    const data = await getVariantPharmacogenomics(vcfToOpenTargetsId(vcf));
    if (!data?.variant?.pharmacogenomics) return [];

    const rows: OpenTargetsPharmacogenomicsRow[] = [];
    for (const pgx of data.variant.pharmacogenomics) {
      const drugs = pgx.drugs ?? [];
      const baseRow = {
        targetId: pgx.target?.id ?? null,
        targetSymbol: pgx.target?.approvedSymbol ?? null,
        isDirectTarget: pgx.isDirectTarget,
        genotypeId: pgx.genotypeId,
        pgxCategory: pgx.pgxCategory,
        evidenceLevel: pgx.evidenceLevel,
        phenotypeText: pgx.phenotypeText,
        consequence: pgx.variantFunctionalConsequence?.label ?? null,
        studyId: pgx.studyId,
        literature: pgx.literature ?? [],
      };

      if (drugs.length === 0) {
        rows.push({
          ...baseRow,
          drugName: "Unknown",
          drugId: null,
          drugType: null,
        });
      } else {
        for (const d of drugs) {
          rows.push({
            ...baseRow,
            drugName: d.drug?.name ?? d.drugFromSource ?? "Unknown",
            drugId: d.drug?.id ?? d.drugId ?? null,
            drugType: d.drug?.drugType ?? null,
          });
        }
      }
    }
    return rows;
  } catch (error) {
    console.error("Open Targets pharmacogenomics error:", error);
    return [];
  }
}

export async function fetchOpenTargetsVariantEffects(
  vcf: string,
): Promise<OpenTargetsVariantEffectRow[]> {
  try {
    const data = await getVariantEffects(vcfToOpenTargetsId(vcf));
    if (!data?.variant?.variantEffect) return [];

    return data.variant.variantEffect.map((ve) => ({
      method: ve.method,
      score: ve.score,
      normalisedScore: ve.normalisedScore,
      assessment: ve.assessment,
      assessmentFlag: ve.assessmentFlag,
      targetId: ve.target?.id ?? null,
      targetSymbol: ve.target?.approvedSymbol ?? null,
    }));
  } catch (error) {
    console.error("Open Targets variant effects error:", error);
    return [];
  }
}

export async function fetchOpenTargetsEvidences(
  vcf: string,
): Promise<OpenTargetsEvidenceRow[]> {
  try {
    const data = await getVariantEvidences(vcfToOpenTargetsId(vcf));
    if (!data?.variant?.evidences?.rows) return [];

    return data.variant.evidences.rows.map((ev) => ({
      id: ev.id,
      score: ev.score,
      datasourceId: ev.datasourceId,
      datatypeId: ev.datatypeId,
      targetId: ev.target.id,
      targetSymbol: ev.target.approvedSymbol,
      diseaseId: ev.disease.id,
      diseaseName: ev.disease.name,
      therapeuticAreas: ev.disease.therapeuticAreas?.map((ta) => ta.name) ?? [],
      variantEffect: ev.variantEffect,
      consequence: ev.variantFunctionalConsequence?.label ?? null,
      sampleSize: ev.studySampleSize,
    }));
  } catch (error) {
    console.error("Open Targets evidences error:", error);
    return [];
  }
}
