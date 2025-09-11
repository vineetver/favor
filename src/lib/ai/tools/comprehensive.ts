import { z } from 'zod';
import { tool } from 'ai';

// Gene API Tools
import { fetchGeneSummary } from '@/lib/gene/summary/api';
import { fetchGeneAnnotation } from '@/lib/gene/annotation/api';
import { fetchGeneTableData } from '@/lib/gene/table/api';
import { getPathwayPairs, getPathwayGenes } from '@/lib/gene/pathways/api';
import { fetchCosmicByGene } from '@/lib/gene/cosmic/api';
import { getBiogridInteractions, getIntactInteractions, getHuriInteractions } from '@/lib/gene/ppi/api';

// Variant API Tools
import { fetchVariant } from '@/lib/variant/api';
// Region API Tools
import { fetchRegionSummary } from '@/lib/region/summary/api';
import { fetchRegionTableData } from '@/lib/region/table/api';
import { fetchABCPeaksByRegion, fetchABCScoresByRegion } from '@/lib/region/abc/api';
import { fetchCosmicByRegion } from '@/lib/region/cosmic/api';
import { fetchRegionAnnotation } from '@/lib/region/annotation/api';
import { fetchPGBoostByRegion } from '@/lib/region/pgboost/api';
import { fetchVistaEnhancerByRegion } from '@/lib/region/vista-enhancers/api';
import { fetchEpimapByRegion } from '@/lib/region/epimap/api';

// ==== GENE ANALYSIS TOOLS ====

export function getComprehensiveGeneSummary() {
  return tool({
    description: 'Comprehensive gene analysis tool that handles: 1) Gene summary statistics (counts/totals), 2) List of variants within a gene with filtering, 3) Gene annotations, 4) Pathways, 5) Protein interactions. Use this for ALL gene-related queries including "variants in BRCA1", "how many variants in BRCA1 with CADD > 20", gene summaries, etc.',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name (e.g., BRCA1, TP53)'),
      
      // Gene summary options
      category: z.enum(['SNV-summary', 'InDel-summary', 'total-summary']).optional().describe('Type of summary to retrieve for gene statistics'),
      
      // Variant listing options (when user wants list of variants in gene)
      getVariants: z.boolean().optional().describe('Set to true when user asks for variants IN the gene or variant counts with filters'),
      subcategory: z.enum(['SNV-table', 'InDel-table', 'Total-table']).optional().describe('Type of variants to retrieve when listing variants'),
      cursor: z.string().optional().describe('Cursor for pagination when listing variants'),
      filtersQuery: z.string().optional().describe('Categorical filters for variants: genecode_comprehensive_category (exonic, ncrna, intronic, downstream, intergenic, upstream, splicing, utr), clnsig (drugresponse, pathogenic, likelypathogenic, benign, likelybenign, conflicting, unknown)'),
      numericFilters: z.array(z.object({
        field: z.string().describe('Numeric field: position, bravo_an, bravo_ac, bravo_af, cadd_phred, linsight, fathmm_xf, apc_conservation_v2, etc.'),
        operator: z.enum(['gt', 'lt', 'eq']).describe('Comparison operator'),
        value: z.string().describe('Numeric value for comparison')
      })).optional().describe('Numeric filters for variants (e.g., cadd_phred > 20)'),
      sortBy: z.string().optional().describe('Field to sort variants by'),
      pageSize: z.number().optional().describe('Number of variants per page (default: 20)')
    }),
    execute: async ({ geneName, category = 'total-summary', getVariants = false, subcategory = 'Total-table', cursor, filtersQuery, numericFilters, sortBy, pageSize = 20 }) => {
      if (getVariants) {
        // User wants list of variants in the gene
        const apiSubcategory = subcategory === 'Total-table' ? 'SNV-table' : subcategory;
        
        const result = await fetchGeneTableData(geneName, {
          subcategory: apiSubcategory,
          filtersQuery,
          sortingQuery: sortBy,
          numericFilters,
          pageSize,
          cursor
        });
        
        if (!result) return { error: `No variant data found for gene ${geneName}` };
        
        const urlMap = {
          'SNV-table': 'SNV-table',
          'InDel-table': 'InDel-table', 
          'Total-table': 'SNV-table'
        };
        
        return {
          gene: geneName,
          variants: result.data,
          hasNextPage: result.hasNextPage,
          nextCursor: result.nextCursor,
          totalVariants: result.data.length,
          url: `https://favor.genohub.org/hg38/gene/${geneName}/full-tables/${urlMap[subcategory]}`,
          metadata: {
            dataType: 'gene_variants',
            source: 'genohub',
            subcategory,
            pageSize,
            filtersApplied: !!filtersQuery || !!numericFilters?.length,
            sortApplied: !!sortBy
          }
        };
      } else {
        // User wants gene summary statistics
        const result = await fetchGeneSummary(geneName);
        if (!result) return { error: `No data found for gene ${geneName}` };
        
        return {
          gene: geneName,
          summary: category === 'SNV-summary' ? result.snv_summary : 
                  category === 'InDel-summary' ? result.indel_summary : 
                  result.total_summary,
          metadata: {
            dataType: 'gene_summary',
            category,
            source: 'genohub'
          }
        };
      }
    }
  });
}

