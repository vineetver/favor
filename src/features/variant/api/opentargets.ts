import {
  getVariantConsequences,
  getVariantCredibleSets,
  getVariantPharmacogenomics,
  getVariantEffects,
  getVariantProteinCoding,
  getVariantEvidences,
} from "@/lib/opentargets/api";
import type {
  OpenTargetsConsequenceRow,
  OpenTargetsL2GRow,
  OpenTargetsCredibleSetRow,
  OpenTargetsPharmacogenomicsRow,
  OpenTargetsVariantEffectRow,
  OpenTargetsProteinCodingRow,
  OpenTargetsEvidenceRow,
} from "../types/opentargets";

/**
 * Convert VCF format to Open Targets variant ID.
 * "chr1-12345-A-G" or "1-12345-A-G" → "1_12345_A_G"
 */
export function vcfToOpenTargetsId(vcf: string): string {
  const parts = vcf.split("-");
  if (parts.length !== 4) {
    throw new Error(`Invalid VCF format: ${vcf}`);
  }
  const [chr, pos, ref, alt] = parts;
  const cleanChr = chr.replace(/^chr/i, "");
  return `${cleanChr}_${pos}_${ref}_${alt}`;
}

/**
 * Compute p-value from mantissa and exponent.
 */
function computePValue(mantissa: number | null, exponent: number | null): number | null {
  if (mantissa === null || exponent === null) return null;
  return mantissa * Math.pow(10, exponent);
}

/**
 * Fetch and transform variant consequences.
 */
export async function fetchOpenTargetsConsequences(
  vcf: string
): Promise<OpenTargetsConsequenceRow[]> {
  try {
    const variantId = vcfToOpenTargetsId(vcf);
    const data = await getVariantConsequences(variantId);

    if (!data?.variant?.transcriptConsequences) {
      return [];
    }

    return data.variant.transcriptConsequences.map((tc) => ({
      targetId: tc.target?.id ?? "",
      approvedSymbol: tc.target?.approvedSymbol ?? "",
      transcriptId: tc.transcriptId,
      impact: tc.impact,
      consequenceTerms: tc.variantConsequences.map((c) => c.label).join(", "),
      aminoAcidChange: tc.aminoAcidChange,
      siftPrediction: tc.siftPrediction,
      polyphenPrediction: tc.polyphenPrediction,
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

/**
 * Fetch and transform L2G scores from credible sets.
 */
export async function fetchOpenTargetsL2G(
  vcf: string
): Promise<OpenTargetsL2GRow[]> {
  try {
    const variantId = vcfToOpenTargetsId(vcf);
    console.log("[L2G] Fetching for variantId:", variantId);
    const data = await getVariantCredibleSets(variantId);
    console.log("[L2G] Response:", data ? "got data" : "null", "credibleSets:", data?.variant?.credibleSets?.count);

    if (!data?.variant?.credibleSets?.rows) {
      console.log("[L2G] No credible sets rows found");
      return [];
    }

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

    // Sort by score descending, deduplicate by gene
    const geneMap = new Map<string, OpenTargetsL2GRow>();
    for (const row of rows.sort((a, b) => b.score - a.score)) {
      if (!geneMap.has(row.geneId)) {
        geneMap.set(row.geneId, row);
      }
    }

    return Array.from(geneMap.values());
  } catch (error) {
    console.error("Open Targets L2G error:", error);
    return [];
  }
}

/**
 * Fetch and transform credible sets.
 */
export async function fetchOpenTargetsCredibleSets(
  vcf: string
): Promise<OpenTargetsCredibleSetRow[]> {
  try {
    const variantId = vcfToOpenTargetsId(vcf);
    const data = await getVariantCredibleSets(variantId);

    if (!data?.variant?.credibleSets?.rows) {
      return [];
    }

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

/**
 * Fetch and transform pharmacogenomics data.
 */
export async function fetchOpenTargetsPharmacogenomics(
  vcf: string
): Promise<OpenTargetsPharmacogenomicsRow[]> {
  try {
    const variantId = vcfToOpenTargetsId(vcf);
    const data = await getVariantPharmacogenomics(variantId);

    if (!data?.variant?.pharmacogenomics) {
      return [];
    }

    // Flatten drugs array - create one row per drug
    const rows: OpenTargetsPharmacogenomicsRow[] = [];
    for (const pgx of data.variant.pharmacogenomics) {
      const drugs = pgx.drugs ?? [];
      if (drugs.length === 0) {
        // Still include the row even without drugs
        rows.push({
          drugName: "Unknown",
          drugId: null,
          drugType: null,
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
        });
      } else {
        for (const drugEntry of drugs) {
          // Use drug.name if available, fallback to drugFromSource
          const drugName = drugEntry.drug?.name ?? drugEntry.drugFromSource ?? "Unknown";
          rows.push({
            drugName,
            drugId: drugEntry.drug?.id ?? drugEntry.drugId ?? null,
            drugType: drugEntry.drug?.drugType ?? null,
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

/**
 * Fetch and transform variant effects (pathogenicity predictions).
 */
export async function fetchOpenTargetsVariantEffects(
  vcf: string
): Promise<OpenTargetsVariantEffectRow[]> {
  try {
    const variantId = vcfToOpenTargetsId(vcf);
    const data = await getVariantEffects(variantId);

    if (!data?.variant?.variantEffect) {
      return [];
    }

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

/**
 * Fetch and transform protein coding coordinates.
 */
export async function fetchOpenTargetsProteinCoding(
  vcf: string
): Promise<OpenTargetsProteinCodingRow[]> {
  try {
    const variantId = vcfToOpenTargetsId(vcf);
    const data = await getVariantProteinCoding(variantId);

    if (!data?.variant?.proteinCodingCoordinates?.rows) {
      return [];
    }

    return data.variant.proteinCodingCoordinates.rows.map((pc) => ({
      aminoAcidPosition: pc.aminoAcidPosition,
      referenceAminoAcid: pc.referenceAminoAcid,
      alternateAminoAcid: pc.alternateAminoAcid,
      variantEffect: pc.variantEffect,
      targetId: pc.target?.id ?? null,
      targetSymbol: pc.target?.approvedSymbol ?? null,
      therapeuticAreas: pc.therapeuticAreas,
      diseases: pc.diseases.map((d) => d.name),
      uniprotAccessions: pc.uniprotAccessions,
      consequences: pc.variantConsequences.map((c) => c.label).join(", "),
    }));
  } catch (error) {
    console.error("Open Targets protein coding error:", error);
    return [];
  }
}

/**
 * Fetch and transform disease/target evidences.
 */
export async function fetchOpenTargetsEvidences(
  vcf: string
): Promise<OpenTargetsEvidenceRow[]> {
  try {
    const variantId = vcfToOpenTargetsId(vcf);
    const data = await getVariantEvidences(variantId);

    if (!data?.variant?.evidences?.rows) {
      return [];
    }

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
