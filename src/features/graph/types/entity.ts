// =============================================================================
// Entity Types (Discriminated Union)
// =============================================================================

interface BaseEntity {
  id: string;
  label: string;
}

export interface GeneEntity extends BaseEntity {
  type: "Gene";
  symbol: string;
  ensemblId: string;
}

export interface DiseaseEntity extends BaseEntity {
  type: "Disease";
  mondoId?: string;
  orphanetId?: string;
}

export interface DrugEntity extends BaseEntity {
  type: "Drug";
  drugBankId?: string;
  chemblId?: string;
}

export interface PathwayEntity extends BaseEntity {
  type: "Pathway";
  source?: "reactome" | "wikipathways" | "kegg";
  category?: string;
}

export interface VariantEntity extends BaseEntity {
  type: "Variant";
  rsId?: string;
  chromosome?: string;
  position?: number;
}

export interface TraitEntity extends BaseEntity {
  type: "Trait";
  efoId?: string;
}

export interface PhenotypeEntity extends BaseEntity {
  type: "Phenotype";
  definition?: string;
}

export interface StudyEntity extends BaseEntity {
  type: "Study";
  pubmedId?: string;
}

export interface GOTermEntity extends BaseEntity {
  type: "GOTerm";
  namespace?: string;
}

export interface SideEffectEntity extends BaseEntity {
  type: "SideEffect";
  meddraId?: string;
}

export interface OntologyTermEntity extends BaseEntity {
  type: "OntologyTerm";
  ontologySource?: string;
}

export interface cCREEntity extends BaseEntity {
  type: "cCRE";
  accession?: string;
}

export interface MetaboliteEntity extends BaseEntity {
  type: "Metabolite";
  hmdbId?: string;
}

export type ExplorerEntity =
  | GeneEntity
  | DiseaseEntity
  | DrugEntity
  | PathwayEntity
  | VariantEntity
  | TraitEntity
  | PhenotypeEntity
  | StudyEntity
  | GOTermEntity
  | SideEffectEntity
  | OntologyTermEntity
  | cCREEntity
  | MetaboliteEntity;

export type EntityType = ExplorerEntity["type"];

export const ENTITY_TYPES: EntityType[] = [
  "Gene",
  "Disease",
  "Drug",
  "Pathway",
  "Variant",
  "Trait",
  "Phenotype",
  "Study",
  "GOTerm",
  "SideEffect",
  "OntologyTerm",
  "cCRE",
  "Metabolite",
];