export function getGeneAnnotationData() {
  return tool({
    description: 'Get detailed gene-level annotations including functional information, expression, phenotype, and external database IDs. Uses AI-powered search to answer specific questions about genes.',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name to get annotations for (e.g., BRCA1, TP53, MYC)'),
      question: z.string().optional().describe('Specific question about the gene (e.g., "What is the function of BRCA1?", "What diseases is TP53 associated with?")')
    }),
    execute: async ({ geneName, question }) => {
      // Use AI-powered gene annotation if question is provided
      if (question) {
        try {
          const response = await fetch('/api/gene-info', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              gene: geneName,
              question: question
            })
          });
          
          if (response.ok) {
            const aiResult = await response.json();
            return {
              gene: geneName,
              annotation: aiResult.annotation,
              question,
              url: `https://favor.genohub.org/hg38/gene/${geneName}/gene-level-annotation/info-and-ids`,
              metadata: {
                dataType: 'gene_annotation_ai',
                source: 'weaviate_ai',
                queryType: 'semantic_search'
              }
            };
          }
        } catch (error) {
          console.error('Error with AI gene annotation:', error);
          // Fall back to standard annotation
        }
      }
      
      // Standard gene annotation fallback
      const result = await fetchGeneAnnotation(geneName);
      if (!result) {
        return { 
          error: `Gene annotation for ${geneName} could not be found.${question ? ' AI search also returned no results.' : ''}` 
        };
      }
      
      return {
        gene: geneName,
        annotation: result,
        question,
        url: `https://favor.genohub.org/hg38/gene/${geneName}/gene-level-annotation/info-and-ids`,
        metadata: {
          dataType: 'gene_annotation',
          source: 'genohub',
          queryType: question ? 'fallback_after_ai' : 'standard'
        }
      };
    }
  });
}

