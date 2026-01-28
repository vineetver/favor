// Gene column configurations
// Barrel exports for all gene column categories

export { geneInfoAndIdsColumns, geneInfoAndIdsGroup } from "./info-and-ids";
export { geneFunctionColumns, geneFunctionGroup } from "./function";
export { geneHumanPhenotypeColumns, geneHumanPhenotypeGroup } from "./human-phenotype";
export { geneAnimalPhenotypeColumns, geneAnimalPhenotypeGroup } from "./animal-phenotype";
export { geneExpressionColumns, geneExpressionGroup } from "./expression";
export { geneProteinInteractionsColumns, geneProteinInteractionsGroup } from "./protein-interactions";
export { genePathwaysColumns, genePathwaysGroup } from "./pathways";
export { geneConstraintsColumns, geneConstraintsGroup } from "./constraints";

// Combined column groups for gene tables
export const geneColumnGroups = {
  "info-and-ids": geneInfoAndIdsGroup,
  "function": geneFunctionGroup,
  "human-phenotype": geneHumanPhenotypeGroup,
  "animal-phenotype": geneAnimalPhenotypeGroup,
  "expression": geneExpressionGroup,
  "protein-interactions": geneProteinInteractionsGroup,
  "pathways": genePathwaysGroup,
  "constraints-and-heplo": geneConstraintsGroup,
} as const;

// Type for gene column group keys
export type GeneColumnGroupKey = keyof typeof geneColumnGroups;