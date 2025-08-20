import { tool } from "ai";
import { z } from "zod";
import { fetchRegionSummary } from "@/lib/region/summary/api";
import { fetchRegionTableData } from "@/lib/region/table/api";

export const getRegionSummary = () =>
  tool({
    description: "Retrieves key variant statistics for a given region including total variants, pathogenic, exonic, etc.",
    inputSchema: z.object({
      region: z.string().describe("The region, e.g., 19-44908822-44909305"),
      category: z.string().describe("The variant category: 'SNV-summary' or 'InDel-summary'"),
    }),
    execute: async ({ region, category }) => {
      const regionSummary = await fetchRegionSummary(region, category);
      
      if (!regionSummary) {
        throw new Error(`Region Summary for ${region} could not be found.`);
      }

      return {
        regionSummary,
        url: `https://favor.genohub.org/hg38/region/${region}/${category}/allele-distribution`,
      };
    },
  });

export const getRegionVariants = () =>
  tool({
    description: "Retrieves a list of variants and their information for a given region with pagination and filtering support.",
    inputSchema: z.object({
      region: z.string().describe("The region e.g., 19-44908822-44909305"),
      cursor: z.string().optional().describe("The cursor for pagination"),
      filtersQuery: z.string().optional().describe("Categorical filter query string"),
      numericFilters: z.array(z.object({
        field: z.string(),
        operator: z.enum(["gt", "lt", "eq"]),
        value: z.string(),
      })).optional().describe("Array of numeric filters"),
      sortBy: z.string().optional().describe("Field to sort by"),
      subCategorySlug: z.string().default("Total-table").describe("Valid values: 'SNV-table', 'InDel-table', 'Total-table'"),
    }),
    execute: async (params) => {
      const subcategory = params.subCategorySlug === "Total-table" ? "SNV-table" : params.subCategorySlug;
      
      const result = await fetchRegionTableData(params.region, {
        filtersQuery: params.filtersQuery,
        sortingQuery: params.sortBy,
        subcategory,
        numericFilters: params.numericFilters,
        pageSize: 3,
        cursor: params.cursor,
      });

      const urlMap = {
        "SNV-table": "SNV-table",
        "InDel-table": "InDel-table",
        "Total-table": "SNV-table",
      };

      return {
        variants: result.data,
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor,
        url: `https://favor.genohub.org/hg38/region/${params.region}/full-tables/${urlMap[params.subCategorySlug as keyof typeof urlMap]}`,
      };
    },
  });