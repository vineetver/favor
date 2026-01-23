// =============================================================================
// Open Targets API Response Types - v4 Schema
// =============================================================================

// Base types
export interface SequenceOntologyTerm {
  id: string;
  label: string;
}

export interface Target {
  id: string;
  approvedSymbol: string;
}

export interface Disease {
  id: string;
  name: string;
  therapeuticAreas?: { id: string; name: string }[];
}

export interface Drug {
  id: string;
  name: string;
  drugType?: string;
}

export interface DrugWithIdentifiers {
  drugId: string | null;
  drugFromSource: string | null;
  drug: Drug | null;
}

// Variant consequences
export interface TranscriptConsequence {
  transcriptId: string;
  transcriptIndex: number;
  isEnsemblCanonical: boolean;
  impact: string | null;
  consequenceScore: number;
  distanceFromTss: number;
  distanceFromFootprint: number;
  aminoAcidChange: string | null;
  codons: string | null;
  uniprotAccessions: string[];
  lofteePrediction: string | null;
  siftPrediction: number | null;
  polyphenPrediction: number | null;
  target: Target | null;
  variantConsequences: SequenceOntologyTerm[];
}

export interface VariantConsequencesResponse {
  variant: {
    id: string;
    chromosome: string;
    position: number;
    referenceAllele: string;
    alternateAllele: string;
    rsIds: string[];
    variantDescription: string;
    mostSevereConsequence: SequenceOntologyTerm | null;
    transcriptConsequences: TranscriptConsequence[];
  } | null;
}

// Credible sets and L2G
export interface L2GPrediction {
  score: number;
  target: Target | null;
}

export interface LocusVariant {
  posteriorProbability: number;
  pValueMantissa: number | null;
  pValueExponent: number | null;
  beta: number | null;
  standardError: number | null;
  is95CredibleSet: boolean;
  is99CredibleSet: boolean;
  variant: { id: string };
}

export interface Study {
  id: string;
  traitFromSource: string | null;
  publicationFirstAuthor: string | null;
  publicationDate: string | null;
  pubmedId: string | null;
}

export interface CredibleSet {
  studyLocusId: string;
  credibleSetIndex: number | null;
  chromosome: string;
  position: number;
  beta: number | null;
  standardError: number | null;
  zScore: number | null;
  pValueMantissa: number | null;
  pValueExponent: number | null;
  finemappingMethod: string | null;
  confidence: string | null;
  studyId: string;
  studyType: string;
  region: string | null;
  sampleSize: number | null;
  study: Study | null;
  l2GPredictions: {
    count: number;
    rows: L2GPrediction[];
  };
  locus: {
    count: number;
    rows: LocusVariant[];
  };
}

export interface CredibleSetsResponse {
  variant: {
    id: string;
    credibleSets: {
      count: number;
      rows: CredibleSet[];
    };
  } | null;
}

// Pharmacogenomics
export interface Pharmacogenomics {
  genotypeId: string | null;
  isDirectTarget: boolean;
  pgxCategory: string | null;
  evidenceLevel: string | null;
  phenotypeText: string | null;
  genotypeAnnotationText: string | null;
  studyId: string | null;
  literature: string[];
  variantFunctionalConsequence: SequenceOntologyTerm | null;
  target: Target | null;
  drugs: DrugWithIdentifiers[];
}

export interface PharmacogenomicsResponse {
  variant: {
    id: string;
    pharmacogenomics: Pharmacogenomics[];
  } | null;
}

// Variant effects (pathogenicity predictions)
export interface VariantEffect {
  method: string;
  score: number | null;
  normalisedScore: number | null;
  assessment: string | null;
  assessmentFlag: string | null;
  target: Target | null;
}

export interface VariantEffectsResponse {
  variant: {
    id: string;
    variantEffect: VariantEffect[];
  } | null;
}

// Disease/target evidences
export interface Evidence {
  id: string;
  score: number;
  datasourceId: string;
  datatypeId: string;
  variantRsId: string | null;
  variantEffect: string | null;
  variantAminoacidDescriptions: string[];
  studySampleSize: number | null;
  target: Target;
  disease: Disease;
  variantFunctionalConsequence: SequenceOntologyTerm | null;
}

export interface EvidencesResponse {
  variant: {
    id: string;
    evidences: {
      count: number;
      cursor: string | null;
      rows: Evidence[];
    };
  } | null;
}
