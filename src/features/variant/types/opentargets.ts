// =============================================================================
// Open Targets Row Types for Table Display
// Flattened from API response types for easy table rendering
// =============================================================================

/**
 * Transcript consequence row for table display.
 */
export interface OpenTargetsConsequenceRow {
  targetId: string;
  approvedSymbol: string;
  transcriptId: string;
  impact: string | null;
  consequenceTerms: string; // Joined consequence labels
  aminoAcidChange: string | null;
  siftPrediction: number | null;
  polyphenPrediction: number | null;
  isEnsemblCanonical: boolean;
  codons: string | null;
  lofteePrediction: string | null;
  consequenceScore: number | null;
  distanceFromTss: number | null;
}

/**
 * L2G score row for table display.
 * Aggregated from credible set L2G predictions.
 */
export interface OpenTargetsL2GRow {
  geneId: string;
  geneSymbol: string;
  score: number;
  studyId: string;
  traitFromSource: string | null;
  studyType: string;
  confidence: string | null;
}

/**
 * Credible set row for table display.
 * One row per credible set study association.
 */
export interface OpenTargetsCredibleSetRow {
  studyLocusId: string;
  studyId: string;
  traitFromSource: string | null;
  studyType: string;
  confidence: string | null;
  beta: number | null;
  pValue: number | null; // Computed from mantissa/exponent
  sampleSize: number | null;
  finemappingMethod: string | null;
  l2gGeneCount: number;
  locusVariantCount: number;
}

/**
 * Locus variant row for credible set detail.
 */
export interface OpenTargetsLocusVariantRow {
  variantId: string;
  posteriorProbability: number;
  pValue: number | null;
  beta: number | null;
  standardError: number | null;
  is95CredibleSet: boolean;
  is99CredibleSet: boolean;
}

/**
 * Pharmacogenomics row for table display.
 */
export interface OpenTargetsPharmacogenomicsRow {
  drugName: string;
  drugId: string | null;
  drugType: string | null;
  targetId: string | null;
  targetSymbol: string | null;
  isDirectTarget: boolean;
  genotypeId: string | null;
  pgxCategory: string | null;
  evidenceLevel: string | null;
  phenotypeText: string | null;
  consequence: string | null;
  studyId: string | null;
  literature: string[];
}

/**
 * Variant effect (pathogenicity) row for table display.
 */
export interface OpenTargetsVariantEffectRow {
  method: string;
  score: number | null;
  normalisedScore: number | null;
  assessment: string | null;
  assessmentFlag: string | null;
  targetId: string | null;
  targetSymbol: string | null;
}

/**
 * Protein coding coordinate row for table display.
 */
export interface OpenTargetsProteinCodingRow {
  aminoAcidPosition: number;
  referenceAminoAcid: string;
  alternateAminoAcid: string;
  variantEffect: number | null;
  targetId: string | null;
  targetSymbol: string | null;
  therapeuticAreas: string[];
  diseases: string[]; // Disease names
  uniprotAccessions: string[];
  consequences: string; // Joined consequence labels
}

/**
 * Evidence row for table display.
 */
export interface OpenTargetsEvidenceRow {
  id: string;
  score: number;
  datasourceId: string;
  datatypeId: string;
  targetId: string;
  targetSymbol: string;
  diseaseId: string;
  diseaseName: string;
  therapeuticAreas: string[];
  variantEffect: string | null;
  consequence: string | null;
  sampleSize: number | null;
}
