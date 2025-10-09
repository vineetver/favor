export * from "./variantAnalysis";
export * from "./gene-tools";
export * from "./region-tools";
export * from "./bar-chart-tool";

import { getVariantAnalysis } from "./variantAnalysis";
import { createBarChart } from "./bar-chart-tool";

// Import all gene tools from the dedicated gene-tools file
import {
  getComprehensiveGeneSummary,
  getGeneAnnotationData,
  getGeneVariantData,
  getGenePathwayInteractions,
  getGenePathwayGenes,
  getGeneCosmicData,
  getGeneProteinInteractions,
} from "./gene-tools";

// Import all region tools from the dedicated region-tools file
import {
  getRegionSummaryData,
  getRegionVariantData,
  getRegionABCData,
  getRegionAnnotationData,
  getRegionRegulatoryData,
  getRegionCosmicData,
  getRegionVistaEnhancers,
} from "./region-tools";

// COMPREHENSIVE GENE AND GENOMIC ANALYSIS TOOLS
export const tools = {
  // 1. Variant Analysis - Analyze SPECIFIC known variants by VCF ID or rsID (NOT for listing variants within genes/regions)
  variantAnalysis: getVariantAnalysis(),

  // 2. Gene Tools - Comprehensive gene analysis suite
  geneSummary: getComprehensiveGeneSummary(),           // Counting/statistics only
  geneAnnotation: getGeneAnnotationData(),             // Gene info, function, diseases, phenotypes
  geneVariants: getGeneVariantData(),                  // List/browse variants in genes
  genePathwayInteractions: getGenePathwayInteractions(), // Pathway interaction pairs
  genePathwayGenes: getGenePathwayGenes(),             // Genes in same pathways
  geneCosmic: getGeneCosmicData(),                     // COSMIC cancer data
  geneProteinInteractions: getGeneProteinInteractions(), // Protein-protein interactions

  // 3. Region Tools - Comprehensive region analysis suite
  regionSummary: getRegionSummaryData(),                // Counting/statistics only
  regionVariants: getRegionVariantData(),              // List/browse variants in regions
  regionABC: getRegionABCData(),                       // ABC enhancer-gene predictions
  regionAnnotation: getRegionAnnotationData(),         // Region annotations
  regionRegulatory: getRegionRegulatoryData(),         // VISTA, EpiMap, PGBoost data
  regionCosmic: getRegionCosmicData(),                 // COSMIC cancer data for regions
  regionVistaEnhancers: getRegionVistaEnhancers(),     // VISTA enhancer data

  barChart: createBarChart(),
};
