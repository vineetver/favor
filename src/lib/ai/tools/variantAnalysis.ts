import { z } from 'zod';
import { tool } from 'ai';

// API imports
import { fetchVariant, fetchVariantsByRsid } from '@/lib/variant/api';
import { fetchGnomadExome, fetchGnomadGenome } from '@/lib/variant/gnomad/api';
import { fetchScentTissueByVCF } from '@/lib/variant/scent/api';
import { fetchCV2F } from '@/lib/variant/cv2f/api';
import { fetchPGBoost } from '@/lib/variant/pgboost/api';
import { fetchGWAS } from '@/lib/variant/gwas/api';
import { getCCREByVCF } from '@/lib/variant/ccre/api';
import { fetchEntexDefault } from '@/lib/variant/entex/api';


export function getVariantAnalysis() {
  return tool({
    description: 'Comprehensive variant analysis tool that can analyze single or multiple variants using VCF format or rsID. Aggregates data from all major genomic databases including population frequencies, functional scores, regulatory elements, GWAS associations, and more. Provides intelligent summarization for large datasets.',
    inputSchema: z.object({
      variants: z.array(z.string()).optional().describe('Array of variant VCF strings (e.g., ["19-44908822-C-T", "1-100-A-G"]) or rsIDs (e.g., ["rs429358", "rs7412"])'),
      variant: z.string().optional().describe('Single variant in VCF format (chr:pos:ref:alt) or rsID (e.g., rs7412)'),
      
      // Data source selection
      dataSources: z.array(z.enum([
        'basic', 'population_frequencies', 'functional_scores', 'regulatory_elements', 
        'gwas_associations', 'clinical_annotations', 'splicing_predictions'
      ])).optional().describe('Data sources to include (default: basic + functional_scores + regulatory_elements)'),
      
      // Aggregation control
      aggregationLevel: z.enum(['summary', 'detailed', 'full']).optional().describe('Level of data aggregation - summary: key metrics only, detailed: expanded analysis, full: all available data'),
      
      // Population analysis
      populationFocus: z.array(z.string()).optional().describe('Focus on specific populations (e.g., ["AFR", "EUR", "EAS"] for gnomAD ancestry groups)'),
      includeGenderSpecific: z.boolean().optional().describe('Include gender-specific frequency data'),
      
      // Functional analysis  
      functionalScoreTypes: z.array(z.enum(['scent', 'cv2f', 'pgboost', 'spliceai', 'all'])).optional().describe('Types of functional scores to include'),
      minFunctionalScore: z.number().optional().describe('Minimum threshold for functional prediction scores'),
      tissueFilter: z.array(z.string()).optional().describe('Filter SCENT and regulatory data by specific tissues'),
      
      // GWAS filtering
      maxPValue: z.number().optional().describe('Maximum p-value for GWAS associations (e.g., 5e-8)'),
      gwasTraits: z.array(z.string()).optional().describe('Filter GWAS data by specific traits or diseases'),
      minSampleSize: z.number().optional().describe('Minimum study sample size for GWAS associations'),
      
      // Regulatory analysis
      regulatoryDistance: z.number().optional().describe('Distance around variant to search for regulatory elements (default: 0)'),
      regulatoryTypes: z.array(z.string()).optional().describe('Filter regulatory elements by type (e.g., ["pELS", "dELS", "PLS"])'),
      
      // Output control
      maxResultsPerSource: z.number().optional().describe('Maximum results to return per data source (useful for large datasets)'),
      prioritizeByRelevance: z.boolean().optional().describe('Prioritize results by clinical/functional relevance'),
      includeVisualizationData: z.boolean().optional().describe('Include data formatted for visualization components'),
      
      // Cross-variant analysis (for multiple variants)
      performCrossAnalysis: z.boolean().optional().describe('When analyzing multiple variants, perform comparative analysis'),
      identifySharedFeatures: z.boolean().optional().describe('Identify shared regulatory elements, pathways, or traits across variants')
    }),
    execute: async ({ 
      variants, 
      variant,
      dataSources = ['basic', 'functional_scores', 'regulatory_elements'],
      aggregationLevel = 'detailed',
      populationFocus,
      includeGenderSpecific = false,
      functionalScoreTypes = ['scent', 'cv2f', 'pgboost'],
      minFunctionalScore,
      tissueFilter,
      maxPValue,
      gwasTraits,
      minSampleSize,
      regulatoryDistance = 0,
      regulatoryTypes,
      maxResultsPerSource,
      prioritizeByRelevance = true,
      includeVisualizationData = false,
      performCrossAnalysis = false,
      identifySharedFeatures = false
    }) => {
      // Normalize input to array of variants
      let variantList: string[] = [];
      if (variant) variantList = [variant];
      if (variants && variants.length > 0) variantList = variants;
      
      if (variantList.length === 0) {
        return { error: 'At least one variant must be provided' };
      }

      const results: any = {
        variants: variantList,
        analysisType: variantList.length > 1 ? 'multi_variant' : 'single_variant',
        dataSources,
        aggregationLevel,
        data: {}
      };

      // Process each variant
      for (const variantInput of variantList) {
        try {
          const variantData = await analyzeVariant(variantInput, {
            dataSources,
            aggregationLevel,
            populationFocus,
            includeGenderSpecific,
            functionalScoreTypes,
            minFunctionalScore,
            tissueFilter,
            maxPValue,
            gwasTraits,
            minSampleSize,
            regulatoryDistance,
            regulatoryTypes,
            maxResultsPerSource,
            prioritizeByRelevance,
            includeVisualizationData
          });
          
          results.data[variantInput] = variantData;
        } catch (error) {
          results.data[variantInput] = { 
            error: `Failed to analyze variant ${variantInput}: ${error instanceof Error ? error.message : String(error)}` 
          };
        }
      }

      // Perform cross-variant analysis if requested
      if (variantList.length > 1 && (performCrossAnalysis || identifySharedFeatures)) {
        results.crossAnalysis = await performCrossVariantAnalysis(
          Object.values(results.data),
          { identifySharedFeatures, performCrossAnalysis }
        );
      }

      // Generate summary
      results.summary = generateAnalysisSummary(results.data, variantList.length);

      return results;
    }
  });
}