export function getGeneVariantData() {
  return tool({
    description: 'Get a list of individual variants within a specific gene with filtering, sorting, and pagination. Use this when the user asks for variants IN a gene, variant counts with filters, or wants to list/search variants within a gene (e.g., "variants in BRCA1", "how many variants in BRCA1 with CADD > 20").',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name to get variants for (e.g., APOE, BRCA1, MYC, PTPRD, BRCA2, TP53)'),
      subcategory: z.enum(['SNV-table', 'InDel-table', 'Total-table']).optional().describe('Type of variants to retrieve (default: Total-table)'),
      cursor: z.string().optional().describe('Cursor for pagination. Omit to fetch the first page'),
      filtersQuery: z.string().optional().describe('Filter query string for categorical filters. Available filters: genecode_comprehensive_category (exonic, ncrna, intronic, downstream, intergenic, upstream, splicing, utr), clnsig (drugresponse, pathogenic, likelypathogenic, benign, likelybenign, conflicting, unknown). Format: "genecode_comprehensive_category=exonic,utr&clnsig=pathogenic"'),
      numericFilters: z.array(z.object({
        field: z.string().describe('Numeric field to filter. Valid fields: position, bravo_an, bravo_ac, bravo_af, cadd_phred, linsight, fathmm_xf, apc_conservation_v2, apc_epigenetics_active, apc_epigenetics_repressed, apc_epigenetics_transcription, apc_local_nucleotide_diversity_v3, apc_mappability, apc_mutation_density, apc_protein_function_v3, apc_transcription_factor, af_total, tg_all, af_eas, af_sas, af_afr, af_amr, af_eur'),
        operator: z.enum(['gt', 'lt', 'eq']).describe('Comparison operator: gt (greater than), lt (less than), eq (equal to)'),
        value: z.string().describe('Numeric value for comparison')
      })).optional().describe('Array of numeric filters'),
      sortBy: z.string().optional().describe('Field to sort by. Prefix with "-" for descending order (e.g., "position", "-position")'),
      pageSize: z.number().optional().describe('Number of variants per page (default: 20)')
    }),
    execute: async ({ geneName, subcategory = 'Total-table', cursor, filtersQuery, numericFilters, sortBy, pageSize = 20 }) => {
      // Map Total-table to SNV-table for API compatibility
      const apiSubcategory = subcategory === 'Total-table' ? 'SNV-table' : subcategory;
      
      const result = await fetchGeneTableData(geneName, {
        subcategory: apiSubcategory,
        filtersQuery,
        sortingQuery: sortBy,
        numericFilters,
        pageSize,
        cursor
      });
      
      if (!result) return { error: `No variant data found for gene ${geneName}` };
      
      const urlMap = {
        'SNV-table': 'SNV-table',
        'InDel-table': 'InDel-table', 
        'Total-table': 'SNV-table'
      };
      
      return {
        gene: geneName,
        variants: result.data,
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor,
        url: `https://favor.genohub.org/hg38/gene/${geneName}/full-tables/${urlMap[subcategory]}`,
        metadata: {
          dataType: 'gene_variants',
          source: 'genohub',
          subcategory,
          pageSize,
          totalResults: result.data.length,
          filtersApplied: !!filtersQuery || !!numericFilters?.length,
          sortApplied: !!sortBy
        }
      };
    }
  });
}

export function getGenePathwayInteractions() {
  return tool({
    description: 'Get pathway interaction pairs for a gene',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name to get pathway interactions for'),
      limit: z.number().optional().describe('Maximum number of interactions to return'),
      source: z.string().optional().describe('Specific pathway source to filter by')
    }),
    execute: async ({ geneName, limit, source }) => {
      const result = await getPathwayPairs(geneName, limit, source);
      if (!result) return { error: `No pathway interactions found for gene ${geneName}` };
      
      return {
        gene: geneName,
        pathwayPairs: result,
        metadata: {
          dataType: 'pathway_interactions',
          source: source || 'all',
          limit
        }
      };
    }
  });
}

export function getGenePathwayGenes() {
  return tool({
    description: 'Get genes in the same pathways as the query gene',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name to find pathway genes for'),
      source: z.string().optional().describe('Specific pathway source to filter by')
    }),
    execute: async ({ geneName, source }) => {
      const result = await getPathwayGenes(geneName, source);
      if (!result) return { error: `No pathway genes found for gene ${geneName}` };
      
      return {
        gene: geneName,
        pathwayGenes: result,
        metadata: {
          dataType: 'pathway_genes',
          source: source || 'all'
        }
      };
    }
  });
}

export function getGeneCosmicData() {
  return tool({
    description: 'Get COSMIC cancer gene census data',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name to get COSMIC data for')
    }),
    execute: async ({ geneName }) => {
      const result = await fetchCosmicByGene(geneName);
      if (!result) return { error: `No COSMIC data found for gene ${geneName}` };
      
      return {
        gene: geneName,
        cosmic: result,
        metadata: {
          dataType: 'cosmic_gene',
          source: 'cosmic'
        }
      };
    }
  });
}

