import { z } from "zod";
import { tool } from "ai";

// Gene API Tools
import { fetchGeneSummary } from "@/lib/gene/summary/api";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { fetchGeneTableData } from "@/lib/gene/table/api";
import { getPathwayPairs, getPathwayGenes } from "@/lib/gene/pathways/api";
import { fetchCosmicByGene } from "@/lib/gene/cosmic/api";
import {
  getBiogridInteractions,
  getIntactInteractions,
  getHuriInteractions,
} from "@/lib/gene/ppi/api";

/**
 * GENE SUMMARY TOOL - For counting and statistical queries only
 * Use this tool ONLY for counting/statistics queries about genes
 * Examples: "How many variants in BRCA1?", "Count of pathogenic variants in TP53"
 * This tool provides COUNTS, TOTALS, and SUMMARY STATISTICS only
 */
export function getComprehensiveGeneSummary() {
  return tool({
    description:
      'GENE SUMMARY TOOL: Use this tool ONLY for COUNTING and STATISTICAL queries about genes. Examples: "How many variants in BRCA1?", "How many pathogenic variants in TP53?", "Count of variants in BRCA1 for plof category", "Total SNVs in gene X". This tool provides COUNTS, TOTALS, and SUMMARY STATISTICS only. For variant listings, use getGeneVariantData. For gene information, use getGeneAnnotationData. The summary includes detailed field descriptions to help explain what each count represents.',
    inputSchema: z.object({
      geneName: z.string().describe("Gene name (e.g., BRCA1, TP53)"),
      category: z
        .enum(["SNV-summary", "InDel-summary", "total-summary"])
        .optional()
        .describe("Type of summary to retrieve for gene statistics"),
    }),
    execute: async ({
      geneName,
      category = "total-summary",
    }) => {
      const result = await fetchGeneSummary(geneName);
      if (!result) return { error: `No data found for gene ${geneName}` };

      const summaryData =
        category === "SNV-summary"
          ? result.snv_summary
          : category === "InDel-summary"
            ? result.indel_summary
            : result.total_summary;

      const fieldDescriptions = {
        alleleDistribution: {
          total: "Total count of all variants in this gene",
          common: "Variants with MAF > 1% (population polymorphisms, generally tolerated)",
          lowfreq: "Variants with 0.01% ≤ MAF < 1% (regional/founder effects, moderate clinical relevance)",
          rare: "Variants with MAF < 0.01% (recent mutations, highest likelihood of being deleterious)",
          singletons: "Variants observed once (AC=1, private/de novo, candidate for rare disease)",
          doubletons: "Variants observed twice (AC=2, very rare recurrent variants)"
        },
        genomicRegion: {
          exonic: "Variants in protein-coding exons (highest functional impact, ~2% of genome)",
          utr: "Variants in untranslated regions (post-transcriptional regulation)",
          ncrna: "Variants in non-coding RNA genes (regulatory function)",
          intronic: "Variants within introns (potential regulatory/splicing effects)",
          splicing: "Variants at splice sites (critical for transcript integrity, high impact)",
          upstream: "Variants in promoter/upstream regulatory regions (transcription regulation)",
          downstream: "Variants downstream of genes (potential regulatory elements)",
          intergenic: "Variants between genes (distal regulatory potential)"
        },
        clinicalSignificance: {
          pathogenic: "Clinically confirmed disease-causing variants (immediate clinical action)",
          likelypathogenic: "Probably disease-causing (clinical consideration warranted)",
          benign: "Confirmed non-pathogenic variants",
          likelybenign: "Probably non-pathogenic variants",
          unknown: "Variants of uncertain significance (VUS, requires monitoring)",
          drugresponse: "Pharmacogenomic variants affecting drug metabolism/response",
          conflicting: "Variants with conflicting interpretations (expert review needed)"
        },
        functionalConsequence: {
          plof: "Protein loss-of-function variants (stop-gain, frameshift, severe impact)",
          nonsynonymous: "Missense variants causing amino acid changes (moderate impact)",
          synonymous: "Silent variants with no amino acid change (low impact)",
          deleterious: "SIFT-predicted damaging variants",
          damaging: "PolyPhen-predicted probably damaging variants",
          cageenhancer: "Variants overlapping CAGE-identified enhancer regions",
          cagepromoter: "Variants overlapping CAGE-identified promoter regions"
        },
        integrativeScores: {
          apcproteinfunction: "aPC-Protein Function score >10 indicates likely functional impact (PHRED scale, combines SIFT/PolyPhen/etc)",
          apcconservation: "aPC-Conservation score >10 indicates high evolutionary conservation (GERP, PhyloP, PhastCons)",
          apcepigeneticsactive: "aPC-Active Chromatin score >10 indicates active regulatory state (H3K4me3, H3K27ac marks)",
          apcepigeneticsrepressive: "aPC-Repressed Chromatin score >10 indicates silenced state (H3K9me3, H3K27me3)",
          apcepigeneticstranscription: "aPC-Transcription score >10 indicates active transcription (H3K36me3, H3K79me2)",
          apclocalnucleotidediversity: "aPC-Nucleotide Diversity score >10 indicates high local genetic diversity",
          apcmutationdensity: "aPC-Mutation Density score >10 indicates high local mutation burden",
          apctranscriptionfactor: "aPC-TF Binding score >10 indicates strong transcription factor binding evidence",
          apcmappability: "aPC-Mappability score >10 indicates good sequence uniqueness for read mapping",
          caddphred: "CADD PHRED score >10 indicates likely deleterious (higher = more deleterious, max ~40)"
        }
      };

      return {
        gene: geneName,
        summary: summaryData,
        fieldDescriptions,
        interpretationGuide: "Use fieldDescriptions to explain what each count represents. Scores >10 for aPC metrics indicate high values. Higher CADD scores indicate more likely deleterious effects.",
        metadata: {
          dataType: "gene_summary",
          category,
          source: "genohub",
        },
      };
    },
  });
}

