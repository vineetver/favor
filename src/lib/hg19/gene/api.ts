import { clickHouseClient } from "@/lib/clickhouse/client";
import type { Hg19GeneVariantsResponse } from "./types";

export async function fetchHg19GeneVariants(
  geneName: string,
  params: {
    filtersQuery?: string;
    sortingQuery?: string;
    subcategory?: string;
    pageSize?: number;
    cursor?: string;
  },
): Promise<Hg19GeneVariantsResponse> {
  try {
    const {
      subcategory = "SNV-table",
      pageSize = 50,
      cursor = "",
      filtersQuery,
      sortingQuery,
    } = params;
    const limit = pageSize;
    const offset = cursor ? parseInt(cursor) : 0;

    // Step 1: Get gene coordinates
    const geneQuery = `
      SELECT chromosome, start_position, end_position
      FROM production.gene_loci
      WHERE gene_name = {geneName:String}
      LIMIT 1
    `;

    const geneResult = await clickHouseClient.query({
      query: geneQuery,
      query_params: { geneName },
      format: "JSONEachRow",
    });

    console.log("Gene result for", geneName, ":", geneResult);

    if (!geneResult.length) {
      console.log("No gene found in gene_loci for:", geneName);
      return {
        data: [],
        hasNextPage: false,
        nextCursor: undefined,
      };
    }

    const { chromosome, start_position, end_position } = geneResult[0];
    console.log("Gene coordinates:", {
      chromosome,
      start_position,
      end_position,
    });

    // Step 2: Build variant type filter based on subcategory
    let variantTypeFilter = "";
    if (subcategory === "SNV-table") {
      variantTypeFilter = "AND length(ref) = 1 AND length(alt) = 1";
    } else if (subcategory === "InDel-table") {
      variantTypeFilter = "AND (length(ref) > 1 OR length(alt) > 1)";
    }

    // Step 3: Build filter clauses for variants query
    let filterClause = "";
    const queryParams: Record<string, any> = {
      chromosome,
      start_position,
      end_position,
    };

    // Parse filters if provided
    if (filtersQuery) {
      const filterConditions: string[] = [];
      // Simple parsing - expecting format like "key:value,key2:value2"
      const pairs = filtersQuery.split(",");
      pairs.forEach((pair) => {
        const [key, value] = pair.split(":");
        if (key && value && value !== "all") {
          filterConditions.push(`${key} = {${key}:String}`);
          queryParams[key] = value;
        }
      });
      if (filterConditions.length > 0) {
        filterClause = ` AND ${filterConditions.join(" AND ")}`;
      }
    }

    // Step 3: Query variants in the gene region
    let orderClause = "";
    if (sortingQuery) {
      const [sortField, sortDir] = sortingQuery.split(":");
      if (sortField) {
        orderClause = ` ORDER BY ${sortField} ${sortDir || "ASC"}`;
      }
    }

    const query = `
      SELECT *
      FROM production.variants_hg19
      WHERE chromosome = {chromosome:String}
        AND position BETWEEN {start_position:UInt32} AND {end_position:UInt32}
        AND rsid != '' AND rsid IS NOT NULL
        ${variantTypeFilter}
        ${filterClause}
      ${orderClause}
      LIMIT {limit:UInt32}
      ${offset > 0 ? "OFFSET {offset:UInt32}" : ""}
    `;

    if (offset > 0) {
      queryParams.offset = offset;
    }
    queryParams.limit = limit;

    console.log("Final query:", query);
    console.log("Query params:", queryParams);

    const data = await clickHouseClient.query({
      query,
      query_params: queryParams,
      format: "JSONEachRow",
    });

    console.log("Query returned", data.length, "results");

    return {
      data,
      hasNextPage: data.length === limit,
      nextCursor: data.length === limit ? String(offset + limit) : undefined,
    };
  } catch (error) {
    console.error("Error fetching HG19 gene variants from ClickHouse:", error);
    throw error;
  }
}

export async function fetchHg19GeneSummary(
  geneName: string,
  subcategory?: string,
) {
  try {
    // Step 1: Get gene coordinates
    const geneQuery = `
      SELECT chromosome, start_position, end_position
      FROM production.gene_loci
      WHERE gene_name = {geneName:String}
      LIMIT 1
    `;

    const geneResult = await clickHouseClient.query({
      query: geneQuery,
      query_params: { geneName },
      format: "JSONEachRow",
    });

    if (!geneResult.length) {
      return [];
    }

    const { chromosome, start_position, end_position } = geneResult[0];

    // Step 2: Build variant type filter if subcategory specified
    let variantTypeFilter = "";
    if (subcategory === "SNV-summary") {
      variantTypeFilter = "AND length(ref) = 1 AND length(alt) = 1";
    } else if (subcategory === "InDel-summary") {
      variantTypeFilter = "AND (length(ref) > 1 OR length(alt) > 1)";
    }

    // Step 3: Query summary in the gene region
    const query = `
      SELECT 
        gencode_category,
        COUNT(*) as count
      FROM production.variants_hg19
      WHERE chromosome = {chromosome:String}
        AND position BETWEEN {start_position:UInt32} AND {end_position:UInt32}
        AND rsid != '' AND rsid IS NOT NULL
        ${variantTypeFilter}
      GROUP BY gencode_category
    `;

    const data = await clickHouseClient.query({
      query,
      query_params: { chromosome, start_position, end_position },
      format: "JSONEachRow",
    });

    return data;
  } catch (error) {
    console.error("Error fetching HG19 gene summary from ClickHouse:", error);
    throw error;
  }
}