export function getGeneProteinInteractions() {
  return tool({
    description: 'Get protein-protein interactions from multiple databases (BioGRID, IntAct, HuRI) with cross-database filtering, deduplication, and pagination',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name to get protein interactions for'),
      databases: z.array(z.enum(['biogrid', 'intact', 'huri'])).optional().describe('Specific PPI databases to query (default: all)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      interactorGenes: z.array(z.string()).optional().describe('Filter by specific interacting genes'),
      minConfidenceScore: z.number().optional().describe('Minimum confidence score for interactions'),
      experimentalMethods: z.array(z.string()).optional().describe('Filter by experimental methods'),
      crossDbValidation: z.boolean().optional().describe('Only show interactions found in multiple databases'),
      deduplicateInteractors: z.boolean().optional().describe('Remove duplicate interactors across databases (default: true)'),
      sortBy: z.string().optional().describe('Field to sort by (interactor, score, database)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order (default: desc)')
    }),
    execute: async ({ 
      geneName, 
      databases = ['biogrid', 'intact', 'huri'], 
      pageSize = 20, 
      cursor,
      interactorGenes,
      minConfidenceScore,
      experimentalMethods,
      crossDbValidation = false,
      deduplicateInteractors = true,
      sortBy, 
      sortOrder = 'desc' 
    }) => {
      const { applyClientSideFilters, createSortFunction } = await import('@/lib/utils/filtering');
      const { processPaginatedResults } = await import('@/lib/utils/pagination');
      const { mergeMultiSourceResults } = await import('@/lib/utils/data-merging');
      
      const results: any = {};
      let allInteractions: any[] = [];
      
      // Fetch from specified databases
      if (databases.includes('biogrid')) {
        const biogridData = await getBiogridInteractions(geneName);
        if (biogridData) {
          results.biogrid = biogridData;
          allInteractions = allInteractions.concat(
            biogridData.map((item: any) => ({ ...item, _source: 'biogrid' }))
          );
        }
      }
      
      if (databases.includes('intact')) {
        const intactData = await getIntactInteractions(geneName);
        if (intactData) {
          results.intact = intactData;
          allInteractions = allInteractions.concat(
            intactData.map((item: any) => ({ ...item, _source: 'intact' }))
          );
        }
      }
      
      if (databases.includes('huri')) {
        const huriData = await getHuriInteractions(geneName);
        if (huriData) {
          results.huri = huriData;
          allInteractions = allInteractions.concat(
            huriData.map((item: any) => ({ ...item, _source: 'huri' }))
          );
        }
      }

      // Apply filtering
      let filteredInteractions = allInteractions;
      
      // Filter by specific interactor genes
      if (interactorGenes?.length) {
        filteredInteractions = filteredInteractions.filter((item: any) =>
          interactorGenes.some(gene => 
            item.interactor_a?.toLowerCase().includes(gene.toLowerCase()) ||
            item.interactor_b?.toLowerCase().includes(gene.toLowerCase()) ||
            item.gene_b?.toLowerCase().includes(gene.toLowerCase()) ||
            item.symbol_b?.toLowerCase().includes(gene.toLowerCase())
          )
        );
      }
      
      // Filter by confidence score
      if (minConfidenceScore !== undefined) {
        filteredInteractions = filteredInteractions.filter((item: any) =>
          (item.confidence_score && item.confidence_score >= minConfidenceScore) ||
          (item.score && item.score >= minConfidenceScore)
        );
      }
      
      // Filter by experimental methods
      if (experimentalMethods?.length) {
        filteredInteractions = filteredInteractions.filter((item: any) =>
          experimentalMethods.some(method => 
            item.experimental_system?.toLowerCase().includes(method.toLowerCase()) ||
            item.detection_method?.toLowerCase().includes(method.toLowerCase())
          )
        );
      }
      
      // Cross-database validation: only interactions found in multiple databases
      if (crossDbValidation && databases.length > 1) {
        const interactorMap = new Map();
        
        filteredInteractions.forEach((item: any) => {
          const interactor = item.interactor_b || item.gene_b || item.symbol_b;
          if (interactor) {
            if (!interactorMap.has(interactor)) {
              interactorMap.set(interactor, { sources: new Set(), items: [] });
            }
            interactorMap.get(interactor).sources.add(item._source);
            interactorMap.get(interactor).items.push(item);
          }
        });
        
        filteredInteractions = [];
        interactorMap.forEach((data, interactor) => {
          if (data.sources.size > 1) {
            filteredInteractions = filteredInteractions.concat(data.items);
          }
        });
      }
      
      // Deduplicate interactors if requested
      if (deduplicateInteractors) {
        const uniqueInteractors = new Map();
        
        filteredInteractions.forEach((item: any) => {
          const interactor = item.interactor_b || item.gene_b || item.symbol_b;
          if (interactor) {
            if (!uniqueInteractors.has(interactor)) {
              uniqueInteractors.set(interactor, item);
            } else {
              // Keep the one with higher confidence score
              const existing = uniqueInteractors.get(interactor);
              const existingScore = existing.confidence_score || existing.score || 0;
              const currentScore = item.confidence_score || item.score || 0;
              if (currentScore > existingScore) {
                uniqueInteractors.set(interactor, item);
              }
            }
          }
        });
        
        filteredInteractions = Array.from(uniqueInteractors.values());
      }
      
      // Apply sorting and pagination
      if (sortBy && filteredInteractions.length > 0) {
        const sortFn = createSortFunction(sortBy, sortOrder);
        filteredInteractions = filteredInteractions.sort(sortFn);
      }
      
      const result = processPaginatedResults(
        filteredInteractions,
        pageSize
      );
      
      const uniqueDatabases = Array.from(new Set(filteredInteractions.map(item => item._source)));
      const validatedCount = crossDbValidation ? 
        new Set(filteredInteractions.map(item => item.interactor_b || item.gene_b || item.symbol_b)).size : 0;
      
      return {
        ...result,
        gene: geneName,
        interactions: results,
        summary: `Found ${result.pagination.totalCount || 0} protein interactions for ${geneName}` +
          (interactorGenes?.length ? ` with interactors: ${interactorGenes.join(', ')}` : '') +
          (crossDbValidation ? ` (${validatedCount} cross-database validated)` : '') +
          ` across databases: ${uniqueDatabases.join(', ')}`,
        metadata: {
          dataType: 'protein_interactions',
          databases: uniqueDatabases,
          crossDbValidated: crossDbValidation,
          deduplicatedInteractors: deduplicateInteractors,
          totalUniqueInteractors: deduplicateInteractors ? 
            new Set(filteredInteractions.map(item => item.interactor_b || item.gene_b || item.symbol_b)).size : 
            result.pagination.totalCount || 0
        }
      };
    }
  });
}

