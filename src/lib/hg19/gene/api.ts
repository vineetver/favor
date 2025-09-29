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
    includeSummary?: boolean;
  },
): Promise<Hg19GeneVariantsResponse> {
  try {
    const {
      subcategory = "SNV-table",
      pageSize = 50,
      cursor = "",
      filtersQuery,
      sortingQuery,
      includeSummary = false,
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

    if (!geneResult.length) {
      console.log("No gene found in gene_loci for:", geneName);
      return {
        data: [],
        hasNextPage: false,
        nextCursor: undefined,
      };
    }

    const { chromosome, start_position, end_position } = geneResult[0];

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
          // Special handling for gencode_category with pattern matching
          if (key === "gencode_category") {
            // Map summary field names to ILIKE patterns
            const patterns: Record<string, string> = {
              "exonic": "%exonic%",
              "utr": "%UTR%",
              "ncrna": "%ncRNA_%",
              "intronic": "%intronic%",
              "downstream": "%downstream%",
              "intergenic": "%intergenic%",
              "upstream": "%upstream%",
              "splicing": "%splicing%"
            };

            const pattern = patterns[value];
            if (pattern) {
              filterConditions.push(`${key} ILIKE {${key}_pattern:String}`);
              queryParams[`${key}_pattern`] = pattern;
            }
          } else {
            // Regular exact match for other columns
            filterConditions.push(`${key} = {${key}:String}`);
            queryParams[key] = value;
          }
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

    const baseWhereClause = `
      WHERE chromosome = {chromosome:String}
        AND position BETWEEN {start_position:UInt32} AND {end_position:UInt32}
        AND rsid != '' AND rsid IS NOT NULL
        ${variantTypeFilter}
        ${filterClause}
    `;

    const query = `
      SELECT *
      FROM production.variants_hg19
      ${baseWhereClause}
      ${orderClause}
      LIMIT {limit:UInt32}
      ${offset > 0 ? "OFFSET {offset:UInt32}" : ""}
    `;

    if (offset > 0) {
      queryParams.offset = offset;
    }
    queryParams.limit = limit;


    const data = await clickHouseClient.query({
      query,
      query_params: queryParams,
      format: "JSONEachRow",
    });

    let summary;
    if (includeSummary) {
      // Get filtered summary with the same filters applied
      const summaryQuery = `
        SELECT
          count() as total,
          countIf(length(ref) = 1 AND length(alt) = 1) as snv,
          countIf(length(ref) > 1 OR length(alt) > 1) as indel,
          countIf(rsid != '' AND rsid IS NOT NULL) as hasRsid,
          countIf(gencode_category ILIKE '%exonic%') as exonic,
          countIf(gencode_category ILIKE '%UTR%') as utr,
          countIf(gencode_category ILIKE '%ncRNA_%') as ncrna,
          countIf(gencode_category ILIKE '%intronic%') as intronic,
          countIf(gencode_category ILIKE '%downstream%') as downstream,
          countIf(gencode_category ILIKE '%intergenic%') as intergenic,
          countIf(gencode_category ILIKE '%upstream%') as upstream,
          countIf(gencode_category ILIKE '%splicing%') as splicing,
          countIf(clnsig ILIKE '%drug response%') as drugresponse,
          countIf(clnsig ILIKE '%pathogenic%' AND clnsig NOT ILIKE '%likely%' AND clnsig NOT ILIKE '%conflicting%') as pathogenic,
          countIf(clnsig ILIKE '%likely pathogenic%') as likelypathogenic,
          countIf(clnsig ILIKE '%benign%' AND clnsig NOT ILIKE '%likely%') as benign,
          countIf(clnsig ILIKE '%likely benign%') as likelybenign,
          countIf(clnsig ILIKE '%uncertain%' OR clnsig ILIKE '%unknown%') as unknown,
          countIf(clnsig ILIKE '%conflicting%') as conflicting,
          countIf(gencode_exonic_category ILIKE '%stopgain%' OR gencode_exonic_category ILIKE '%stoploss%' OR gencode_exonic_category ILIKE '%frameshift%') as plof,
          countIf(gencode_exonic_category ILIKE '%nonsynonymous%' OR gencode_exonic_category ILIKE '%missense%') as nonsynonymous,
          countIf(gencode_exonic_category ILIKE '%synonymous%') as synonymous,
          countIf(sift_cat ILIKE '%deleterious%') as deleterious,
          countIf(sift_cat ILIKE '%tolerated%') as tolerated,
          countIf(gencode_exonic_category = 'stopgain') as stopgain,
          countIf(gencode_exonic_category = 'stoploss') as stoploss,
          countIf(gencode_exonic_category ILIKE '%frameshift deletion%') as frameshift_deletion,
          countIf(gencode_exonic_category ILIKE '%frameshift insertion%') as frameshift_insertion,
          countIf(gencode_exonic_category ILIKE '%nonframeshift deletion%') as nonframeshift_deletion,
          countIf(gencode_exonic_category ILIKE '%nonframeshift insertion%') as nonframeshift_insertion,
          countIf(gencode_exonic_category ILIKE '%nonsynonymous SNV%') as nonsynonymous_snv,
          countIf(gencode_exonic_category ILIKE '%synonymous SNV%') as synonymous_snv,
          countIf(gencode_exonic_category = 'unknown') as unknown_exonic,
          countIf(polyphen2_hdiv_pred ILIKE '%probably_damaging%' OR polyphen2_hvar_pred ILIKE '%probably_damaging%') as damaging,
          countIf(tg_all > 0.01) as common,
          countIf(apc_protein_function_v3 >= 10) as apcProteinFunction,
          countIf(apc_conservation_v2 >= 10) as apcConservation,
          countIf(apc_epigenetics >= 10) as apcEpigeneticsActive,
          countIf(apc_proximity_to_tss_tes_scaled_phred_score >= 10) as apcProximityToTssTes,
          countIf(mutation_density_apc_scaled_phred_score >= 10) as apcMutationDensity,
          countIf(apc_transcription_factor >= 10) as apcTranscriptionFactor,
          countIf(cadd_phred >= 10) as caddPhred
        FROM production.variants_hg19
        ${baseWhereClause}
      `;

      const summaryParams = { ...queryParams };
      delete summaryParams.limit;
      delete summaryParams.offset;

      const summaryResult = await clickHouseClient.query({
        query: summaryQuery,
        query_params: summaryParams,
        format: "JSONEachRow",
      });

      if (summaryResult.length > 0) {
        const rawResult = summaryResult[0];
        summary = {} as Record<string, number>;
        for (const [key, value] of Object.entries(rawResult)) {
          summary[key] = typeof value === "string" && !isNaN(Number(value))
            ? Number(value)
            : value as number;
        }
      }
    }

    return {
      data,
      hasNextPage: data.length === limit,
      nextCursor: data.length === limit ? String(offset + limit) : undefined,
      summary,
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
