import { z } from "zod";
import { tool } from "ai";

// Region API Tools
import { fetchRegionSummary } from "@/lib/region/summary/api";
import { fetchRegionTableData } from "@/lib/region/table/api";
import {
  fetchABCPeaksByRegion,
  fetchABCScoresByRegion,
} from "@/lib/region/abc/api";
import { fetchCosmicByRegion } from "@/lib/region/cosmic/api";
import { fetchRegionAnnotation } from "@/lib/region/annotation/api";
import { fetchPGBoostByRegion } from "@/lib/region/pgboost/api";
import { fetchVistaEnhancerByRegion } from "@/lib/region/vista-enhancers/api";
import { fetchEpimapByRegion } from "@/lib/region/epimap/api";

/**
 * REGION SUMMARY TOOL - For counting and statistical queries only
 * Use this tool ONLY for counting/statistics queries about genomic regions
 * Examples: "How many variants in 1-1000000-2000000?", "Count of SNVs in this region"
 * This tool provides COUNTS, TOTALS, and SUMMARY STATISTICS only
 */
export function getRegionSummaryData() {
  return tool({
    description:
      'REGION SUMMARY TOOL: Use this tool for COUNTING and STATISTICAL queries about genomic regions. Examples: "How many variants in 1-1000000-2000000?", "Count of SNVs in this region", "Total variants in region X". This tool provides COUNTS, TOTALS, and SUMMARY STATISTICS for genomic regions, NOT variant listings.',
    inputSchema: z.object({
      region: z
        .string()
        .describe("Genomic region (e.g., 1-1000000-2000000)"),
      category: z
        .enum(["SNV-summary", "InDel-summary"])
        .optional()
        .describe("Type of summary to retrieve"),
    }),
    execute: async ({ region, category = "SNV-summary" }) => {
      const result = await fetchRegionSummary(region, category);
      if (!result)
        return { error: `No summary data found for region ${region}` };

      return {
        region,
        summary: result,
        metadata: {
          dataType: "region_summary",
          category,
          source: "genohub",
        },
      };
    },
  });
}

/**
 * REGION VARIANT LISTING TOOL - For browsing and listing individual variants
 * Use this tool when users want to see actual variants with their details
 * Examples: "Show me variants in 1-1000000-2000000", "List high CADD score variants"
 */
