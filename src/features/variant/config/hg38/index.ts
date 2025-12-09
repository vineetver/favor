import { basicGroup, basicColumns } from "./columns/basic";
import { functionalClassGroup, functionalClassColumns } from "./columns/functional-class";
import { clinvarGroup, clinvarColumns } from "./columns/clinvar";
import { alleleFrequencyGroup, alleleFrequencyColumns } from "./columns/allele-frequency";
import { integrativeGroup, integrativeColumns } from "./columns/integrative";
import { proteinFunctionGroup, proteinFunctionColumns } from "./columns/protein-function";
import { conservationGroup, conservationColumns } from "./columns/conservation";
import { epigeneticsGroup, epigeneticsColumns } from "./columns/epigenetics";
import { transcriptionFactorGroup, transcriptionFactorColumns } from "./columns/transcription-factor";
import { chromatinStateGroup, chromatinStateColumns } from "./columns/chromatin-state";
import { localNucleotideDiversityGroup, localNucleotideDiversityColumns } from "./columns/local-nucleotide-diversity";
import { mutationDensityGroup, mutationDensityColumns } from "./columns/mutation-density";
import { mappabilityGroup, mappabilityColumns } from "./columns/mappability";
import { proximityGroup, proximityColumns } from "./columns/proximity";
import { spliceAiGroup, spliceAiColumns } from "./columns/splice-ai";
import { somaticMutationGroup, somaticMutationColumns } from "./columns/somatic-mutation";

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
export { createColumns, cell, categories, scoreDescription, tooltip, BADGE_COLORS, type BadgeColor, type Category } from "@/lib/table/column-builder";
