// Variant Analysis Tools
export * from './variantAnalysis'; // New comprehensive variant analysis

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

// Comprehensive Tools
export * from './comprehensive';

// Advanced Utilities
export * from './advanced-utilities';

// Enhanced Visualization
export * from './enhanced-visualization';

import { getVariantAnalysis, getVariantVisualization, getStandaloneVariantVisualization } from './variantAnalysis';
import { getGeneSummary, getGeneAnnotation, getGeneVariants } from './gene';
import { getRegionSummary, getRegionVariants } from './region';
import { getBiogridInteractions, getIntactInteractions, getHuriInteractions, getPathwayPairs, getPathwayGenes } from './interactions';
import { displayBarChart, getFieldDescription } from './visualization';
import { getCRISPRData, getChiaPetData, getEQTLData } from './experimental';

// Comprehensive tools
import { 
  getComprehensiveGeneSummary, getGeneAnnotationData, getGeneVariantData, 
  getGenePathwayInteractions, getGenePathwayGenes, getGeneCosmicData, getGeneProteinInteractions,
  getRegionSummaryData, getRegionVariantData, getRegionABCData, getRegionAnnotationData,
  getRegionRegulatoryData, getRegionCosmicData, getRegionVistaEnhancers
} from './comprehensive';

// Advanced utilities
import {
  analyzeDataDistribution, filterAndSortData, aggregateData, calculateCorrelation,
  generateDataSummary, performEnrichmentAnalysis
} from './advanced-utilities';

// Enhanced visualization
import {
  createScatterPlot, createBarChart, createLineChart, createHeatmap,
  createNetworkGraph, createManhattanPlot, createVolcanoPlot
} from './enhanced-visualization';

// Export all tools in one object - static definitions for AI SDK 5 compatibility
export const tools = {
  // Modern Variant Analysis Tools
  variantAnalysis: getVariantAnalysis(),
  variantVisualization: getVariantVisualization(),
  standaloneVariantVisualization: getStandaloneVariantVisualization(),
  
  // Basic Gene tools
  getGeneSummary: getGeneSummary(),
  getGeneAnnotation: getGeneAnnotation(),
  getGeneVariants: getGeneVariants(),
  
  // Basic Region tools
  getRegionSummary: getRegionSummary(),
  getRegionVariants: getRegionVariants(),
  
  // Interaction tools
  getBiogrid: getBiogridInteractions(),
  getIntact: getIntactInteractions(),
  getHuri: getHuriInteractions(),
  getPathwayPairs: getPathwayPairs(),
  getPathwayGenes: getPathwayGenes(),
  
  // Basic Visualization tools
  displayBarChart: displayBarChart(),
  getDescription: getFieldDescription(),
  
  // Experimental tools
  crisprLinksTool: getCRISPRData(),
  chiaPetLinksTool: getChiaPetData(),
  eqtlLinksTool: getEQTLData(),

  // Comprehensive Gene Analysis
  comprehensiveGeneSummary: getComprehensiveGeneSummary(),
  geneAnnotationData: getGeneAnnotationData(),
  geneVariantData: getGeneVariantData(),
  genePathwayInteractions: getGenePathwayInteractions(),
  genePathwayGenes: getGenePathwayGenes(),
  geneCosmicData: getGeneCosmicData(),
  geneProteinInteractions: getGeneProteinInteractions(),
  
  // Comprehensive Region Analysis
  regionSummaryData: getRegionSummaryData(),
  regionVariantData: getRegionVariantData(),
  regionABCData: getRegionABCData(),
  regionAnnotationData: getRegionAnnotationData(),
  regionRegulatoryData: getRegionRegulatoryData(),
  regionCosmicData: getRegionCosmicData(),
  regionVistaEnhancers: getRegionVistaEnhancers(),
  
  // Advanced Data Utilities
  analyzeDistribution: analyzeDataDistribution(),
  filterAndSort: filterAndSortData(),
  aggregateData: aggregateData(),
  calculateCorrelation: calculateCorrelation(),
  generateSummary: generateDataSummary(),
  enrichmentAnalysis: performEnrichmentAnalysis(),
  
  // Enhanced Visualizations
  scatterPlot: createScatterPlot(),
  barChart: createBarChart(),
  lineChart: createLineChart(),
  heatmap: createHeatmap(),
  networkGraph: createNetworkGraph(),
  manhattanPlot: createManhattanPlot(),
  volcanoPlot: createVolcanoPlot(),
};