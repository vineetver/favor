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

// Export all tools in one object - static definitions for AI SDK 5 compatibility
export const tools = {
  // Variant tools
  getVariant: getVariantInfo(),
  ccreTool: getCCREData(),
  
  // Gene tools
  getGeneSummary: getGeneSummary(),
  getGeneAnnotation: getGeneAnnotation(),
  getGeneVariants: getGeneVariants(),
  
  // Region tools
  getRegionSummary: getRegionSummary(),
  getRegionVariants: getRegionVariants(),
  
  // Interaction tools
  getBiogrid: getBiogridInteractions(),
  getIntact: getIntactInteractions(),
  getHuri: getHuriInteractions(),
  getPathwayPairs: getPathwayPairs(),
  getPathwayGenes: getPathwayGenes(),
  
  // Visualization tools
  displayBarChart: displayBarChart(),
  getDescription: getFieldDescription(),
  
  // Experimental tools
  crisprLinksTool: getCRISPRData(),
  chiaPetLinksTool: getChiaPetData(),
  eqtlLinksTool: getEQTLData(),
};