export function getRegionVariantData() {
  return tool({
    description:
      'REGION VARIANT LISTING TOOL: Use this tool for LISTING and BROWSING individual variants within a genomic region, NOT for counting. Examples: "Show me variants in 1-1000000-2000000", "List high CADD score variants in this region", "Find variants with highest conservation in region X". This tool is for when users want to SEE ACTUAL VARIANTS with their details, positions, scores, etc. Use getRegionSummaryData for counting queries.',
    inputSchema: z.object({
      region: z
        .string()
        .describe(
          "Genomic region (e.g., 19-44908822-44909305 or 1-1000000-2000000)",
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
          'Filter query string for categorical filters. Available filters: genecode_comprehensive_category (exonic, ncrna, intronic, downstream, intergenic, upstream, splicing, utr), clnsig (drugresponse, pathogenic, likelypathogenic, benign, likelybenign, conflicting, unknown). Format: "genecode_comprehensive_category=exonic,utr&clnsig=pathogenic"',
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
          'Field to sort by. Prefix with "-" for descending order (e.g., "position", "-position")',
        ),
      pageSize: z
        .number()
        .optional()
        .describe("Number of variants per page (default: 20)"),
    }),
    execute: async ({
      region,
      subcategory = "Total-table",
      cursor,
      filtersQuery,
      numericFilters,
      sortBy,
      pageSize = 20,
    }) => {
      // Map Total-table to SNV-table for API compatibility
      const apiSubcategory =
        subcategory === "Total-table" ? "SNV-table" : subcategory;

      // Build sorting query in the format expected by the API (like ServerSideDataTable does)
      let sortingQuery: string | undefined;
      if (sortBy) {
        // Convert sortBy format (e.g., "-position") to query format (e.g., "sort=-position")
        sortingQuery = `sort=${sortBy}`;
      }

      const result = await fetchRegionTableData(region, {
        subcategory: apiSubcategory,
        filtersQuery,
        sortingQuery,
        numericFilters,
        pageSize,
        cursor,
      });

      if (!result)
        return { error: `No variant data found for region ${region}` };

      const urlMap = {
        "SNV-table": "SNV-table",
        "InDel-table": "InDel-table",
        "Total-table": "SNV-table",
      };

      return {
        region,
        variants: result.data,
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor,
        url: `https://favor.genohub.org/hg38/region/${region}/full-tables/${urlMap[subcategory]}`,
        metadata: {
          dataType: "region_variants",
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
 * REGION ABC DATA TOOL
 * Get ABC enhancer-gene predictions for a genomic region
 */
export function getRegionABCData() {
  return tool({
    description: "Get ABC enhancer-gene predictions for a genomic region. Use this tool to find Activity-by-Contact (ABC) model predictions for enhancer-gene interactions in a specific region.",
    inputSchema: z.object({
      region: z
        .string()
        .describe("Genomic region (e.g., 1-1000000-2000000)"),
      dataType: z
        .enum(["peaks", "scores", "both"])
        .optional()
        .describe("Type of ABC data to retrieve"),
    }),
    execute: async ({ region, dataType = "both" }) => {
      const results: any = {};

      if (dataType === "both" || dataType === "peaks") {
        results.peaks = await fetchABCPeaksByRegion(region);
      }
      if (dataType === "both" || dataType === "scores") {
        results.scores = await fetchABCScoresByRegion(region);
      }

      return {
        region,
        abc: results,
        metadata: {
          dataType: "region_abc",
          source: "abc",
        },
      };
    },
  });
}

/**
 * REGION ANNOTATION DATA TOOL
 * Get annotation data for a genomic region
 */
export function getRegionAnnotationData() {
  return tool({
    description: "Get annotation data for a genomic region. Use this tool to find gene annotations, regulatory elements, and functional annotations within a specific genomic region.",
    inputSchema: z.object({
      region: z
        .string()
        .describe("Genomic region (e.g., 1-1000000-2000000)"),
    }),
    execute: async ({ region }) => {
      const result = await fetchRegionAnnotation(region);
      if (!result)
        return { error: `No annotation data found for region ${region}` };

      return {
        region,
        annotation: result,
        metadata: {
          dataType: "region_annotation",
          source: "genohub",
        },
      };
    },
  });
}

/**
 * REGION REGULATORY DATA TOOL
 * Get comprehensive regulatory data from multiple sources
 */
export function getRegionRegulatoryData() {
  return tool({
    description:
      "Get regulatory data for a genomic region (VISTA enhancers, EpiMap, PGBoost) with client-side pagination, tissue filtering, and chromatin state filtering. Use this tool to find enhancers, chromatin states, and regulatory elements in a region.",
    inputSchema: z.object({
      region: z
        .string()
        .describe("Genomic region (e.g., 1-1000000-2000000)"),
      dataType: z
        .enum(["vista", "epimap", "pgboost", "all"])
        .optional()
        .describe("Type of regulatory data to retrieve"),
      pageSize: z
        .number()
        .optional()
        .describe("Number of results per page (default: 20)"),
      cursor: z.string().optional().describe("Pagination cursor"),
      tissues: z
        .array(z.string())
        .optional()
        .describe("Filter EpiMap data by tissue/cell types"),
      chromatinStates: z
        .array(z.string())
        .optional()
        .describe("Filter EpiMap data by chromatin states"),
      lifeStages: z
        .array(z.string())
        .optional()
        .describe("Filter EpiMap data by life stages"),
      categories: z
        .array(z.string())
        .optional()
        .describe("Filter EpiMap data by categories"),
      activityPatterns: z
        .array(z.string())
        .optional()
        .describe("Filter VISTA data by activity patterns"),
      minScore: z
        .number()
        .optional()
        .describe("Minimum score threshold for PGBoost data"),
      sortBy: z
        .string()
        .optional()
        .describe("Sort by field (category, state_full_name, etc.)"),
      sortOrder: z
        .enum(["asc", "desc"])
        .optional()
        .describe("Sort order (default: asc)"),
    }),
    execute: async ({
      region,
      dataType = "all",
      pageSize = 20,
      cursor,
      tissues,
      chromatinStates,
      lifeStages,
      categories,
      activityPatterns,
      minScore,
      sortBy,
      sortOrder = "asc",
    }) => {
      const { applyClientSideFilters, createSortFunction } = await import(
        "@/lib/utils/filtering"
      );
      const { processPaginatedResults } = await import(
        "@/lib/utils/pagination"
      );

      const results: any = {};
      let allData: any[] = [];

      // Fetch VISTA enhancer data
      if (dataType === "all" || dataType === "vista") {
        const vistaData = await fetchVistaEnhancerByRegion(region);
        if (vistaData) {
          results.vista = vistaData;
          allData = allData.concat(
            vistaData.map((item: any) => ({ ...item, _source: "vista" })),
          );
        }
      }

      // Fetch EpiMap data
      if (dataType === "all" || dataType === "epimap") {
        const epimapData = await fetchEpimapByRegion(region);
        if (epimapData) {
          results.epimap = epimapData;
          allData = allData.concat(
            epimapData.map((item: any) => ({ ...item, _source: "epimap" })),
          );
        }
      }

      // Fetch PGBoost data
      if (dataType === "all" || dataType === "pgboost") {
        const pgboostData = await fetchPGBoostByRegion(region);
        if (pgboostData) {
          results.pgboost = pgboostData;
          allData = allData.concat(
            Array.isArray(pgboostData)
              ? pgboostData.map((item: any) => ({
                  ...item,
                  _source: "pgboost",
                }))
              : [{ data: pgboostData, _source: "pgboost" }],
          );
        }
      }

      // Apply client-side filtering to combined data
      if (allData.length > 0) {
        // EpiMap-specific filtering
        if (tissues?.length) {
          allData = allData.filter(
            (item) =>
              !item.sample_name ||
              tissues.some(
                (tissue) =>
                  item.sample_name
                    ?.toLowerCase()
                    .includes(tissue.toLowerCase()) ||
                  item.type?.toLowerCase().includes(tissue.toLowerCase()) ||
                  item.newgroup?.toLowerCase().includes(tissue.toLowerCase()),
              ),
          );
        }

        if (chromatinStates?.length) {
          allData = allData.filter(
            (item) =>
              !item.state_full_name ||
              chromatinStates.some((state) =>
                item.state_full_name
                  ?.toLowerCase()
                  .includes(state.toLowerCase()),
              ),
          );
        }

        if (lifeStages?.length) {
          allData = allData.filter(
            (item) => !item.lifestage || lifeStages.includes(item.lifestage),
          );
        }

        if (categories?.length) {
          allData = allData.filter(
            (item) =>
              !item.category ||
              categories.some((cat) =>
                item.category?.toLowerCase().includes(cat.toLowerCase()),
              ),
          );
        }

        // VISTA-specific filtering
        if (activityPatterns?.length) {
          allData = allData.filter(
            (item) =>
              item._source !== "vista" ||
              activityPatterns.some((pattern) =>
                item.activity_pattern
                  ?.toLowerCase()
                  .includes(pattern.toLowerCase()),
              ),
          );
        }

        // PGBoost-specific filtering
        if (minScore !== undefined) {
          allData = allData.filter(
            (item) =>
              item._source !== "pgboost" ||
              !item.score ||
              (typeof item.score === "number" && item.score >= minScore),
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
          (item) =>
            item.bssid ||
            item.enhancer_id ||
            item.id ||
            JSON.stringify(item).substring(0, 50),
        );

        return {
          region,
          regulatory: results,
          combinedData: paginatedData,
          hasNextPage: pagination.hasNextPage,
          nextCursor: pagination.nextCursor,
          totalCount: allData.length,
          metadata: {
            dataType: "region_regulatory",
            source: dataType,
            filtersApplied: {
              tissues,
              chromatinStates,
              lifeStages,
              categories,
              activityPatterns,
              minScore,
              sortBy,
              sortOrder,
            },
            totalFiltered: paginatedData.length,
          },
        };
      }

      return {
        region,
        regulatory: results,
        metadata: {
          dataType: "region_regulatory",
          source: dataType,
        },
      };
    },
  });
}

/**
 * REGION COSMIC DATA TOOL
 * Get COSMIC cancer data for a genomic region
 */
export function getRegionCosmicData() {
  return tool({
    description:
      "Get COSMIC cancer data for a genomic region with client-side pagination and filtering. Use this tool to find cancer-associated variants and mutations in a specific genomic region.",
    inputSchema: z.object({
      region: z
        .string()
        .describe("Genomic region (e.g., 1-1000000-2000000)"),
      pageSize: z
        .number()
        .optional()
        .describe("Number of results per page (default: 20)"),
      cursor: z.string().optional().describe("Pagination cursor"),
      minScore: z
        .number()
        .optional()
        .describe("Minimum pathogenicity score filter"),
      cancerTypes: z
        .array(z.string())
        .optional()
        .describe("Filter by cancer types"),
      mutationTypes: z
        .array(z.string())
        .optional()
        .describe(
          "Filter by mutation types (substitution, insertion, deletion, etc.)",
        ),
      sortBy: z.string().optional().describe("Field to sort by"),
      sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    }),
    execute: async ({
      region,
      pageSize = 20,
      cursor,
      minScore,
      cancerTypes,
      mutationTypes,
      sortBy,
      sortOrder = "desc",
    }) => {
      const data = await fetchCosmicByRegion(region);

      if (!data) {
        return {
          data: [],
          total: 0,
          hasNext: false,
          nextCursor: null,
          summary: "No COSMIC data found for this region",
        };
      }

      let filteredData = data;

      if (minScore !== undefined) {
        filteredData = filteredData.filter(
          (item: any) => item.pathogenicity_score >= minScore,
        );
      }

      if (cancerTypes?.length) {
        filteredData = filteredData.filter((item: any) =>
          cancerTypes.some(
            (type) =>
              item.primary_site?.toLowerCase().includes(type.toLowerCase()) ||
              item.site_subtype?.toLowerCase().includes(type.toLowerCase()),
          ),
        );
      }

      if (mutationTypes?.length) {
        filteredData = filteredData.filter((item: any) =>
          mutationTypes.some((type) =>
            item.mutation_type?.toLowerCase().includes(type.toLowerCase()),
          ),
        );
      }

      const { processPaginatedResults } = await import(
        "@/lib/utils/pagination"
      );
      const result = processPaginatedResults(filteredData, pageSize);

      return {
        ...result,
        summary:
          `Found ${result.pagination.totalCount || 0} COSMIC variants in region ${region}` +
          (minScore ? ` with score ≥ ${minScore}` : "") +
          (cancerTypes?.length
            ? ` in cancer types: ${cancerTypes.join(", ")}`
            : "") +
          (mutationTypes?.length
            ? ` with mutation types: ${mutationTypes.join(", ")}`
            : ""),
      };
    },
  });
}

/**
 * REGION VISTA ENHANCERS TOOL
 * Get VISTA enhancer data for a genomic region
 */
export function getRegionVistaEnhancers() {
  return tool({
    description:
      "Get VISTA enhancer data for a genomic region with client-side pagination and activity filtering. Use this tool to find experimentally validated enhancers from the VISTA database in a specific region.",
    inputSchema: z.object({
      region: z
        .string()
        .describe("Genomic region (e.g., 1-1000000-2000000)"),
      pageSize: z
        .number()
        .optional()
        .describe("Number of results per page (default: 20)"),
      cursor: z.string().optional().describe("Pagination cursor"),
      activityPatterns: z
        .array(z.string())
        .optional()
        .describe("Filter by activity patterns (e.g., brain, heart, limb)"),
      stages: z
        .array(z.string())
        .optional()
        .describe("Filter by developmental stages"),
      tissues: z
        .array(z.string())
        .optional()
        .describe("Filter by tissue expression patterns"),
      hasTransgenesis: z
        .boolean()
        .optional()
        .describe("Filter for enhancers with positive transgenesis results"),
      sortBy: z
        .string()
        .optional()
        .describe("Field to sort by (element_id, stage, expression)"),
      sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort order"),
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
      sortOrder = "asc",
    }) => {
      const data = await fetchVistaEnhancerByRegion(region);

      if (!data) {
        return {
          data: [],
          total: 0,
          hasNext: false,
          nextCursor: null,
          summary: "No VISTA enhancer data found for this region",
        };
      }

      let filteredData = data;

      if (activityPatterns?.length) {
        filteredData = filteredData.filter((item: any) =>
          activityPatterns.some(
            (pattern) =>
              item.expression?.toLowerCase().includes(pattern.toLowerCase()) ||
              item.tissues?.toLowerCase().includes(pattern.toLowerCase()),
          ),
        );
      }

      if (stages?.length) {
        filteredData = filteredData.filter((item: any) =>
          stages.some((stage) =>
            item.stage?.toLowerCase().includes(stage.toLowerCase()),
          ),
        );
      }

      if (tissues?.length) {
        filteredData = filteredData.filter((item: any) =>
          tissues.some((tissue) =>
            item.tissues?.toLowerCase().includes(tissue.toLowerCase()),
          ),
        );
      }

      if (hasTransgenesis !== undefined) {
        filteredData = filteredData.filter((item: any) => {
          const hasPositive =
            item.transgenesis?.toLowerCase().includes("positive") ||
            item.transgenesis?.toLowerCase().includes("yes");
          return hasTransgenesis ? hasPositive : !hasPositive;
        });
      }

      const { processPaginatedResults } = await import(
        "@/lib/utils/pagination"
      );
      const result = processPaginatedResults(filteredData, pageSize);

      return {
        ...result,
        summary:
          `Found ${result.pagination.totalCount || 0} VISTA enhancers in region ${region}` +
          (activityPatterns?.length
            ? ` with activity patterns: ${activityPatterns.join(", ")}`
            : "") +
          (stages?.length ? ` in stages: ${stages.join(", ")}` : "") +
          (tissues?.length ? ` in tissues: ${tissues.join(", ")}` : "") +
          (hasTransgenesis !== undefined
            ? ` with ${hasTransgenesis ? "positive" : "negative"} transgenesis`
            : ""),
      };
    },
  });
}