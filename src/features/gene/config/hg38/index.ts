// Gene column configurations
// Barrel exports for all gene column categories

import {
  geneAnimalPhenotypeColumns,
  geneAnimalPhenotypeGroup,
} from "./columns/animal-phenotype";
import {
  geneCancerHallmarksColumns,
  geneCancerHallmarksGroup,
} from "./columns/cancer-hallmarks";
import {
  geneChemicalProbesColumns,
  geneChemicalProbesGroup,
} from "./columns/chemical-probes";
import {
  geneConstraintsColumns,
  geneConstraintsGroup,
} from "./columns/constraints";
import {
  geneExpressionColumns,
  geneExpressionGroup,
} from "./columns/expression";
import { geneFunctionColumns, geneFunctionGroup } from "./columns/function";
import {
  geneHumanPhenotypeColumns,
  geneHumanPhenotypeGroup,
} from "./columns/human-phenotype";
import {
  geneInfoAndIdsColumns,
  geneInfoAndIdsGroup,
} from "./columns/info-and-ids";
import { genePathwaysColumns, genePathwaysGroup } from "./columns/pathways";
import {
  geneSafetyLiabilitiesColumns,
  geneSafetyLiabilitiesGroup,
} from "./columns/safety-liabilities";
import { geneTepColumns, geneTepGroup } from "./columns/tep";
import {
  geneTractabilityTargetClassColumns,
  geneTractabilityTargetClassGroup,
} from "./columns/tractability-and-target-class";

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
  genePathwaysColumns,
  genePathwaysGroup,
  geneConstraintsColumns,
  geneConstraintsGroup,
  geneTractabilityTargetClassColumns,
  geneTractabilityTargetClassGroup,
  geneChemicalProbesColumns,
  geneChemicalProbesGroup,
  geneSafetyLiabilitiesColumns,
  geneSafetyLiabilitiesGroup,
  geneCancerHallmarksColumns,
  geneCancerHallmarksGroup,
  geneTepColumns,
  geneTepGroup,
};

// Combined column groups for gene tables (as array for proper serialization)
export const geneColumnGroups = [
  geneInfoAndIdsGroup,
  geneFunctionGroup,
  geneHumanPhenotypeGroup,
  geneAnimalPhenotypeGroup,
  geneExpressionGroup,
  // geneProteinInteractionsGroup, // Removed due to serialization issues with renderInteractions
  // genePathwaysGroup, // Removed due to serialization issues with renderPathways
  geneConstraintsGroup,
  geneTractabilityTargetClassGroup,
  geneChemicalProbesGroup,
  geneSafetyLiabilitiesGroup,
  geneCancerHallmarksGroup,
  geneTepGroup,
] as const;