// ==== REGION ANALYSIS TOOLS ====

export function getRegionSummaryData() {
  return tool({
    description: 'Get region summary statistics for SNVs and InDels',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., chr1:1000000-2000000)'),
      category: z.enum(['SNV-summary', 'InDel-summary']).optional().describe('Type of summary to retrieve')
    }),
    execute: async ({ region, category = 'SNV-summary' }) => {
      const result = await fetchRegionSummary(region, category);
      if (!result) return { error: `No summary data found for region ${region}` };
      
      return {
        region,
        summary: result,
        metadata: {
          dataType: 'region_summary',
          category,
          source: 'genohub'
        }
      };
    }
  });
}

export function getRegionVariantData() {
  return tool({
    description: 'Get a list of individual variants within a genomic region with filtering, sorting, and pagination. Use this when the user asks for variants IN a region, variant counts with filters, or wants to list/search variants within a genomic region (e.g., "variants in chr1:1000000-2000000", "how many variants in region with CADD > 20").',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., 19-44908822-44909305 or chr1:1000000-2000000)'),
      subcategory: z.enum(['SNV-table', 'InDel-table', 'Total-table']).optional().describe('Type of variants to retrieve (default: Total-table)'),
      cursor: z.string().optional().describe('Cursor for pagination. Omit to fetch the first page'),
      filtersQuery: z.string().optional().describe('Filter query string for categorical filters. Available filters: genecode_comprehensive_category (exonic, ncrna, intronic, downstream, intergenic, upstream, splicing, utr), clnsig (drugresponse, pathogenic, likelypathogenic, benign, likelybenign, conflicting, unknown). Format: "genecode_comprehensive_category=exonic,utr&clnsig=pathogenic"'),
      numericFilters: z.array(z.object({
        field: z.string().describe('Numeric field to filter. Valid fields: position, bravo_an, bravo_ac, bravo_af, cadd_phred, linsight, fathmm_xf, apc_conservation_v2, apc_epigenetics_active, apc_epigenetics_repressed, apc_epigenetics_transcription, apc_local_nucleotide_diversity_v3, apc_mappability, apc_mutation_density, apc_protein_function_v3, apc_transcription_factor, af_total, tg_all, af_eas, af_sas, af_afr, af_amr, af_eur'),
        operator: z.enum(['gt', 'lt', 'eq']).describe('Comparison operator: gt (greater than), lt (less than), eq (equal to)'),
        value: z.string().describe('Numeric value for comparison')
      })).optional().describe('Array of numeric filters'),
      sortBy: z.string().optional().describe('Field to sort by. Prefix with "-" for descending order (e.g., "position", "-position")'),
      pageSize: z.number().optional().describe('Number of variants per page (default: 20)')
    }),
    execute: async ({ region, subcategory = 'Total-table', cursor, filtersQuery, numericFilters, sortBy, pageSize = 20 }) => {
      // Map Total-table to SNV-table for API compatibility
      const apiSubcategory = subcategory === 'Total-table' ? 'SNV-table' : subcategory;
      
      const result = await fetchRegionTableData(region, {
        subcategory: apiSubcategory,
        filtersQuery,
        sortingQuery: sortBy,
        numericFilters,
        pageSize,
        cursor
      });
      
      if (!result) return { error: `No variant data found for region ${region}` };
      
      const urlMap = {
        'SNV-table': 'SNV-table',
        'InDel-table': 'InDel-table',
        'Total-table': 'SNV-table'
      };
      
      return {
        region,
        variants: result.data,
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor,
        url: `https://favor.genohub.org/hg38/region/${region}/full-tables/${urlMap[subcategory]}`,
        metadata: {
          dataType: 'region_variants',
          source: 'genohub',
          subcategory,
          pageSize,
          totalResults: result.data.length,
          filtersApplied: !!filtersQuery || !!numericFilters?.length,
          sortApplied: !!sortBy
        }
      };
    }
  });
}

