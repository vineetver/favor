export const PPI_SOURCES = {
  BioGRID: {
    name: "BioGRID",
    description: "Biological General Repository for Interaction Datasets",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  IntAct: {
    name: "IntAct",
    description: "Molecular interaction database",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  HuRI: {
    name: "HuRI",
    description: "Human Reference Interactome",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
} as const;

export type PPISourceKey = keyof typeof PPI_SOURCES;
export type PPISource = (typeof PPI_SOURCES)[PPISourceKey];

export type BiogridInteraction = {
  degree?: string;
  protein_a_gene?: string;
  protein_b_gene?: string;
  interaction_id?: string;
  protein1_id?: string;
  protein2_id?: string;
  biogrid_id_interactor_a?: string;
  biogrid_id_interactor_b?: string;
  interaction_detection_method?: string;
  publication_first_author?: string;
  publication_identifiers?: string;
  taxid_interactor_a?: string;
  taxid_interactor_b?: string;
  interaction_types?: string;
  source_database?: string;
  interaction_identifiers?: string;
  confidence_values?: string;
  confidence_numeric?: number;
};

export type IntactInteraction = {
  degree?: string;
  gene_a_name?: string;
  gene_b_name?: string;
  interaction_id?: string;
  gene_a_id?: string;
  gene_b_id?: string;
  interaction_detection_method?: string;
  publication_first_author?: string;
  publication_identifier?: string;
  taxid_interactor_a?: string;
  taxid_interactor_b?: string;
  interaction_type?: string;
  source_database?: string;
  interaction_identifier?: string;
  confidence_value?: string;
  expansion_method?: string;
  biological_role_a?: string;
  biological_role_b?: string;
  experimental_role_a?: string;
  experimental_role_b?: string;
  type_interactor_a?: string;
  type_interactor_b?: string;
  xref_interactor_a?: string;
  xref_interactor_b?: string;
  interaction_xref?: string;
  annotation_interactor_a?: string;
  annotation_interactor_b?: string;
  interaction_annotation?: string;
  host_organism?: string;
  interaction_parameter?: string;
  creation_date?: string;
  update_date?: string;
  checksum_interactor_a?: string;
  checksum_interactor_b?: string;
  interaction_checksum?: string;
  negative?: boolean;
  feature_interactor_a?: string;
  feature_interactor_b?: string;
  stoichiometry_interactor_a?: string;
  stoichiometry_interactor_b?: string;
  identification_method_a?: string;
  identification_method_b?: string;
  confidence_numeric?: number;
  detection_method_count?: number;
  aggregated_publication_first_author?: string;
};

export type HuriInteraction = {
  degree?: string;
  gene_a?: string;
  gene_b?: string;
};

export type PPISourceData = {
  biogrid: BiogridInteraction[];
  intact: IntactInteraction[];
  huri: HuriInteraction[];
};

export type PPIData = {
  [K in PPISourceKey]: PPISourceData[Lowercase<K>] extends any[]
    ? PPISourceData[Lowercase<K>]
    : never;
};