/**
 * GENE ANNOTATION TOOL - For detailed gene information
 * Use this tool to get comprehensive gene information including:
 * - Gene function and description
 * - Human phenotype associations
 * - Disease associations
 * - Expression patterns
 * - External database IDs
 * - Protein information
 */
export function getGeneAnnotationData() {
  return tool({
    description:
      "Get detailed gene-level annotations including functional information, expression, phenotype, human disease associations, and external database IDs. Use this tool when users ask about gene function, diseases, phenotypes, or general gene information. Uses AI-powered search for specific questions.",
    inputSchema: z.object({
      geneName: z
        .string()
        .describe("Gene name to get annotations for (e.g., BRCA1, TP53, MYC)"),
      question: z
        .string()
        .optional()
        .describe(
          'Specific question about the gene (e.g., "What is the function of BRCA1?", "What diseases is TP53 associated with?", "What phenotypes are associated with mutations in this gene?")',
        ),
    }),
    execute: async ({ geneName, question }) => {
      // Use AI-powered gene annotation if question is provided
      if (question) {
        try {
          const response = await fetch("/api/gene-info", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              gene: geneName,
              question: question,
            }),
          });

          if (response.ok) {
            const aiResult = await response.json();
            return {
              gene: geneName,
              annotation: aiResult.annotation,
              question,
              url: `https://favor.genohub.org/hg38/gene/${geneName}/gene-level-annotation/info-and-ids`,
              metadata: {
                dataType: "gene_annotation_ai",
                source: "weaviate_ai",
                queryType: "semantic_search",
              },
            };
          }
        } catch (error) {
          console.error("Error with AI gene annotation:", error);
          // Fall back to standard annotation
        }
      }

      // Standard gene annotation fallback
      const result = await fetchGeneAnnotation(geneName);
      if (!result) {
        return {
          error: `Gene annotation for ${geneName} could not be found.${question ? " AI search also returned no results." : ""}`,
        };
      }

      return {
        gene: geneName,
        annotation: result,
        question,
        url: `https://favor.genohub.org/hg38/gene/${geneName}/gene-level-annotation/info-and-ids`,
        metadata: {
          dataType: "gene_annotation",
          source: "genohub",
          queryType: question ? "fallback_after_ai" : "standard",
        },
      };
    },
  });
}

