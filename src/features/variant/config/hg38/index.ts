import {
  alleleFrequencyColumns,
  alleleFrequencyGroup,
} from "./columns/allele-frequency";
import { basicColumns, basicGroup } from "./columns/basic";
import {
  chromatinStateColumns,
  chromatinStateGroup,
} from "./columns/chromatin-state";
import { clinvarColumns, clinvarGroup } from "./columns/clinvar";
import { conservationColumns, conservationGroup } from "./columns/conservation";
import { epigeneticsColumns, epigeneticsGroup } from "./columns/epigenetics";
import {
  functionalClassColumns,
  functionalClassGroup,
} from "./columns/functional-class";
import { integrativeColumns, integrativeGroup } from "./columns/integrative";
import {
  localNucleotideDiversityColumns,
  localNucleotideDiversityGroup,
} from "./columns/local-nucleotide-diversity";
import { mappabilityColumns, mappabilityGroup } from "./columns/mappability";
import {
  mutationDensityColumns,
  mutationDensityGroup,
} from "./columns/mutation-density";
import {
  proteinFunctionColumns,
  proteinFunctionGroup,
} from "./columns/protein-function";
import { proximityColumns, proximityGroup } from "./columns/proximity";
import {
  somaticMutationColumns,
  somaticMutationGroup,
} from "./columns/somatic-mutation";
import { spliceAiColumns, spliceAiGroup } from "./columns/splice-ai";
import {
  transcriptionFactorColumns,
  transcriptionFactorGroup,
} from "./columns/transcription-factor";

export const variantColumnGroups = [
  basicGroup,
  functionalClassGroup,
  clinvarGroup,
  alleleFrequencyGroup,
  integrativeGroup,
  proteinFunctionGroup,
  conservationGroup,
  epigeneticsGroup,
  transcriptionFactorGroup,
  chromatinStateGroup,
  localNucleotideDiversityGroup,
  mutationDensityGroup,
  mappabilityGroup,
  proximityGroup,
  spliceAiGroup,
  somaticMutationGroup,
] as const;

export const variantColumns = [
  ...basicColumns,
  ...functionalClassColumns,
  ...clinvarColumns,
  ...alleleFrequencyColumns,
  ...integrativeColumns,
  ...proteinFunctionColumns,
  ...conservationColumns,
  ...epigeneticsColumns,
  ...transcriptionFactorColumns,
  ...chromatinStateColumns,
  ...localNucleotideDiversityColumns,
  ...mutationDensityColumns,
  ...mappabilityColumns,
  ...proximityColumns,
  ...spliceAiColumns,
  ...somaticMutationColumns,
] as const;

// Re-export column builder utilities for external use
export {
  BADGE_COLORS,
  type BadgeColor,
  type Category,
  type ColumnGroup,
  categories,
  cell,
  createColumns,
  type DefaultSort,
  type DerivedColumn,
  type TransposedRow,
  tooltip,
  type ViewConfig,
  type VisualizationProps,
} from "@/infrastructure/table/column-builder";
// Open Targets columns (exported separately as they use different data types)
export { openTargetsConsequencesColumns } from "./columns/open-targets-consequences";
export { openTargetsCredibleSetsColumns } from "./columns/open-targets-credible-sets";
export { openTargetsEvidencesColumns } from "./columns/open-targets-evidences";
export { openTargetsL2GColumns } from "./columns/open-targets-l2g";
export { openTargetsPharmacogenomicsColumns } from "./columns/open-targets-pharmacogenomics";
export { openTargetsVariantEffectsColumns } from "./columns/open-targets-variant-effects";
