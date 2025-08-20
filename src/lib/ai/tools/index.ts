// Variant Analysis Tools
export * from './variant';

// Gene Analysis Tools  
export * from './gene';

// Region Analysis Tools
export * from './region';

// Protein Interactions & Pathways
export * from './interactions';

// Visualization & Utility Tools
export * from './visualization';

// Experimental/Placeholder Tools
export * from './experimental';

// Import all tools for convenience
import { getVariantInfo, getCCREData } from './variant';
import { getGeneSummary, getGeneAnnotation, getGeneVariants } from './gene';
import { getRegionSummary, getRegionVariants } from './region';
import { getBiogridInteractions, getIntactInteractions, getHuriInteractions, getPathwayPairs, getPathwayGenes } from './interactions';
import { displayBarChart, getFieldDescription } from './visualization';
import { getCRISPRData, getChiaPetData, getEQTLData } from './experimental';

// Export all tools in one object - lazy initialization to avoid circular dependencies
export const tools = {
  // Variant tools
  get getVariant() { return getVariantInfo(); },
  get ccreTool() { return getCCREData(); },
  
  // Gene tools
  get getGeneSummary() { return getGeneSummary(); },
  get getGeneAnnotation() { return getGeneAnnotation(); },
  get getGeneVariants() { return getGeneVariants(); },
  
  // Region tools
  get getRegionSummary() { return getRegionSummary(); },
  get getRegionVariants() { return getRegionVariants(); },
  
  // Interaction tools
  get getBiogrid() { return getBiogridInteractions(); },
  get getIntact() { return getIntactInteractions(); },
  get getHuri() { return getHuriInteractions(); },
  get getPathwayPairs() { return getPathwayPairs(); },
  get getPathwayGenes() { return getPathwayGenes(); },
  
  // Visualization tools
  get displayBarChart() { return displayBarChart(); },
  get getDescription() { return getFieldDescription(); },
  
  // Experimental tools
  get crisprLinksTool() { return getCRISPRData(); },
  get chiaPetLinksTool() { return getChiaPetData(); },
  get eqtlLinksTool() { return getEQTLData(); },
};