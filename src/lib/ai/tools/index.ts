// Core Analysis Tools - Streamlined 4-tool architecture
export * from './variantAnalysis';
export * from './comprehensive';
export * from './enhanced-visualization';

import { getVariantAnalysis } from './variantAnalysis';
import { getComprehensiveGeneSummary } from './comprehensive';
import { getRegionSummaryData } from './comprehensive';
import { createUniversalVisualization } from './enhanced-visualization';

// STREAMLINED: Only 4 major tools to prevent rerenders and complexity
export const tools = {
  // 1. Variant Analysis - Analyze SPECIFIC known variants by VCF ID or rsID (NOT for listing variants within genes/regions)
  variantAnalysis: getVariantAnalysis(),
  
  // 2. Gene Analysis - Gene summaries, variants within genes, pathways, interactions, etc.
  geneAnalysis: getComprehensiveGeneSummary(),
  
  // 3. Region Analysis - Region summaries, variants within regions, regulatory elements, etc.
  regionAnalysis: getRegionSummaryData(),
  
  // 4. Visualization - Universal visualization tool for all chart types
  visualization: createUniversalVisualization(),
};