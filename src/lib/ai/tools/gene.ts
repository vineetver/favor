import { tool } from "ai";
import { z } from "zod";
import { fetchGeneSummary, getSummaryByCategory } from "@/lib/gene/summary/api";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { fetchGeneTableData } from "@/lib/gene/table/api";

export const getGeneSummary = () =>
  tool({
    description: "Retrieves key variant statistics for a given gene including total variants, pathogenic, exonic, UTR, etc.",
    inputSchema: z.object({
      gene: z.string().describe("The gene symbol, e.g., APOE, BRCA1, MYC"),
      category: z.string().describe("The category: 'SNV-summary' or 'InDel-summary' or 'total-summary'"),
    }),
    execute: async ({ gene, category }) => {
      const geneSummaryData = await fetchGeneSummary(gene);
      
      if (!geneSummaryData) {
        throw new Error(`Gene Summary for ${gene} could not be found.`);
      }

      const geneSummary = getSummaryByCategory(geneSummaryData, category);

      const categoryUrlMap = {
        "SNV-summary": "SNV-summary",
        "InDel-summary": "InDel-summary", 
        "total-summary": "SNV-summary",
      };

      return {
        geneSummary,
        url: `https://favor.genohub.org/hg38/gene/${gene}/${categoryUrlMap[category as keyof typeof categoryUrlMap]}/allele-distribution`,
      };
    },
  });

export const getGeneAnnotation = () =>
  tool({
    description: "Returns gene annotation/information for a given gene including function, expression, phenotype, etc.",
    inputSchema: z.object({
      question: z.string().describe("The question related to gene annotation"),
      gene: z.string().describe("The gene symbol, e.g., APOE, BRCA1, MYC"),
    }),
    execute: async ({ gene, question }) => {
      const annotation = await fetchGeneAnnotation(gene);
      
      if (!annotation) {
        throw new Error(`Gene Annotation for ${gene} could not be found.`);
      }

      return {
        geneAnnotation: annotation,
        url: `https://favor.genohub.org/hg38/gene/${gene}/gene-level-annotation/info-and-ids`,
      };
    },
  });

export const getGeneVariants = () =>
  tool({
    description: "Retrieves a list of variants and their information for a given gene with pagination and filtering support.",
    inputSchema: z.object({
      gene: z.string().describe("The gene symbol"),
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
      
      const result = await fetchGeneTableData(params.gene, {
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
        url: `https://favor.genohub.org/hg38/gene/${params.gene}/full-tables/${urlMap[params.subCategorySlug as keyof typeof urlMap]}`,
      };
    },
  });