export function getRegionABCData() {
  return tool({
    description: 'Get ABC enhancer-gene predictions for a genomic region',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., chr1:1000000-2000000)'),
      dataType: z.enum(['peaks', 'scores', 'both']).optional().describe('Type of ABC data to retrieve')
    }),
    execute: async ({ region, dataType = 'both' }) => {
      const results: any = {};
      
      if (dataType === 'both' || dataType === 'peaks') {
        results.peaks = await fetchABCPeaksByRegion(region);
      }
      if (dataType === 'both' || dataType === 'scores') {
        results.scores = await fetchABCScoresByRegion(region);
      }
      
      return {
        region,
        abc: results,
        metadata: {
          dataType: 'region_abc',
          source: 'abc'
        }
      };
    }
  });
}

export function getRegionAnnotationData() {
  return tool({
    description: 'Get annotation data for a genomic region',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., chr1:1000000-2000000)')
    }),
    execute: async ({ region }) => {
      const result = await fetchRegionAnnotation(region);
      if (!result) return { error: `No annotation data found for region ${region}` };
      
      return {
        region,
        annotation: result,
        metadata: {
          dataType: 'region_annotation',
          source: 'genohub'
        }
      };
    }
  });
}

export function getRegionRegulatoryData() {
  return tool({
    description: 'Get regulatory data for a genomic region (VISTA enhancers, EpiMap, PGBoost) with client-side pagination, tissue filtering, and chromatin state filtering',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., chr1:1000000-2000000)'),
      dataType: z.enum(['vista', 'epimap', 'pgboost', 'all']).optional().describe('Type of regulatory data to retrieve'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      tissues: z.array(z.string()).optional().describe('Filter EpiMap data by tissue/cell types'),
      chromatinStates: z.array(z.string()).optional().describe('Filter EpiMap data by chromatin states'),
      lifeStages: z.array(z.string()).optional().describe('Filter EpiMap data by life stages'),
      categories: z.array(z.string()).optional().describe('Filter EpiMap data by categories'),
      activityPatterns: z.array(z.string()).optional().describe('Filter VISTA data by activity patterns'),
      minScore: z.number().optional().describe('Minimum score threshold for PGBoost data'),
      sortBy: z.string().optional().describe('Sort by field (category, state_full_name, etc.)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order (default: asc)')
    }),
    execute: async ({ region, dataType = 'all', pageSize = 20, cursor, tissues, chromatinStates, lifeStages, categories, activityPatterns, minScore, sortBy, sortOrder = 'asc' }) => {
      const { applyClientSideFilters, createSortFunction } = await import('@/lib/utils/filtering');
      const { processPaginatedResults } = await import('@/lib/utils/pagination');
      
      const results: any = {};
      let allData: any[] = [];
      
      // Fetch VISTA enhancer data
      if (dataType === 'all' || dataType === 'vista') {
        const vistaData = await fetchVistaEnhancerByRegion(region);
        if (vistaData) {
          results.vista = vistaData;
          allData = allData.concat(vistaData.map((item: any) => ({ ...item, _source: 'vista' })));
        }
      }
      
      // Fetch EpiMap data
      if (dataType === 'all' || dataType === 'epimap') {
        const epimapData = await fetchEpimapByRegion(region);
        if (epimapData) {
          results.epimap = epimapData;
          allData = allData.concat(epimapData.map((item: any) => ({ ...item, _source: 'epimap' })));
        }
      }
      
      // Fetch PGBoost data  
      if (dataType === 'all' || dataType === 'pgboost') {
        const pgboostData = await fetchPGBoostByRegion(region);
        if (pgboostData) {
          results.pgboost = pgboostData;
          allData = allData.concat(Array.isArray(pgboostData) ? 
            pgboostData.map((item: any) => ({ ...item, _source: 'pgboost' })) : 
            [{ data: pgboostData, _source: 'pgboost' }]
          );
        }
      }
      
      // Apply client-side filtering to combined data
      if (allData.length > 0) {
        // EpiMap-specific filtering
        if (tissues?.length) {
          allData = allData.filter(item => 
            !item.sample_name || tissues.some(tissue => 
              item.sample_name?.toLowerCase().includes(tissue.toLowerCase()) ||
              item.type?.toLowerCase().includes(tissue.toLowerCase()) ||
              item.newgroup?.toLowerCase().includes(tissue.toLowerCase())
            )
          );
        }
        
        if (chromatinStates?.length) {
          allData = allData.filter(item => 
            !item.state_full_name || chromatinStates.some(state => 
              item.state_full_name?.toLowerCase().includes(state.toLowerCase())
            )
          );
        }
        
        if (lifeStages?.length) {
          allData = allData.filter(item => 
            !item.lifestage || lifeStages.includes(item.lifestage)
          );
        }
        
        if (categories?.length) {
          allData = allData.filter(item => 
            !item.category || categories.some(cat => 
              item.category?.toLowerCase().includes(cat.toLowerCase())
            )
          );
        }
        
        // VISTA-specific filtering
        if (activityPatterns?.length) {
          allData = allData.filter(item => 
            item._source !== 'vista' || activityPatterns.some(pattern => 
              item.activity_pattern?.toLowerCase().includes(pattern.toLowerCase())
            )
          );
        }
        
        // PGBoost-specific filtering
        if (minScore !== undefined) {
          allData = allData.filter(item => 
            item._source !== 'pgboost' || !item.score || 
            (typeof item.score === 'number' && item.score >= minScore)
          );
        }
        
        // Apply sorting
        if (sortBy) {
          const sortFn = createSortFunction(sortBy, sortOrder);
          allData = allData.sort(sortFn);
        }
        
        // Apply pagination
        const { paginatedData, pagination } = processPaginatedResults(
          allData,
          pageSize,
          (item) => item.bssid || item.enhancer_id || item.id || JSON.stringify(item).substring(0, 50)
        );
        
        return {
          region,
          regulatory: results,
          combinedData: paginatedData,
          hasNextPage: pagination.hasNextPage,
          nextCursor: pagination.nextCursor,
          totalCount: allData.length,
          metadata: {
            dataType: 'region_regulatory',
            source: dataType,
            filtersApplied: {
              tissues,
              chromatinStates,
              lifeStages,
              categories,
              activityPatterns,
              minScore,
              sortBy,
              sortOrder
            },
            totalFiltered: paginatedData.length
          }
        };
      }
      
      return {
        region,
        regulatory: results,
        metadata: {
          dataType: 'region_regulatory',
          source: dataType
        }
      };
    }
  });
}

