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
import { fetchABCPeaks, fetchABCScores } from '@/lib/variant/abc/api';


export function getVariantAnalysis() {
  return tool({
    description: 'Analyze specific known variants by VCF ID (e.g., "19-44908822-C-T") or rsID (e.g., "rs429358"). Gets detailed information about individual variants including population frequencies, functional scores, regulatory elements, and GWAS associations. Do NOT use this for listing variants within genes or regions - use geneAnalysis or regionAnalysis tools instead.',
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
      populationFocus: z.array(z.string()).nullable().optional().describe('Focus on specific populations (e.g., ["AFR", "EUR", "EAS"] for gnomAD ancestry groups)'),
      includeGenderSpecific: z.boolean().optional().describe('Include gender-specific frequency data'),
      
      // Functional analysis  
      functionalScoreTypes: z.array(z.enum(['scent', 'cv2f', 'pgboost', 'spliceai', 'all'])).nullable().optional().describe('Types of functional scores to include'),
      minFunctionalScore: z.number().nullable().optional().describe('Minimum threshold for functional prediction scores'),
      tissueFilter: z.array(z.string()).nullable().optional().describe('Filter SCENT and regulatory data by specific tissues'),
      
      // GWAS filtering
      maxPValue: z.number().nullable().optional().describe('Maximum p-value for GWAS associations (e.g., 5e-8)'),
      gwasTraits: z.array(z.string()).nullable().optional().describe('Filter GWAS data by specific traits or diseases'),
      minSampleSize: z.number().nullable().optional().describe('Minimum study sample size for GWAS associations'),
      
      // Regulatory analysis
      regulatoryDistance: z.number().nullable().optional().describe('Distance around variant to search for regulatory elements (default: 0)'),
      regulatoryTypes: z.array(z.string()).nullable().optional().describe('Filter regulatory elements by type (e.g., ["pELS", "dELS", "PLS"])'),
      
      // Output control
      maxResultsPerSource: z.number().nullable().optional().describe('Maximum results to return per data source (useful for large datasets)'),
      prioritizeByRelevance: z.boolean().optional().describe('Prioritize results by clinical/functional relevance'),
      includeVisualizationData: z.boolean().optional().describe('Include data formatted for visualization components'),
      
      // Cross-variant analysis (for multiple variants)
      performCrossAnalysis: z.boolean().optional().describe('When analyzing multiple variants, perform comparative analysis'),
      identifySharedFeatures: z.boolean().optional().describe('Identify shared regulatory elements, pathways, or traits across variants')
    }),
    execute: async ({ 
      variants, 
      variant,
      dataSources = ['basic'],
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
      // Normalize null values to undefined for arrays and numbers
      const normalizedOptions = {
        populationFocus: populationFocus || undefined,
        functionalScoreTypes: functionalScoreTypes || ['scent', 'cv2f', 'pgboost'],
        tissueFilter: tissueFilter || undefined,
        gwasTraits: gwasTraits || undefined,
        regulatoryTypes: regulatoryTypes || undefined,
        maxPValue: maxPValue || undefined,
        minFunctionalScore: minFunctionalScore || undefined,
        minSampleSize: minSampleSize || undefined,
        regulatoryDistance: regulatoryDistance ?? 0,
        maxResultsPerSource: maxResultsPerSource || undefined
      };
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
            populationFocus: normalizedOptions.populationFocus,
            includeGenderSpecific,
            functionalScoreTypes: normalizedOptions.functionalScoreTypes,
            minFunctionalScore: normalizedOptions.minFunctionalScore,
            tissueFilter: normalizedOptions.tissueFilter,
            maxPValue: normalizedOptions.maxPValue,
            gwasTraits: normalizedOptions.gwasTraits,
            minSampleSize: normalizedOptions.minSampleSize,
            regulatoryDistance: normalizedOptions.regulatoryDistance,
            regulatoryTypes: normalizedOptions.regulatoryTypes,
            maxResultsPerSource: normalizedOptions.maxResultsPerSource,
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

  // Parallel data fetching for all requested sources
  const dataFetches: Promise<any>[] = [];
  const fetchKeys: string[] = [];

  if (options.dataSources.includes('basic')) {
    dataFetches.push(fetchVariant(variantId));
    fetchKeys.push('basic');
  }

  if (options.dataSources.includes('population_frequencies')) {
    dataFetches.push(Promise.all([
      fetchGnomadExome(variantId),
      fetchGnomadGenome(variantId)
    ]));
    fetchKeys.push('population_frequencies');
  }

  if (options.dataSources.includes('functional_scores')) {
    dataFetches.push(aggregateFunctionalScores(variantId, rsid, options));
    fetchKeys.push('functional_scores');
  }

  if (options.dataSources.includes('regulatory_elements')) {
    dataFetches.push(aggregateRegulatoryData(variantId, options));
    fetchKeys.push('regulatory_elements');
  }

  if (options.dataSources.includes('gwas_associations')) {
    dataFetches.push(aggregateGWASData(variantId, options));
    fetchKeys.push('gwas_associations');
  }

  // Execute all fetches in parallel
  const results = await Promise.allSettled(dataFetches);
  
  // Process results
  results.forEach((result, index) => {
    const key = fetchKeys[index];
    if (result.status === 'fulfilled' && result.value) {
      if (key === 'basic') {
        variantData.basic = aggregateBasicInfo(result.value, options.aggregationLevel);
      } else if (key === 'population_frequencies') {
        const [gnomadExome, gnomadGenome] = result.value;
        variantData.populationFrequencies = aggregatePopulationData(
          { exome: gnomadExome, genome: gnomadGenome },
          options
        );
      } else {
        variantData[key] = result.value;
      }
    }
  });

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

  try {
    // ABC data (Activity-by-Contact model predictions)
    const [abcPeaks, abcScores] = await Promise.all([
      fetchABCPeaks(variantId),
      fetchABCScores(variantId)
    ]);
    
    if (abcPeaks || abcScores) {
      if (options.aggregationLevel === 'summary') {
        const peakTissues = abcPeaks?.reduce((acc: any, item: any) => {
          acc[item.tissue] = (acc[item.tissue] || 0) + 1;
          return acc;
        }, {}) || {};
        
        const scoreTissues = abcScores?.reduce((acc: any, item: any) => {
          acc[item.tissue] = (acc[item.tissue] || 0) + 1;
          return acc;
        }, {}) || {};

        regulatoryData.abc = {
          peaks: {
            total: abcPeaks?.length || 0,
            tissueDistribution: peakTissues,
            significantPeaks: abcPeaks?.filter((item: any) => item.q_value < 0.05).length || 0
          },
          scores: {
            total: abcScores?.length || 0,
            tissueDistribution: scoreTissues,
            highScores: abcScores?.filter((item: any) => item.abc_score > 0.1).length || 0,
            averageScore: abcScores?.length ? abcScores.reduce((sum: number, item: any) => sum + item.abc_score, 0) / abcScores.length : 0
          }
        };
      } else {
        regulatoryData.abc = {
          peaks: abcPeaks?.slice(0, options.maxResultsPerSource || 50) || [],
          scores: abcScores?.slice(0, options.maxResultsPerSource || 50) || []
        };
      }
    }
  } catch (error) {
    errors.push(`ABC: ${error instanceof Error ? error.message : String(error)}`);
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

// Variant visualization functionality moved to universal visualization tool
// This prevents tool rerender issues and consolidates visualization logic

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