/**
 * GENE VARIANT LISTING TOOL - For browsing and listing individual variants
 * Use this tool when users want to see actual variants with their details
 * Examples: "Show me variants in BRCA1", "List pathogenic variants in TP53"
 */
export function getGeneVariantData() {
  return tool({
    description:
      'GENE VARIANT LISTING TOOL: Use this tool for LISTING and BROWSING individual variants within a gene, NOT for counting. Examples: "Show me variants in BRCA1", "List pathogenic variants in TP53", "Find variants with highest conservation in BRCA1", "Show me 10 variants sorted by CADD score". This tool is for when users want to SEE ACTUAL VARIANTS with their details, positions, scores, etc. Use getComprehensiveGeneSummary for counting queries. IMPORTANT: By default, only 5 variants are returned per page. ALWAYS inform the user that there may be more variants available and they can request additional variants if needed.',
    inputSchema: z.object({
      geneName: z
        .string()
        .describe(
          "Gene name to get variants for (e.g., APOE, BRCA1, MYC, PTPRD, BRCA2, TP53)",
        ),
      subcategory: z
        .enum(["SNV-table", "InDel-table", "Total-table"])
        .optional()
        .describe("Type of variants to retrieve (default: Total-table)"),
      cursor: z
        .string()
        .optional()
        .describe("Cursor for pagination. Omit to fetch the first page"),
      filtersQuery: z
        .string()
        .optional()
        .describe(
          'Filter query string for categorical filters. Available filters: genecode_comprehensive_category (exonic, ncrna, intronic, downstream, intergenic, upstream, splicing, utr), clnsig_v2 (drugresponse, pathogenic, likelypathogenic, benign, likelybenign, conflicting, unknown). Format: "genecode_comprehensive_category=exonic,utr&clnsig_v2=pathogenic"',
        ),
      numericFilters: z
        .array(
          z.object({
            field: z
              .string()
              .describe(
                "Numeric field to filter. Valid fields: position, bravo_an, bravo_ac, bravo_af, cadd_phred, linsight, fathmm_xf, apc_conservation_v2, apc_epigenetics_active, apc_epigenetics_repressed, apc_epigenetics_transcription, apc_local_nucleotide_diversity_v3, apc_mappability, apc_mutation_density, apc_protein_function_v3, apc_transcription_factor, af_total, tg_all, af_eas, af_sas, af_afr, af_amr, af_eur",
              ),
            operator: z
              .enum(["gt", "lt", "eq"])
              .describe(
                "Comparison operator: gt (greater than), lt (less than), eq (equal to)",
              ),
            value: z.string().describe("Numeric value for comparison"),
          }),
        )
        .optional()
        .describe("Array of numeric filters"),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Field to sort by. Prefix with "-" for descending order (e.g., "position" for ascending, "-position" for descending, "apc_conservation_v2" for ascending by conservation, "-apc_conservation_v2" for descending by conservation - highest first)',
        ),
      pageSize: z
        .number()
        .optional()
        .describe("Number of variants per page (default: 5, use higher values only if user explicitly requests more variants)"),
    }),
    execute: async ({
      geneName,
      subcategory = "Total-table",
      cursor,
      filtersQuery,
      numericFilters,
      sortBy,
      pageSize = 5,
    }) => {
      // Map Total-table to SNV-table for API compatibility
      const apiSubcategory =
        subcategory === "Total-table" ? "SNV-table" : subcategory;

      const result = await fetchGeneTableData(geneName, {
        subcategory: apiSubcategory,
        filtersQuery,
        sortingQuery: sortBy ? `sort=${sortBy}` : undefined,
        numericFilters,
        pageSize,
        cursor,
      });

      if (!result)
        return { error: `No variant data found for gene ${geneName}` };

      const urlMap = {
        "SNV-table": "SNV-table",
        "InDel-table": "InDel-table",
        "Total-table": "SNV-table",
      };

      return {
        gene: geneName,
        variants: result.data,
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor,
        url: `https://favor.genohub.org/hg38/gene/${geneName}/full-tables/${urlMap[subcategory]}`,
        metadata: {
          dataType: "gene_variants",
          source: "genohub",
          subcategory,
          pageSize,
          totalResults: result.data.length,
          filtersApplied: !!filtersQuery || !!numericFilters?.length,
          sortApplied: !!sortBy,
        },
      };
    },
  });
}

