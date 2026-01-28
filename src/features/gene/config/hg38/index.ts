// Gene column configurations
// Barrel exports for all gene column categories

import { geneInfoAndIdsColumns, geneInfoAndIdsGroup } from "./columns/info-and-ids";
import { geneFunctionColumns, geneFunctionGroup } from "./columns/function";
import { geneHumanPhenotypeColumns, geneHumanPhenotypeGroup } from "./columns/human-phenotype";
import { geneAnimalPhenotypeColumns, geneAnimalPhenotypeGroup } from "./columns/animal-phenotype";
import { geneExpressionColumns, geneExpressionGroup } from "./columns/expression";
import { geneProteinInteractionsColumns, geneProteinInteractionsGroup } from "./columns/protein-interactions";
import { genePathwaysColumns, genePathwaysGroup } from "./columns/pathways";
import { geneConstraintsColumns, geneConstraintsGroup } from "./columns/constraints";

// Re-export all columns and groups
export {
  geneInfoAndIdsColumns,
  geneInfoAndIdsGroup,
  geneFunctionColumns,
  geneFunctionGroup,
  geneHumanPhenotypeColumns,
  geneHumanPhenotypeGroup,
  geneAnimalPhenotypeColumns,
  geneAnimalPhenotypeGroup,
  geneExpressionColumns,
  geneExpressionGroup,
  geneProteinInteractionsColumns,
  geneProteinInteractionsGroup,
  genePathwaysColumns,
  genePathwaysGroup,
  geneConstraintsColumns,
  geneConstraintsGroup,
};

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