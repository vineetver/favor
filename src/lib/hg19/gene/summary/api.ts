import type { Hg19GeneSummary, Hg19Summary } from "./columns";
import { clickHouseClient } from "@/lib/clickhouse/client";

export async function fetchHg19GeneSummary(
  geneName: string,
  categorySlug?: string,
): Promise<Hg19GeneSummary | null> {
  try {
    const query = `
      WITH
        (SELECT chromosome FROM production.gene_loci WHERE gene_name = {geneName:String} LIMIT 1) AS chr_,
        (SELECT start_position FROM production.gene_loci WHERE gene_name = {geneName:String} LIMIT 1) AS start_,
        (SELECT end_position FROM production.gene_loci WHERE gene_name = {geneName:String} LIMIT 1) AS end_
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
      WHERE chromosome = chr_
        AND position BETWEEN start_ AND end_
        AND rsid != '' AND rsid IS NOT NULL
        ${categorySlug === "SNV-summary" ? "AND length(ref) = 1 AND length(alt) = 1" : ""}
        ${categorySlug === "InDel-summary" ? "AND (length(ref) > 1 OR length(alt) > 1)" : ""}
    `;

    const result = await clickHouseClient.query({
      query,
      query_params: { geneName },
    });

    if (result.length === 0) {
      return null;
    }

    const rawResult = result[0];

    // Convert string values to numbers for proper calculations
    const convertedResult: any = {};
    for (const [key, value] of Object.entries(rawResult)) {
      convertedResult[key] =
        typeof value === "string" && !isNaN(Number(value))
          ? Number(value)
          : value;
    }

    return convertedResult as Hg19GeneSummary;
  } catch (error) {
    console.error("Error fetching HG19 gene summary from ClickHouse:", error);
    return null;
  }
}

export function getHg19SummaryByCategory(
  geneSummary: Hg19GeneSummary,
  categorySlug: string,
): Hg19Summary {
  // For HG19, we'll return the entire summary data
  // The filtering will be done by column groups in the component
  return geneSummary;
}
