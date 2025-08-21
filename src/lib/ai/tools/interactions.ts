import { tool } from "ai";
import { z } from "zod";
import { 
  getBiogridInteractions as fetchBiogridInteractions, 
  getIntactInteractions as fetchIntactInteractions, 
  getHuriInteractions as fetchHuriInteractions 
} from "@/lib/gene/ppi/api";
import { 
  getPathwayPairs as fetchPathwayPairs, 
  getPathwayGenes as fetchPathwayGenes 
} from "@/lib/gene/pathways/api";

export const getBiogridInteractions = () =>
  tool({
    description: "Fetches BioGRID protein–protein interactions for a given gene with pagination and filtering.",
    inputSchema: z.object({
      geneName: z.string().describe("The gene symbol to look up (e.g. TP53)"),
      pageSize: z.number().optional().describe("Number of interactions per page (default: 20)"),
      cursor: z.string().optional().describe("Pagination cursor"),
      interactorGenes: z.array(z.string()).optional().describe("Filter by specific interacting genes"),
      experimentalMethods: z.array(z.string()).optional().describe("Filter by experimental methods"),
      minScore: z.number().optional().describe("Minimum confidence score"),
      sortBy: z.string().optional().describe("Field to sort by"),
      sortOrder: z.enum(['asc', 'desc']).optional().describe("Sort order (default: desc)")
    }),
    execute: async ({ geneName, pageSize = 20, cursor, interactorGenes, experimentalMethods, minScore, sortBy, sortOrder = 'desc' }) => {
      const { applyClientSideFilters, createSortFunction } = await import('@/lib/utils/filtering');
      const { processPaginatedResults } = await import('@/lib/utils/pagination');
      
      const biogridData = await fetchBiogridInteractions(geneName);
      
      if (!biogridData) {
        return { 
          data: [],
          total: 0,
          hasNext: false,
          nextCursor: null,
          summary: `No BioGRID interactions found for ${geneName}`
        };
      }

      let filteredData = biogridData;
      
      // Filter by specific interactor genes
      if (interactorGenes?.length) {
        filteredData = filteredData.filter((item: any) =>
          interactorGenes.some(gene => 
            item.interactor_a?.toLowerCase().includes(gene.toLowerCase()) ||
            item.interactor_b?.toLowerCase().includes(gene.toLowerCase())
          )
        );
      }
      
      // Filter by experimental methods
      if (experimentalMethods?.length) {
        filteredData = filteredData.filter((item: any) =>
          experimentalMethods.some(method => 
            item.experimental_system?.toLowerCase().includes(method.toLowerCase())
          )
        );
      }
      
      // Filter by minimum score
      if (minScore !== undefined) {
        filteredData = filteredData.filter((item: any) =>
          item.confidence_score && item.confidence_score >= minScore
        );
      }
      
      // Apply sorting and pagination
      if (sortBy && filteredData.length > 0) {
        const sortFn = createSortFunction(sortBy, sortOrder);
        filteredData = filteredData.sort(sortFn);
      }
      
      const result = processPaginatedResults(
        filteredData,
        pageSize
      );

      return {
        ...result,
        summary: `Found ${result.pagination.totalCount || 0} BioGRID interactions for ${geneName}` +
          (interactorGenes?.length ? ` with interactors: ${interactorGenes.join(', ')}` : '') +
          (experimentalMethods?.length ? ` using methods: ${experimentalMethods.join(', ')}` : '') +
          (minScore ? ` with score ≥ ${minScore}` : '')
      };
    },
  });

