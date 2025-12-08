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
] as const;

// Re-export column builder utilities for external use
export { createColumns, cell, categories, scoreDescription, tooltip, BADGE_COLORS, type BadgeColor, type Category } from "@/lib/table/column-builder";