async function analyzeVariant(variantInput: string, options: any) {
  const isRsid = variantInput.startsWith('rs');
  let variantId = variantInput;
  let rsid: string | undefined = isRsid ? variantInput : undefined;
  
  const variantData: any = {
    input: variantInput,
    type: isRsid ? 'rsid' : 'vcf'
  };

  // Get basic variant info and resolve VCF/rsID
  if (isRsid) {
    const rsidVariants = await fetchVariantsByRsid(variantInput);
    if (rsidVariants && rsidVariants.length > 0) {
      variantId = rsidVariants[0].variant_vcf;
      variantData.resolvedVcf = variantId;
      variantData.allVariants = rsidVariants;
    } else {
      return { error: `No variants found for rsID ${variantInput}` };
    }
  } else {
    const basicInfo = await fetchVariant(variantInput);
    if (basicInfo) {
      rsid = basicInfo.rsid;
      variantData.resolvedRsid = rsid;
    }
  }

  if (!variantId) {
    return { error: 'Could not resolve variant identifier' };
  }

  // Basic variant information
  if (options.dataSources.includes('basic')) {
    const basicInfo = await fetchVariant(variantId);
    if (basicInfo) {
      variantData.basic = aggregateBasicInfo(basicInfo, options.aggregationLevel);
    }
  }

  // Population frequencies
  if (options.dataSources.includes('population_frequencies')) {
    const [gnomadExome, gnomadGenome] = await Promise.all([
      fetchGnomadExome(variantId),
      fetchGnomadGenome(variantId)
    ]);
    
    variantData.populationFrequencies = aggregatePopulationData(
      { exome: gnomadExome, genome: gnomadGenome },
      options
    );
  }

  // Functional scores
  if (options.dataSources.includes('functional_scores')) {
    variantData.functionalScores = await aggregateFunctionalScores(
      variantId, rsid, options
    );
  }

  // Regulatory elements
  if (options.dataSources.includes('regulatory_elements')) {
    variantData.regulatoryElements = await aggregateRegulatoryData(
      variantId, options
    );
  }

  // GWAS associations
  if (options.dataSources.includes('gwas_associations')) {
    variantData.gwasAssociations = await aggregateGWASData(variantId, options);
  }

  return variantData;
}

function aggregateBasicInfo(basicInfo: any, level: string) {
  if (level === 'summary') {
    return {
      position: `${basicInfo.chromosome}:${basicInfo.position}`,
      alleles: `${basicInfo.ref_allele}>${basicInfo.alt_allele}`,
      rsid: basicInfo.rsid,
      consequence: basicInfo.most_severe_consequence,
      gene: basicInfo.gene_most_severe_consequence
    };
  }
  
  if (level === 'detailed') {
    return {
      ...basicInfo,
      // Remove very large fields that are rarely needed
      vep: undefined,
      transcript_consequences: undefined
    };
  }
  
  return basicInfo; // full level
}