export const getIntactInteractions = () =>
  tool({
    description: "Fetches IntAct protein–protein interactions for a given gene with pagination and filtering.",
    inputSchema: z.object({
      geneName: z.string().describe("The gene symbol to look up (e.g. TP53)"),
      pageSize: z.number().optional().describe("Number of interactions per page (default: 20)"),
      cursor: z.string().optional().describe("Pagination cursor"),
      interactorGenes: z.array(z.string()).optional().describe("Filter by specific interacting genes"),
      detectionMethods: z.array(z.string()).optional().describe("Filter by detection methods"),
      minConfidence: z.number().optional().describe("Minimum confidence score"),
      interactionTypes: z.array(z.string()).optional().describe("Filter by interaction types"),
      sortBy: z.string().optional().describe("Field to sort by"),
      sortOrder: z.enum(['asc', 'desc']).optional().describe("Sort order (default: desc)")
    }),
    execute: async ({ geneName, pageSize = 20, cursor, interactorGenes, detectionMethods, minConfidence, interactionTypes, sortBy, sortOrder = 'desc' }) => {
      const { applyClientSideFilters, createSortFunction } = await import('@/lib/utils/filtering');
      const { processPaginatedResults } = await import('@/lib/utils/pagination');
      
      const intactData = await fetchIntactInteractions(geneName);
      
      if (!intactData) {
        return { 
          data: [],
          total: 0,
          hasNext: false,
          nextCursor: null,
          summary: `No IntAct interactions found for ${geneName}`
        };
      }

      let filteredData = intactData;
      
      // Filter by specific interactor genes
      if (interactorGenes?.length) {
        filteredData = filteredData.filter((item: any) =>
          interactorGenes.some(gene => 
            item.interactor_a?.toLowerCase().includes(gene.toLowerCase()) ||
            item.interactor_b?.toLowerCase().includes(gene.toLowerCase())
          )
        );
      }
      
      // Filter by detection methods
      if (detectionMethods?.length) {
        filteredData = filteredData.filter((item: any) =>
          detectionMethods.some(method => 
            item.detection_method?.toLowerCase().includes(method.toLowerCase())
          )
        );
      }
      
      // Filter by minimum confidence
      if (minConfidence !== undefined) {
        filteredData = filteredData.filter((item: any) =>
          item.confidence_score && item.confidence_score >= minConfidence
        );
      }
      
      // Filter by interaction types
      if (interactionTypes?.length) {
        filteredData = filteredData.filter((item: any) =>
          interactionTypes.some(type => 
            item.interaction_type?.toLowerCase().includes(type.toLowerCase())
          )
        );
      }
      
      // Apply sorting and pagination
      if (sortBy && filteredData.length > 0) {
        const sortFn = createSortFunction(sortBy, sortOrder);
        filteredData = filteredData.sort(sortFn);
      }
      
      const result = processPaginatedResults(
        filteredData,
        pageSize
      );

      return {
        ...result,
        summary: `Found ${result.pagination.totalCount || 0} IntAct interactions for ${geneName}` +
          (interactorGenes?.length ? ` with interactors: ${interactorGenes.join(', ')}` : '') +
          (detectionMethods?.length ? ` using methods: ${detectionMethods.join(', ')}` : '') +
          (interactionTypes?.length ? ` of types: ${interactionTypes.join(', ')}` : '') +
          (minConfidence ? ` with confidence ≥ ${minConfidence}` : '')
      };
    },
  });

export const getHuriInteractions = () =>
  tool({
    description: "Fetches HuRI protein–protein interactions for a given gene with pagination and filtering.",
    inputSchema: z.object({
      geneName: z.string().describe("The gene symbol to look up (e.g. TP53)"),
      pageSize: z.number().optional().describe("Number of interactions per page (default: 20)"),
      cursor: z.string().optional().describe("Pagination cursor"),
      interactorGenes: z.array(z.string()).optional().describe("Filter by specific interacting genes"),
      qualityScores: z.array(z.string()).optional().describe("Filter by quality scores (e.g., high, medium, low)"),
      minScore: z.number().optional().describe("Minimum interaction score"),
      sortBy: z.string().optional().describe("Field to sort by"),
      sortOrder: z.enum(['asc', 'desc']).optional().describe("Sort order (default: desc)")
    }),
    execute: async ({ geneName, pageSize = 20, cursor, interactorGenes, qualityScores, minScore, sortBy, sortOrder = 'desc' }) => {
      const { applyClientSideFilters, createSortFunction } = await import('@/lib/utils/filtering');
      const { processPaginatedResults } = await import('@/lib/utils/pagination');
      
      const huriData = await fetchHuriInteractions(geneName);
      
      if (!huriData) {
        return { 
          data: [],
          total: 0,
          hasNext: false,
          nextCursor: null,
          summary: `No HuRI interactions found for ${geneName}`
        };
      }

      let filteredData = huriData;
      
      // Filter by specific interactor genes
      if (interactorGenes?.length) {
        filteredData = filteredData.filter((item: any) =>
          interactorGenes.some(gene => 
            item.gene_a?.toLowerCase().includes(gene.toLowerCase()) ||
            item.gene_b?.toLowerCase().includes(gene.toLowerCase()) ||
            item.symbol_a?.toLowerCase().includes(gene.toLowerCase()) ||
            item.symbol_b?.toLowerCase().includes(gene.toLowerCase())
          )
        );
      }
      
      // Filter by quality scores
      if (qualityScores?.length) {
        filteredData = filteredData.filter((item: any) =>
          qualityScores.some(score => 
            item.quality?.toLowerCase().includes(score.toLowerCase())
          )
        );
      }
      
      // Filter by minimum score
      if (minScore !== undefined) {
        filteredData = filteredData.filter((item: any) =>
          item.score && item.score >= minScore
        );
      }
      
      // Apply sorting and pagination
      if (sortBy && filteredData.length > 0) {
        const sortFn = createSortFunction(sortBy, sortOrder);
        filteredData = filteredData.sort(sortFn);
      }
      
      const result = processPaginatedResults(
        filteredData,
        pageSize
      );

      return {
        ...result,
        summary: `Found ${result.pagination.totalCount || 0} HuRI interactions for ${geneName}` +
          (interactorGenes?.length ? ` with interactors: ${interactorGenes.join(', ')}` : '') +
          (qualityScores?.length ? ` with quality: ${qualityScores.join(', ')}` : '') +
          (minScore ? ` with score ≥ ${minScore}` : '')
      };
    },
  });

