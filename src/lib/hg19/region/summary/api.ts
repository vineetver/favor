import type { Hg19RegionSummary, Hg19Summary } from "./columns";
import { clickHouseClient } from "@/lib/clickhouse/client";

export async function fetchHg19RegionSummary(
  region: string,
  categorySlug?: string,
): Promise<Hg19RegionSummary | null> {
  try {
    const [chr, start, end] = region.split("-");
    const query = `
      SELECT 
        count() as total,
        countIf(length(ref) = 1 AND length(alt) = 1) as snv,
        countIf(length(ref) > 1 OR length(alt) > 1) as indel,
        countIf(rsid != '' AND rsid IS NOT NULL) as hasRsid,
        countIf(gencode_category = 'exonic') as exonic,
        countIf(gencode_category = 'UTR') as utr,
        countIf(gencode_category = 'ncRNA') as ncrna,
        countIf(gencode_category = 'intronic') as intronic,
        countIf(gencode_category = 'downstream') as downstream,
        countIf(gencode_category = 'intergenic') as intergenic,
        countIf(gencode_category = 'upstream') as upstream,
        countIf(gencode_category = 'splicing') as splicing,
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
      WHERE chromosome = {chr:String}
        AND position BETWEEN {start:UInt32} AND {end:UInt32}
        AND rsid != '' AND rsid IS NOT NULL
        ${categorySlug === "SNV-summary" ? "AND length(ref) = 1 AND length(alt) = 1" : ""}
        ${categorySlug === "InDel-summary" ? "AND (length(ref) > 1 OR length(alt) > 1)" : ""}
    `;

    const result = await clickHouseClient.query({
      query,
      query_params: { chr, start, end },
    });

    if (result.length === 0) {
      return null;
    }

    const rawResult = result[0];

    const convertedResult: any = {};
    for (const [key, value] of Object.entries(rawResult)) {
      convertedResult[key] =
        typeof value === "string" && !isNaN(Number(value))
          ? Number(value)
          : value;
    }

    return convertedResult as Hg19RegionSummary;
  } catch (error) {
    console.error("Error fetching HG19 region summary from ClickHouse:", error);
    return null;
  }
}

export function getHg19SummaryByCategory(
  regionSummary: Hg19RegionSummary,
  categorySlug: string,
): Hg19Summary {
  return regionSummary;
}