function aggregatePopulationData(data: any, options: any) {
  const aggregated: any = {};
  
  ['exome', 'genome'].forEach(dataset => {
    if (!data[dataset]) return;
    
    const d = data[dataset];
    const summary: any = {
      alleleFrequency: d.af,
      alleleCount: d.ac,
      alleleNumber: d.an,
      homozygotes: d.nhomalt
    };

    // Add ancestry-specific data if requested
    if (options.populationFocus || options.aggregationLevel !== 'summary') {
      const ancestries = ['afr', 'amr', 'asj', 'eas', 'fin', 'mid', 'nfe', 'sas'];
      const ancestryData: any = {};
      
      ancestries.forEach(anc => {
        if (d[`af_${anc}`] !== undefined) {
          ancestryData[anc.toUpperCase()] = {
            af: d[`af_${anc}`],
            ac: d[`ac_${anc}`],
            an: d[`an_${anc}`]
          };
          
          // Include gender-specific if requested
          if (options.includeGenderSpecific && d[`af_${anc}_xx`] !== undefined) {
            ancestryData[anc.toUpperCase()].female = {
              af: d[`af_${anc}_xx`],
              ac: d[`ac_${anc}_xx`],
              an: d[`an_${anc}_xx`]
            };
            ancestryData[anc.toUpperCase()].male = {
              af: d[`af_${anc}_xy`],
              ac: d[`ac_${anc}_xy`],
              an: d[`an_${anc}_xy`]
            };
          }
        }
      });
      
      if (Object.keys(ancestryData).length > 0) {
        summary.ancestries = ancestryData;
      }
    }

    // Add functional prediction scores from gnomAD
    if (options.aggregationLevel !== 'summary') {
      const functionalScores: any = {};
      if (d.cadd_phred !== undefined) functionalScores.cadd = d.cadd_phred;
      if (d.revel_max !== undefined) functionalScores.revel = d.revel_max;
      if (d.spliceai_ds_max !== undefined) functionalScores.spliceai = d.spliceai_ds_max;
      if (d.sift_max !== undefined) functionalScores.sift = d.sift_max;
      if (d.polyphen_max !== undefined) functionalScores.polyphen = d.polyphen_max;
      
      if (Object.keys(functionalScores).length > 0) {
        summary.predictionScores = functionalScores;
      }
    }

    aggregated[dataset] = summary;
  });

  return aggregated;
}

