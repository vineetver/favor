/**
 * Disease types - FAVOR API structure
 */

export interface Disease {
  source?: string;
  disease_id: string;
  code?: string;
  name: string;
  description?: string;
  dbxrefs?: string[];
  parents?: string[];
  ancestors?: string[];
  children?: string[];
  descendants?: string[];
  therapeutic_areas?: string[];
  synonyms?: DiseaseSynonyms;
  obsolete_terms?: string[];
  obsolete_xrefs?: string[];
  ontology?: DiseaseOntology;
  epidemiology?: DiseaseEpidemiology;
  isTherapeuticArea?: boolean;
  leaf?: boolean;
}

export interface DiseaseSynonyms {
  hasExactSynonym?: string[];
  hasBroadSynonym?: string[];
  hasNarrowSynonym?: string[];
  hasRelatedSynonym?: string[];
}

export interface DiseaseOntology {
  sources?: {
    name?: string;
    url?: string;
  };
}

export interface DiseaseEpidemiology {
  disorder_type?: string;
  orphanet_code?: string;
  orphanet_name?: string;
  prevalence?: DiseasePrevalence[];
}

export interface DiseasePrevalence {
  value?: number;
  geographic?: string;
  prevalence_class?: string;
  prevalence_qualification?: string;
  prevalence_type?: string;
  source?: string;
  validation_status?: string;
}

export interface DiseaseError {
  error: string;
  disease_id: string;
}

export type DiseaseResponse = Disease | DiseaseError;
