import type { ReactNode } from "react";
import { 
  isValidNumber,
  isValidString,
  isValidArray,
  roundNumber,
  formatScientific,
  splitText,
  cleanText,
  truncateText,
  parseStringToNumber,
  getConstraintScore,
  formatExternalId,
  formatGeneSymbol,
  formatChromosomeLocation
} from "@shared/utils";

// Re-export commonly used utilities for gene feature
export {
  isValidNumber,
  isValidString,
  isValidArray,
  roundNumber,
  formatScientific,
  splitText,
  cleanText,
  truncateText,
  parseStringToNumber,
  getConstraintScore,
  formatExternalId,
  formatGeneSymbol,
  formatChromosomeLocation
};