export function getRegionCosmicData() {
  return tool({
    description: 'Get COSMIC cancer data for a genomic region with client-side pagination and filtering',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., chr1:1000000-2000000)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      minScore: z.number().optional().describe('Minimum pathogenicity score filter'),
      cancerTypes: z.array(z.string()).optional().describe('Filter by cancer types'),
      mutationTypes: z.array(z.string()).optional().describe('Filter by mutation types (substitution, insertion, deletion, etc.)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    }),
    execute: async ({ 
      region, 
      pageSize = 20, 
      cursor, 
      minScore,
      cancerTypes,
      mutationTypes,
      sortBy, 
      sortOrder = 'desc' 
    }) => {
      const data = await fetchCosmicByRegion(region);
      
      if (!data) {
        return {
          data: [],
          total: 0,
          hasNext: false,
          nextCursor: null,
          summary: 'No COSMIC data found for this region'
        };
      }

      let filteredData = data;
      
      if (minScore !== undefined) {
        filteredData = filteredData.filter((item: any) => 
          item.pathogenicity_score >= minScore
        );
      }
      
      if (cancerTypes?.length) {
        filteredData = filteredData.filter((item: any) =>
          cancerTypes.some(type => 
            item.primary_site?.toLowerCase().includes(type.toLowerCase()) ||
            item.site_subtype?.toLowerCase().includes(type.toLowerCase())
          )
        );
      }
      
      if (mutationTypes?.length) {
        filteredData = filteredData.filter((item: any) =>
          mutationTypes.some(type => 
            item.mutation_type?.toLowerCase().includes(type.toLowerCase())
          )
        );
      }

      const { processPaginatedResults } = await import('@/lib/utils/pagination');
      const result = processPaginatedResults(
        filteredData,
        pageSize
      );

      return {
        ...result,
        summary: `Found ${result.pagination.totalCount || 0} COSMIC variants in region ${region}` + 
          (minScore ? ` with score ≥ ${minScore}` : '') +
          (cancerTypes?.length ? ` in cancer types: ${cancerTypes.join(', ')}` : '') +
          (mutationTypes?.length ? ` with mutation types: ${mutationTypes.join(', ')}` : '')
      };
    }
  });
}