export const getPathwayPairs = () =>
  tool({
    description: "Fetches general pathway interaction pairs for a gene with pagination and source filtering.",
    inputSchema: z.object({
      geneName: z.string().describe("The gene symbol to look up (e.g. TP53)"),
      pageSize: z.number().optional().describe("Number of pathway pairs per page (default: 20)"),
      cursor: z.string().optional().describe("Pagination cursor"),
      sources: z.array(z.enum(["KEGG", "CycBio", "WikiPathways"])).optional().describe("Pathway sources to include"),
      pathwayNames: z.array(z.string()).optional().describe("Filter by specific pathway names"),
      interactionTypes: z.array(z.string()).optional().describe("Filter by interaction types"),
      sortBy: z.string().optional().describe("Field to sort by"),
      sortOrder: z.enum(['asc', 'desc']).optional().describe("Sort order (default: asc)")
    }),
    execute: async ({ geneName, pageSize = 20, cursor, sources, pathwayNames, interactionTypes, sortBy, sortOrder = 'asc' }) => {
      const { applyClientSideFilters, createSortFunction } = await import('@/lib/utils/filtering');
      const { processPaginatedResults } = await import('@/lib/utils/pagination');
      
      // Fetch from all sources if none specified, otherwise fetch from each specified source
      let allPathwayData: any[] = [];
      const sourcesToQuery = sources || ["KEGG", "CycBio", "WikiPathways"];
      
      for (const source of sourcesToQuery) {
        try {
          const pathwayData = await fetchPathwayPairs(geneName, undefined, source);
          if (pathwayData && Array.isArray(pathwayData)) {
            allPathwayData = allPathwayData.concat(
              pathwayData.map((item: any) => ({ ...item, _source: source }))
            );
          }
        } catch (error) {
          console.error(`Error fetching pathway data from ${source}:`, error);
        }
      }
      
      if (allPathwayData.length === 0) {
        return { 
          data: [],
          total: 0,
          hasNext: false,
          nextCursor: null,
          summary: `No pathway pairs found for ${geneName}`
        };
      }

      let filteredData = allPathwayData;
      
      // Filter by pathway names
      if (pathwayNames?.length) {
        filteredData = filteredData.filter((item: any) =>
          pathwayNames.some(name => 
            item.pathway_name?.toLowerCase().includes(name.toLowerCase()) ||
            item.pathway?.toLowerCase().includes(name.toLowerCase())
          )
        );
      }
      
      // Filter by interaction types
      if (interactionTypes?.length) {
        filteredData = filteredData.filter((item: any) =>
          interactionTypes.some(type => 
            item.interaction_type?.toLowerCase().includes(type.toLowerCase()) ||
            item.type?.toLowerCase().includes(type.toLowerCase())
          )
        );
      }
      
      // Apply sorting and pagination
      if (sortBy && filteredData.length > 0) {
        const sortFn = createSortFunction(sortBy, sortOrder);
        filteredData = filteredData.sort(sortFn);
      }
      
      const result = processPaginatedResults(
        filteredData,
        pageSize
      );

      const uniqueSources = Array.from(new Set(filteredData.map(item => item._source)));

      return {
        ...result,
        summary: `Found ${result.pagination.totalCount || 0} pathway pairs for ${geneName} from ${uniqueSources.join(', ')}` +
          (pathwayNames?.length ? ` in pathways: ${pathwayNames.join(', ')}` : '') +
          (interactionTypes?.length ? ` with interaction types: ${interactionTypes.join(', ')}` : '')
      };
    },
  });

export const getPathwayGenes = () =>
  tool({
    description: "Fetches all genes in pathways that include the given gene, optionally filtered by source.",
    inputSchema: z.object({
      geneName: z.string().describe("The gene symbol to look up (e.g. TP53)"),
      source: z.enum(["KEGG", "CycBio", "WikiPathways"]).optional().describe("Pathway source"),
    }),
    execute: async ({ geneName, source }) => {
      const pathwayGenes = await fetchPathwayGenes(geneName, source);
      
      if (!pathwayGenes) {
        throw new Error(`No pathway genes found for ${geneName}${source ? ` (source=${source})` : ""}`);
      }

      return { pathwayGenes };
    },
  });