/**
 * GENE PATHWAY INTERACTIONS TOOL
 * Get pathway interaction pairs for a gene
 */
export function getGenePathwayInteractions() {
  return tool({
    description: "Get pathway interaction pairs for a gene from multiple pathway databases. Use this tool to find what pathways a gene participates in and its interaction partners within those pathways. Available sources: KEGG, BioCyc, WikiPathways, IntPath.",
    inputSchema: z.object({
      geneName: z
        .string()
        .describe("Gene name to get pathway interactions for"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of interactions to return (default: 100)"),
      source: z
        .enum(["KEGG", "BioCyc", "WikiPathways", "IntPath"])
        .optional()
        .describe("Specific pathway source to filter by. Options: KEGG (Kyoto Encyclopedia), BioCyc (Pathway/Genome Databases), WikiPathways (collaborative curation), IntPath (integrated analysis, returns all sources if not specified)"),
    }),
    execute: async ({ geneName, limit, source }) => {
      const sourceParam = source === "IntPath" ? "" : source;
      const result = await getPathwayPairs(geneName, limit, sourceParam);
      if (!result)
        return { error: `No pathway interactions found for gene ${geneName}` };

      return {
        gene: geneName,
        pathwayPairs: result,
        metadata: {
          dataType: "pathway_interactions",
          source: source || "all",
          limit: limit || 100,
          totalResults: result.length,
        },
      };
    },
  });
}

/**
 * GENE PATHWAY GENES TOOL
 * Get genes in the same pathways as the query gene
 */
export function getGenePathwayGenes() {
  return tool({
    description: "Get genes in the same pathways as the query gene from multiple pathway databases. Use this tool to find functionally related genes that participate in the same biological pathways. Available sources: KEGG, BioCyc, WikiPathways, IntPath.",
    inputSchema: z.object({
      geneName: z.string().describe("Gene name to find pathway genes for"),
      source: z
        .enum(["KEGG", "BioCyc", "WikiPathways", "IntPath"])
        .optional()
        .describe("Specific pathway source to filter by. Options: KEGG (Kyoto Encyclopedia), BioCyc (Pathway/Genome Databases), WikiPathways (collaborative curation), IntPath (integrated analysis, returns all sources if not specified)"),
    }),
    execute: async ({ geneName, source }) => {
      const sourceParam = source === "IntPath" ? "" : source;
      const result = await getPathwayGenes(geneName, sourceParam);
      if (!result)
        return { error: `No pathway genes found for gene ${geneName}` };

      return {
        gene: geneName,
        pathwayGenes: result,
        metadata: {
          dataType: "pathway_genes",
          source: source || "all",
          totalResults: result.length,
        },
      };
    },
  });
}

/**
 * GENE COSMIC DATA TOOL
 * Get COSMIC cancer gene census data
 */
export function getGeneCosmicData() {
  return tool({
    description: "Get COSMIC cancer gene census data. Use this tool to find information about a gene's role in cancer, including cancer types, mutation patterns, and oncogene/tumor suppressor classifications. IMPORTANT: By default, only 10 records are returned. Inform users there may be more COSMIC data available.",
    inputSchema: z.object({
      geneName: z.string().describe("Gene name to get COSMIC data for"),
      limit: z
        .number()
        .optional()
        .describe("Number of COSMIC records to return (default: 10, use higher values only if user explicitly requests more)"),
    }),
    execute: async ({ geneName, limit = 10 }) => {
      const { processPaginatedResults } = await import(
        "@/lib/utils/pagination"
      );

      const allData = await fetchCosmicByGene(geneName);
      if (!allData || allData.length === 0)
        return { error: `No COSMIC data found for gene ${geneName}` };

      const result = processPaginatedResults(allData, limit);

      return {
        gene: geneName,
        cosmic: result.paginatedData,
        hasMore: result.pagination.hasNextPage,
        summary: `Found ${result.pagination.totalCount || 0} COSMIC records for ${geneName}. Showing ${result.paginatedData.length} records` +
          (result.pagination.hasNextPage ? ". More COSMIC data available upon request." : ""),
        metadata: {
          dataType: "cosmic_gene",
          source: "cosmic",
          totalRecords: result.pagination.totalCount || 0,
          limit,
          returnedRecords: result.paginatedData.length,
        },
      };
    },
  });
}

/**
 * GENE PROTEIN INTERACTIONS TOOL
 * Get protein-protein interactions from multiple databases
 */
export function getGeneProteinInteractions() {
  return tool({
    description:
      "Get protein-protein interactions from multiple databases (BioGRID, IntAct, HuRI) with cross-database filtering, deduplication, and pagination. Use this tool to find proteins that physically interact with the query gene's protein product. IMPORTANT: By default, only 10 interactions are returned. Inform users there may be more interactions available. Do NOT enable crossDbValidation unless user explicitly requests it - it's very restrictive and often returns 0 results.",
    inputSchema: z.object({
      geneName: z
        .string()
        .describe("Gene name to get protein interactions for"),
      databases: z
        .array(z.enum(["biogrid", "intact", "huri"]))
        .optional()
        .describe("Specific PPI databases to query (default: all)"),
      pageSize: z
        .number()
        .optional()
        .describe("Number of results per page (default: 10, use higher values only if user explicitly requests more)"),
      interactorGenes: z
        .array(z.string())
        .optional()
        .describe("Filter by specific interacting genes"),
      minConfidenceScore: z
        .number()
        .optional()
        .describe("Minimum confidence score for interactions"),
      experimentalMethods: z
        .array(z.string())
        .optional()
        .describe("Filter by experimental methods"),
      crossDbValidation: z
        .boolean()
        .optional()
        .describe("VERY RESTRICTIVE FILTER: Only show interactions where the EXACT SAME interactor appears in multiple databases. This will often return 0 results. Only use if user explicitly requests cross-database validation. Default: false."),
      deduplicateInteractors: z
        .boolean()
        .optional()
        .describe(
          "Remove duplicate interactors across databases (default: true)",
        ),
      sortBy: z
        .string()
        .optional()
        .describe("Field to sort by (interactor, score, database)"),
      sortOrder: z
        .enum(["asc", "desc"])
        .optional()
        .describe("Sort order (default: desc)"),
    }),
    execute: async ({
      geneName,
      databases = ["biogrid", "intact", "huri"],
      pageSize = 10,
      interactorGenes,
      minConfidenceScore,
      experimentalMethods,
      crossDbValidation = false,
      deduplicateInteractors = true,
      sortBy,
      sortOrder = "desc",
    }) => {
      const { createSortFunction } = await import(
        "@/lib/utils/filtering"
      );
      const { processPaginatedResults } = await import(
        "@/lib/utils/pagination"
      );

      const results: any = {};
      let allInteractions: any[] = [];

      // Fetch from specified databases
      if (databases.includes("biogrid")) {
        const biogridData = await getBiogridInteractions(geneName);
        if (biogridData) {
          results.biogrid = biogridData;
          allInteractions = allInteractions.concat(
            biogridData.map((item: any) => ({ ...item, _source: "biogrid" })),
          );
        }
      }

      if (databases.includes("intact")) {
        const intactData = await getIntactInteractions(geneName);
        if (intactData) {
          results.intact = intactData;
          allInteractions = allInteractions.concat(
            intactData.map((item: any) => ({ ...item, _source: "intact" })),
          );
        }
      }

      if (databases.includes("huri")) {
        const huriData = await getHuriInteractions(geneName);
        if (huriData) {
          results.huri = huriData;
          allInteractions = allInteractions.concat(
            huriData.map((item: any) => ({ ...item, _source: "huri" })),
          );
        }
      }

      // Apply filtering
      let filteredInteractions = allInteractions;

      // Filter by specific interactor genes
      if (interactorGenes?.length) {
        filteredInteractions = filteredInteractions.filter((item: any) =>
          interactorGenes.some(
            (gene) =>
              item.interactor_a?.toLowerCase().includes(gene.toLowerCase()) ||
              item.interactor_b?.toLowerCase().includes(gene.toLowerCase()) ||
              item.gene_b?.toLowerCase().includes(gene.toLowerCase()) ||
              item.symbol_b?.toLowerCase().includes(gene.toLowerCase()),
          ),
        );
      }

      // Filter by confidence score
      if (minConfidenceScore !== undefined) {
        filteredInteractions = filteredInteractions.filter(
          (item: any) =>
            (item.confidence_score &&
              item.confidence_score >= minConfidenceScore) ||
            (item.score && item.score >= minConfidenceScore),
        );
      }

      // Filter by experimental methods
      if (experimentalMethods?.length) {
        filteredInteractions = filteredInteractions.filter((item: any) =>
          experimentalMethods.some(
            (method) =>
              item.experimental_system
                ?.toLowerCase()
                .includes(method.toLowerCase()) ||
              item.detection_method
                ?.toLowerCase()
                .includes(method.toLowerCase()),
          ),
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
        interactorMap.forEach((data) => {
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
              const existingScore =
                existing.confidence_score || existing.score || 0;
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

      const result = processPaginatedResults(filteredInteractions, pageSize);

      const uniqueDatabases = Array.from(
        new Set(filteredInteractions.map((item) => item._source)),
      );
      const validatedCount = crossDbValidation
        ? new Set(
            filteredInteractions.map(
              (item) => item.interactor_b || item.gene_b || item.symbol_b,
            ),
          ).size
        : 0;

      return {
        gene: geneName,
        interactions: result.paginatedData,
        hasMore: result.pagination.hasNextPage,
        summary:
          `Found ${result.pagination.totalCount || 0} protein interactions for ${geneName}. Showing ${result.paginatedData.length} interactions` +
          (interactorGenes?.length
            ? ` with interactors: ${interactorGenes.join(", ")}`
            : "") +
          (crossDbValidation
            ? ` (${validatedCount} cross-database validated)`
            : "") +
          ` across databases: ${uniqueDatabases.join(", ")}` +
          (result.pagination.hasNextPage ? ". More interactions available upon request." : ""),
        metadata: {
          dataType: "protein_interactions",
          databases: uniqueDatabases,
          crossDbValidated: crossDbValidation,
          deduplicatedInteractors: deduplicateInteractors,
          totalUniqueInteractors: deduplicateInteractors
            ? new Set(
                filteredInteractions.map(
                  (item) => item.interactor_b || item.gene_b || item.symbol_b,
                ),
              ).size
            : result.pagination.totalCount || 0,
          pageSize,
          returnedResults: result.paginatedData.length,
        },
      };
    },
  });
}