export function getRegionVistaEnhancers() {
  return tool({
    description: 'Get VISTA enhancer data for a genomic region with client-side pagination and activity filtering',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., chr1:1000000-2000000)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      activityPatterns: z.array(z.string()).optional().describe('Filter by activity patterns (e.g., brain, heart, limb)'),
      stages: z.array(z.string()).optional().describe('Filter by developmental stages'),
      tissues: z.array(z.string()).optional().describe('Filter by tissue expression patterns'),
      hasTransgenesis: z.boolean().optional().describe('Filter for enhancers with positive transgenesis results'),
      sortBy: z.string().optional().describe('Field to sort by (element_id, stage, expression)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    }),
    execute: async ({ 
      region, 
      pageSize = 20, 
      cursor, 
      activityPatterns,
      stages,
      tissues,
      hasTransgenesis,
      sortBy, 
      sortOrder = 'asc' 
    }) => {
      const data = await fetchVistaEnhancerByRegion(region);
      
      if (!data) {
        return {
          data: [],
          total: 0,
          hasNext: false,
          nextCursor: null,
          summary: 'No VISTA enhancer data found for this region'
        };
      }

      let filteredData = data;
      
      if (activityPatterns?.length) {
        filteredData = filteredData.filter((item: any) =>
          activityPatterns.some(pattern => 
            item.expression?.toLowerCase().includes(pattern.toLowerCase()) ||
            item.tissues?.toLowerCase().includes(pattern.toLowerCase())
          )
        );
      }
      
      if (stages?.length) {
        filteredData = filteredData.filter((item: any) =>
          stages.some(stage => 
            item.stage?.toLowerCase().includes(stage.toLowerCase())
          )
        );
      }
      
      if (tissues?.length) {
        filteredData = filteredData.filter((item: any) =>
          tissues.some(tissue => 
            item.tissues?.toLowerCase().includes(tissue.toLowerCase())
          )
        );
      }
      
      if (hasTransgenesis !== undefined) {
        filteredData = filteredData.filter((item: any) => {
          const hasPositive = item.transgenesis?.toLowerCase().includes('positive') || 
                             item.transgenesis?.toLowerCase().includes('yes');
          return hasTransgenesis ? hasPositive : !hasPositive;
        });
      }

      const { processPaginatedResults } = await import('@/lib/utils/pagination');
      const result = processPaginatedResults(
        filteredData,
        pageSize
      );

      return {
        ...result,
        summary: `Found ${result.pagination.totalCount || 0} VISTA enhancers in region ${region}` + 
          (activityPatterns?.length ? ` with activity patterns: ${activityPatterns.join(', ')}` : '') +
          (stages?.length ? ` in stages: ${stages.join(', ')}` : '') +
          (tissues?.length ? ` in tissues: ${tissues.join(', ')}` : '') +
          (hasTransgenesis !== undefined ? ` with ${hasTransgenesis ? 'positive' : 'negative'} transgenesis` : '')
      };
    }
  });
}