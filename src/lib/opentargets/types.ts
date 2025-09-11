export interface Target {
  id: string;
  approvedSymbol: string;
  approvedName?: string;
  biotype?: string;
  geneticConstraint?: GeneticConstraint[];
  tractability?: Tractability[];
}

export interface GeneticConstraint {
  constraintType: string;
  exp?: number;
  obs?: number;
  score?: number;
  oe?: number;
  oeLower?: number;
  oeUpper?: number;
}

export interface Tractability {
  label: string;
  modality: string;
  value: boolean;
}

export interface Disease {
  id: string;
  name: string;
  description?: string;
  synonyms?: string[];
  therapeuticAreas?: TherapeuticArea[];
}

export interface TherapeuticArea {
  id: string;
  name: string;
}

export interface AssociatedDisease {
  disease: Disease;
  score: number;
  datasourceScores?: DatasourceScore[];
}

export interface DatasourceScore {
  id: string;
  score: number;
}

export interface Drug {
  id: string;
  name: string;
  drugType?: string;
  maximumClinicalTrialPhase?: number;
  hasBeenWithdrawn?: boolean;
  withdrawnReason?: string;
  blackBoxWarning?: boolean;
}

export interface AssociatedDrug {
  drug: Drug;
  approvedIndications?: string[];
  clinicalTrialPhase?: number;
  mechanismOfAction?: string;
}

export interface Variant {
  id: string;
  chromosome: string;
  position: number;
  refAllele: string;
  altAllele: string;
  rsId?: string;
  mostSevereConsequence?: string;
}

export interface StudyLocus {
  studyId: string;
  variantId: string;
  pval?: number;
  beta?: number;
  oddsRatio?: number;
  confidenceIntervalLower?: number;
  confidenceIntervalUpper?: number;
}

export interface CredibleSet {
  studyId: string;
  studyLocusId: string;
  variants: CredibleSetVariant[];
  locus2GeneTable?: Locus2Gene[];
}

export interface CredibleSetVariant {
  variant: Variant;
  posteriorProbability: number;
  pval?: number;
  beta?: number;
  standardError?: number;
}

export interface Locus2Gene {
  gene: {
    id: string;
    symbol: string;
  };
  yProbaModel: number;
  yProbaDistance?: number;
  yProbaInteraction?: number;
  yProbaMolecularQTL?: number;
  yProbaPathogenicity?: number;
  hasColoc?: boolean;
  distanceToLocus?: number;
}