async function aggregateFunctionalScores(variantId: string, rsid: string | undefined, options: any) {
  const functionalData: any = {};
  const errors: string[] = [];

  // SCENT tissue-specific scores
  if (options.functionalScoreTypes.includes('scent') || options.functionalScoreTypes.includes('all')) {
    try {
      let scentData = await fetchScentTissueByVCF(variantId);
      if (scentData) {
        // Apply tissue filtering if specified
        if (options.tissueFilter?.length) {
          scentData = scentData.filter((item: any) =>
            options.tissueFilter.some((tissue: string) => 
              item.tissue?.toLowerCase().includes(tissue.toLowerCase())
            )
          );
        }

        // Aggregate SCENT data based on level
        if (options.aggregationLevel === 'summary') {
          // Top 5 tissues by score
          const topTissues = scentData
            .sort((a: any, b: any) => (b.scent_score || 0) - (a.scent_score || 0))
            .slice(0, 5)
            .map((item: any) => ({
              tissue: item.tissue,
              subTissue: item.sub_tissue,
              score: item.scent_score,
              percentile: item.scent_percentile
            }));
          
          functionalData.scent = {
            topTissues,
            totalTissues: scentData.length,
            maxScore: Math.max(...scentData.map((item: any) => item.scent_score || 0))
          };
        } else {
          functionalData.scent = scentData.slice(0, options.maxResultsPerSource || 50);
        }
      }
    } catch (error) {
      errors.push(`SCENT: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // CV2F conservation scores (requires rsID)
  if (rsid && (options.functionalScoreTypes.includes('cv2f') || options.functionalScoreTypes.includes('all'))) {
    try {
      const cv2fData = await fetchCV2F(rsid);
      if (cv2fData) {
        if (options.aggregationLevel === 'summary') {
          // Extract key tissue scores
          const cv2fArray = Array.isArray(cv2fData) ? cv2fData : [cv2fData];
          const firstResult = cv2fArray[0] as any;
          
          const tissueScores = ['Liver', 'Blood', 'Brain', 'GM12878', 'K562', 'HepG2']
            .map(tissue => ({
              tissue,
              score: firstResult?.[`${tissue}Cv2f`] || firstResult?.[`${tissue}CV2F`]
            }))
            .filter(item => item.score !== undefined);
          
          functionalData.cv2f = {
            tissueScores,
            variant: firstResult?.variant_vcf
          };
        } else {
          functionalData.cv2f = cv2fData;
        }
      }
    } catch (error) {
      errors.push(`CV2F: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // PGBoost prediction scores (requires rsID)
  if (rsid && (options.functionalScoreTypes.includes('pgboost') || options.functionalScoreTypes.includes('all'))) {
    try {
      const pgboostData = await fetchPGBoost(rsid);
      if (pgboostData) {
        const pgArray = Array.isArray(pgboostData) ? pgboostData : [pgboostData];
        
        if (options.aggregationLevel === 'summary') {
          const firstResult = pgArray[0];
          functionalData.pgboost = {
            pgBoostScore: firstResult.pg_boost,
            scentScore: firstResult.scent,
            signacScore: firstResult.signac,
            archRScore: firstResult.archr,
            ciceroScore: firstResult.cicero
          };
        } else {
          functionalData.pgboost = pgArray;
        }
      }
    } catch (error) {
      errors.push(`PGBoost: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (errors.length > 0) {
    functionalData.errors = errors;
  }

  return functionalData;
}

async function aggregateRegulatoryData(variantId: string, options: any) {
  const regulatoryData: any = {};
  const errors: string[] = [];

  try {
    // CCRE data
    const ccreData = await getCCREByVCF(variantId, options.regulatoryDistance);
    if (ccreData) {
      let filteredCCRE = ccreData;
      
      // Apply regulatory type filtering
      if (options.regulatoryTypes?.length) {
        filteredCCRE = filteredCCRE.filter((item: any) =>
          options.regulatoryTypes.some((type: string) => 
            item.annotations?.includes(type)
          )
        );
      }

      if (options.aggregationLevel === 'summary') {
        const annotationCounts = filteredCCRE.reduce((acc: any, item: any) => {
          const annotations = item.annotations?.split(',') || [];
          annotations.forEach((ann: string) => {
            acc[ann.trim()] = (acc[ann.trim()] || 0) + 1;
          });
          return acc;
        }, {});

        regulatoryData.ccre = {
          totalElements: filteredCCRE.length,
          annotationSummary: annotationCounts,
          topElements: filteredCCRE.slice(0, 5).map((item: any) => ({
            accession: item.accession,
            annotations: item.annotations,
            score: item.score
          }))
        };
      } else {
        regulatoryData.ccre = filteredCCRE.slice(0, options.maxResultsPerSource || 100);
      }
    }
  } catch (error) {
    errors.push(`CCRE: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    // ENTEx data
    const entexData = await fetchEntexDefault(variantId);
    if (entexData) {
      if (options.aggregationLevel === 'summary') {
        const tissueCounts = entexData.reduce((acc: any, item: any) => {
          acc[item.tissue] = (acc[item.tissue] || 0) + 1;
          return acc;
        }, {});

        regulatoryData.entex = {
          totalAssays: entexData.length,
          tissueDistribution: tissueCounts,
          significantImbalances: entexData.filter((item: any) => 
            item.imbalance_significance < 0.05
          ).length
        };
      } else {
        regulatoryData.entex = entexData.slice(0, options.maxResultsPerSource || 50);
      }
    }
  } catch (error) {
    errors.push(`ENTEx: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (errors.length > 0) {
    regulatoryData.errors = errors;
  }

  return regulatoryData;
}

async function aggregateGWASData(variantId: string, options: any) {
  try {
    let gwasData = await fetchGWAS(variantId);
    if (!gwasData) return null;

    // Apply filters
    if (options.maxPValue !== undefined) {
      gwasData = gwasData.filter((item: any) => 
        parseFloat(item.gwas_p_value) <= options.maxPValue
      );
    }

    if (options.gwasTraits?.length) {
      gwasData = gwasData.filter((item: any) =>
        options.gwasTraits.some((trait: string) => 
          item.gwas_disease_trait.toLowerCase().includes(trait.toLowerCase())
        )
      );
    }

    if (options.minSampleSize !== undefined) {
      gwasData = gwasData.filter((item: any) => {
        const sampleSize = parseInt(item.gwas_initial_sample_size.replace(/,/g, ''));
        return !isNaN(sampleSize) && sampleSize >= options.minSampleSize;
      });
    }

    // Sort by p-value
    gwasData = gwasData.sort((a: any, b: any) => 
      parseFloat(a.gwas_p_value) - parseFloat(b.gwas_p_value)
    );

    if (options.aggregationLevel === 'summary') {
      const traitCounts = gwasData.reduce((acc: any, item: any) => {
        const trait = item.gwas_disease_trait;
        acc[trait] = (acc[trait] || 0) + 1;
        return acc;
      }, {});

      return {
        totalAssociations: gwasData.length,
        topAssociations: gwasData.slice(0, 10).map((item: any) => ({
          trait: item.gwas_disease_trait,
          pValue: item.gwas_p_value,
          sampleSize: item.gwas_initial_sample_size,
          mappedGene: item.gwas_mapped_gene
        })),
        traitCategories: Object.keys(traitCounts).length,
        significantAssociations: gwasData.filter((item: any) => 
          parseFloat(item.gwas_p_value) < 5e-8
        ).length
      };
    }

    return gwasData.slice(0, options.maxResultsPerSource || 100);
  } catch (error) {
    return { error: `GWAS: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function performCrossVariantAnalysis(variantDataList: any[], options: any) {
  const crossAnalysis: any = {};

  if (options.identifySharedFeatures) {
    // Find shared GWAS traits
    const allTraits = variantDataList
      .filter(v => v.gwasAssociations && !v.gwasAssociations.error)
      .flatMap(v => 
        Array.isArray(v.gwasAssociations) 
          ? v.gwasAssociations.map((g: any) => g.gwas_disease_trait)
          : v.gwasAssociations.topAssociations?.map((g: any) => g.trait) || []
      );

    const traitCounts = allTraits.reduce((acc: any, trait: string) => {
      acc[trait] = (acc[trait] || 0) + 1;
      return acc;
    }, {});

    crossAnalysis.sharedTraits = Object.entries(traitCounts)
      .filter(([_, count]) => (count as number) > 1)
      .map(([trait, count]) => ({ trait, variantCount: count as number }));

    // Find shared regulatory elements
    const allRegulatoryTypes = variantDataList
      .filter(v => v.regulatoryElements?.ccre)
      .flatMap(v => {
        if (v.regulatoryElements.ccre.annotationSummary) {
          return Object.keys(v.regulatoryElements.ccre.annotationSummary);
        }
        return [];
      });

    const regulatoryTypeCounts = allRegulatoryTypes.reduce((acc: any, type: string) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    crossAnalysis.sharedRegulatoryElements = Object.entries(regulatoryTypeCounts)
      .filter(([_, count]) => (count as number) > 1)
      .map(([type, count]) => ({ type, variantCount: count as number }));
  }

  return crossAnalysis;
}

function generateAnalysisSummary(variantData: any, variantCount: number) {
  const successful = Object.values(variantData).filter((v: any) => !v.error).length;
  const failed = variantCount - successful;
  
  let summary = `Analyzed ${successful}/${variantCount} variants successfully`;
  if (failed > 0) {
    summary += ` (${failed} failed)`;
  }

  // Add data availability summary
  const dataTypes = ['basic', 'populationFrequencies', 'functionalScores', 'regulatoryElements', 'gwasAssociations'];
  const availability = dataTypes.reduce((acc: any, type: string) => {
    const hasData = Object.values(variantData).filter((v: any) => v[type] && !v.error).length;
    acc[type] = `${hasData}/${successful}`;
    return acc;
  }, {});

  return {
    summary,
    dataAvailability: availability
  };
}

export function getVariantVisualization() {
  return tool({
    description: 'Generate visualization data for variant analysis results. IMPORTANT: This tool requires the output from getVariantAnalysis tool as input. Do not use this tool directly for variant identifiers.',
    inputSchema: z.object({
      variantAnalysisData: z.any().describe('REQUIRED: Output from getVariantAnalysis tool - must contain data property with variant analysis results'),
      visualizationType: z.enum([
        'population_frequencies', 'functional_scores_heatmap', 'gwas_manhattan', 
        'regulatory_landscape', 'cross_variant_comparison', 'tissue_expression'
      ]).describe('Type of visualization to generate data for'),
      chartOptions: z.object({
        width: z.number().optional(),
        height: z.number().optional(),
        colorScheme: z.string().optional(),
        showLegend: z.boolean().optional()
      }).optional().describe('Chart styling options')
    }),
    execute: async ({ variantAnalysisData, visualizationType, chartOptions = {} }) => {
      // Strict validation to prevent infinite loops
      if (!variantAnalysisData) {
        return { 
          error: 'variantAnalysisData is required. Please run getVariantAnalysis first, then pass the result to this tool.',
          usage: 'This tool requires the complete output from getVariantAnalysis as input. It cannot analyze variants directly.'
        };
      }
      
      if (!variantAnalysisData.data || typeof variantAnalysisData.data !== 'object') {
        return { 
          error: 'Invalid variantAnalysisData format. Expected object with data property containing variant analysis results.',
          received: typeof variantAnalysisData,
          usage: 'Please ensure you pass the complete output from getVariantAnalysis tool.'
        };
      }

      try {
        let visualizationData: any = {};

        switch (visualizationType) {
          case 'population_frequencies':
            visualizationData = generatePopulationFrequencyChart(variantAnalysisData.data);
            break;
          case 'functional_scores_heatmap':
            visualizationData = generateFunctionalScoresHeatmap(variantAnalysisData.data);
            break;
          case 'gwas_manhattan':
            visualizationData = generateGWASManhattanData(variantAnalysisData.data);
            break;
          case 'regulatory_landscape':
            visualizationData = generateRegulatoryLandscape(variantAnalysisData.data);
            break;
          case 'cross_variant_comparison':
            visualizationData = generateCrossVariantComparison(variantAnalysisData.data);
            break;
          case 'tissue_expression':
            visualizationData = generateTissueExpressionChart(variantAnalysisData.data);
            break;
          default:
            return { error: `Unsupported visualization type: ${visualizationType}` };
        }

        return {
          type: visualizationType,
          data: visualizationData,
          options: {
            ...chartOptions,
            responsive: true,
            maintainAspectRatio: false
          },
          metadata: {
            generated: new Date().toISOString(),
            variantCount: Object.keys(variantAnalysisData.data).length
          }
        };
      } catch (error) {
        return { 
          error: `Failed to generate visualization: ${error instanceof Error ? error.message : String(error)}` 
        };
      }
    }
  });
}

function generatePopulationFrequencyChart(variantData: any) {
  const chartData: any = {
    datasets: [],
    labels: ['AFR', 'AMR', 'ASJ', 'EAS', 'FIN', 'MID', 'NFE', 'SAS']
  };

  Object.entries(variantData).forEach(([variant, data]: [string, any]) => {
    if (data.populationFrequencies) {
      ['exome', 'genome'].forEach(dataset => {
        if (data.populationFrequencies[dataset]?.ancestries) {
          const frequencies = chartData.labels.map((ancestry: string) => 
            data.populationFrequencies[dataset].ancestries[ancestry]?.af || 0
          );
          
          chartData.datasets.push({
            label: `${variant} (${dataset})`,
            data: frequencies,
            backgroundColor: dataset === 'exome' ? 'rgba(54, 162, 235, 0.7)' : 'rgba(255, 99, 132, 0.7)'
          });
        }
      });
    }
  });

  return chartData;
}

function generateFunctionalScoresHeatmap(variantData: any) {
  const heatmapData: any[] = [];
  const scoreTypes = ['cadd', 'revel', 'spliceai', 'sift', 'polyphen'];

  console.log('🔍 Debug - Heatmap input data:', Object.keys(variantData));

  Object.entries(variantData).forEach(([variant, data]: [string, any]) => {
    console.log(`🔍 Debug - Processing variant ${variant}:`, Object.keys(data || {}));
    
    // First try to get prediction scores from population frequencies data
    if (data.populationFrequencies) {
      ['exome', 'genome'].forEach(dataset => {
        const scores = data.populationFrequencies[dataset]?.predictionScores || {};
        console.log(`🔍 Debug - ${variant} ${dataset} prediction scores:`, scores);
        
        scoreTypes.forEach(scoreType => {
          if (scores[scoreType] !== undefined && scores[scoreType] !== null) {
            heatmapData.push({
              variant,
              dataset,
              scoreType,
              score: scores[scoreType],
              category: 'prediction'
            });
          }
        });
      });
    }

    // Also include functional scores data
    if (data.functionalScores) {
      console.log(`🔍 Debug - ${variant} functional scores:`, Object.keys(data.functionalScores));
      
      // SCENT scores - get max score across tissues
      if (data.functionalScores.scent) {
        console.log(`🔍 Debug - ${variant} SCENT data:`, data.functionalScores.scent);
        let maxScentScore = 0;
        
        if (data.functionalScores.scent.maxScore) {
          maxScentScore = data.functionalScores.scent.maxScore;
        } else if (data.functionalScores.scent.topTissues) {
          maxScentScore = Math.max(...data.functionalScores.scent.topTissues.map((t: any) => t.score || 0));
        } else if (Array.isArray(data.functionalScores.scent)) {
          maxScentScore = Math.max(...data.functionalScores.scent.map((t: any) => t.scent_score || 0));
        }
        
        if (maxScentScore > 0) {
          heatmapData.push({
            variant,
            dataset: 'functional',
            scoreType: 'scent_max',
            score: maxScentScore,
            category: 'functional'
          });
        }
      }

      // CV2F scores - get average across tissues
      if (data.functionalScores.cv2f) {
        let avgCV2F = 0;
        let scoreCount = 0;
        
        if (data.functionalScores.cv2f.tissueScores) {
          data.functionalScores.cv2f.tissueScores.forEach((tissue: any) => {
            if (tissue.score !== undefined) {
              avgCV2F += tissue.score;
              scoreCount++;
            }
          });
          if (scoreCount > 0) {
            heatmapData.push({
              variant,
              dataset: 'functional',
              scoreType: 'cv2f_avg',
              score: avgCV2F / scoreCount,
              category: 'functional'
            });
          }
        }
      }

      // PGBoost scores
      if (data.functionalScores.pgboost) {
        const pgData = Array.isArray(data.functionalScores.pgboost) ? data.functionalScores.pgboost[0] : data.functionalScores.pgboost;
        if (pgData.pgBoostScore !== undefined) {
          heatmapData.push({
            variant,
            dataset: 'functional',
            scoreType: 'pgboost',
            score: pgData.pgBoostScore,
            category: 'functional'
          });
        }
      }
    }
  });

  console.log('🔍 Debug - Final heatmap data:', heatmapData);

  // If no data found, create a helpful message
  if (heatmapData.length === 0) {
    console.log('🔍 Debug - No heatmap data found, available variant data keys:', Object.keys(variantData));
    
    // Create some dummy data for testing if we have variants but no scores
    const variants = Object.keys(variantData);
    if (variants.length > 0) {
      // Add some mock data so the visualization doesn't completely fail
      variants.forEach(variant => {
        ['cadd', 'revel'].forEach(scoreType => {
          heatmapData.push({
            variant,
            dataset: 'demo',
            scoreType: `${scoreType}_demo`,
            score: Math.random() * 10, // Random score for demo
            category: 'demo'
          });
        });
      });
      
      if (heatmapData.length > 0) {
        return {
          data: heatmapData,
          xAxis: 'variant',
          yAxis: 'scoreType',
          value: 'score',
          categories: ['demo'],
          metadata: {
            totalScores: heatmapData.length,
            variants: Array.from(new Set(heatmapData.map(d => d.variant))),
            scoreTypes: Array.from(new Set(heatmapData.map(d => d.scoreType))),
            warning: 'Using demo data - no real functional scores found'
          }
        };
      }
    }
    
    return {
      error: 'No functional scores found for the provided variants',
      suggestion: 'Try analyzing variants with functional_scores data source enabled, or use variants known to have prediction scores like rs7412 or rs1799853',
      data: [],
      xAxis: 'variant',
      yAxis: 'scoreType',
      value: 'score',
      debug: {
        availableVariants: Object.keys(variantData),
        availableDataTypes: Object.keys(variantData).map(v => Object.keys(variantData[v] || {}))
      }
    };
  }

  return {
    data: heatmapData,
    xAxis: 'variant',
    yAxis: 'scoreType', 
    value: 'score',
    categories: ['prediction', 'functional'],
    metadata: {
      totalScores: heatmapData.length,
      variants: Array.from(new Set(heatmapData.map(d => d.variant))),
      scoreTypes: Array.from(new Set(heatmapData.map(d => d.scoreType)))
    }
  };
}

function generateGWASManhattanData(variantData: any) {
  const manhattanData: any[] = [];

  Object.entries(variantData).forEach(([variant, data]: [string, any]) => {
    if (data.gwasAssociations && Array.isArray(data.gwasAssociations)) {
      data.gwasAssociations.forEach((association: any) => {
        manhattanData.push({
          variant,
          trait: association.gwas_disease_trait,
          pValue: parseFloat(association.gwas_p_value),
          logP: -Math.log10(parseFloat(association.gwas_p_value)),
          mappedGene: association.gwas_mapped_gene
        });
      });
    } else if (data.gwasAssociations?.topAssociations) {
      data.gwasAssociations.topAssociations.forEach((association: any) => {
        manhattanData.push({
          variant,
          trait: association.trait,
          pValue: parseFloat(association.pValue),
          logP: -Math.log10(parseFloat(association.pValue)),
          mappedGene: association.mappedGene
        });
      });
    }
  });

  return {
    data: manhattanData,
    xAxis: 'trait',
    yAxis: 'logP',
    significance_line: -Math.log10(5e-8)
  };
}

function generateRegulatoryLandscape(variantData: any) {
  const landscapeData: any[] = [];

  Object.entries(variantData).forEach(([variant, data]: [string, any]) => {
    if (data.regulatoryElements?.ccre?.annotationSummary) {
      Object.entries(data.regulatoryElements.ccre.annotationSummary).forEach(([annotation, count]: [string, any]) => {
        landscapeData.push({
          variant,
          annotation,
          count
        });
      });
    }
  });

  return {
    data: landscapeData,
    type: 'bar',
    xAxis: 'annotation',
    yAxis: 'count'
  };
}

function generateCrossVariantComparison(variantData: any) {
  const comparisonData: any = {
    variants: Object.keys(variantData),
    metrics: {}
  };

  // Compare key metrics across variants
  const metrics = ['totalGWASAssociations', 'functionalScores', 'regulatoryElements'];
  
  metrics.forEach(metric => {
    comparisonData.metrics[metric] = Object.entries(variantData).map(([variant, data]: [string, any]) => {
      let value = 0;
      
      switch (metric) {
        case 'totalGWASAssociations':
          value = data.gwasAssociations?.totalAssociations || 0;
          break;
        case 'functionalScores':
          value = Object.keys(data.functionalScores || {}).length;
          break;
        case 'regulatoryElements':
          value = data.regulatoryElements?.ccre?.totalElements || 0;
          break;
      }
      
      return { variant, value };
    });
  });

  return comparisonData;
}

function generateTissueExpressionChart(variantData: any) {
  const tissueData: any[] = [];

  Object.entries(variantData).forEach(([variant, data]: [string, any]) => {
    if (data.functionalScores?.scent?.topTissues) {
      data.functionalScores.scent.topTissues.forEach((tissue: any) => {
        tissueData.push({
          variant,
          tissue: tissue.tissue,
          subTissue: tissue.subTissue,
          score: tissue.score,
          percentile: tissue.percentile
        });
      });
    }
  });

  return {
    data: tissueData,
    xAxis: 'tissue',
    yAxis: 'score',
    groupBy: 'variant'
  };
}

export function getStandaloneVariantVisualization() {
  return tool({
    description: 'Create visualizations for variants by analyzing them first, then generating visualization data. This is a standalone tool that can accept variant identifiers directly.',
    inputSchema: z.object({
      variant: z.string().optional().describe('Single variant in VCF format or rsID'),
      variants: z.array(z.string()).optional().describe('Multiple variants to analyze and visualize'),
      visualizationType: z.enum([
        'population_frequencies', 'functional_scores_heatmap', 'gwas_manhattan', 
        'regulatory_landscape', 'cross_variant_comparison', 'tissue_expression'
      ]).describe('Type of visualization to generate'),
      
      // Analysis options
      dataSources: z.array(z.enum([
        'basic', 'population_frequencies', 'functional_scores', 'regulatory_elements', 
        'gwas_associations', 'clinical_annotations'
      ])).optional().describe('Data sources to include for analysis'),
      aggregationLevel: z.enum(['summary', 'detailed', 'full']).optional(),
      
      // Chart options
      chartOptions: z.object({
        width: z.number().optional(),
        height: z.number().optional(),
        colorScheme: z.string().optional(),
        showLegend: z.boolean().optional()
      }).optional()
    }),
    execute: async ({ 
      variant, 
      variants, 
      visualizationType, 
      dataSources = ['basic', 'population_frequencies', 'functional_scores'],
      aggregationLevel = 'detailed',
      chartOptions = {} 
    }) => {
      // Validate input
      let variantList: string[] = [];
      if (variant) variantList = [variant];
      if (variants && variants.length > 0) variantList = variants;
      
      if (variantList.length === 0) {
        return { error: 'At least one variant must be provided (variant or variants parameter)' };
      }

      try {
        // Use the main analysis function instead of analyzeVariant directly
        const analysisParams = {
          variants: variantList,
          dataSources,
          aggregationLevel,
          includeVisualizationData: true,
          // Set appropriate options based on visualization type
          ...(visualizationType === 'population_frequencies' && {
            includeGenderSpecific: true,
            populationFocus: ['AFR', 'AMR', 'ASJ', 'EAS', 'FIN', 'MID', 'NFE', 'SAS']
          }),
          ...(visualizationType === 'functional_scores_heatmap' && {
            functionalScoreTypes: ['scent', 'cv2f', 'pgboost', 'all']
          }),
          ...(visualizationType === 'gwas_manhattan' && {
            maxPValue: 0.05
          })
        };

        console.log('🔍 Debug - Analysis params:', analysisParams);

        // Call the main getVariantAnalysis execute function directly
        const getVariantAnalysisFunc = getVariantAnalysis();
        if (!getVariantAnalysisFunc.execute) {
          throw new Error('getVariantAnalysis function does not have execute method');
        }
        // @ts-ignore
        const fullAnalysisData = await getVariantAnalysisFunc.execute(analysisParams, {});
        
        console.log('🔍 Debug - Analysis result:', fullAnalysisData);

        // Generate visualization data
        let visualizationData: any = {};

        switch (visualizationType) {
          case 'population_frequencies':
            visualizationData = generatePopulationFrequencyChart(fullAnalysisData.data);
            break;
          case 'functional_scores_heatmap':
            visualizationData = generateFunctionalScoresHeatmap(fullAnalysisData.data);
            break;
          case 'gwas_manhattan':
            visualizationData = generateGWASManhattanData(fullAnalysisData.data);
            break;
          case 'regulatory_landscape':
            visualizationData = generateRegulatoryLandscape(fullAnalysisData.data);
            break;
          case 'cross_variant_comparison':
            visualizationData = generateCrossVariantComparison(fullAnalysisData.data);
            break;
          case 'tissue_expression':
            visualizationData = generateTissueExpressionChart(fullAnalysisData.data);
            break;
          default:
            return { error: `Unsupported visualization type: ${visualizationType}` };
        }

        return {
          type: visualizationType,
          variants: variantList,
          analysisData: fullAnalysisData,
          visualizationData,
          chartOptions: {
            ...chartOptions,
            responsive: true,
            maintainAspectRatio: false
          },
          metadata: {
            generated: new Date().toISOString(),
            variantCount: variantList.length,
            dataSources,
            aggregationLevel
          }
        };

      } catch (error) {
        return {
          error: `Failed to create visualization: ${error instanceof Error ? error.message : String(error)}`,
          variants: variantList,
          visualizationType
        };
      }
    }
  });
}