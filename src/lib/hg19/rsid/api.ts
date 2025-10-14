import type { VariantHg19 } from "../variant/types";
import { clickHouseClient } from "@/lib/clickhouse/client";
import { addSyntheticApcFields } from "../variant/utils";

export async function fetchHg19VariantByRsid(
  rsid: string,
): Promise<VariantHg19 | null> {
  try {
    const query = `
      WITH
        (SELECT chromosome  FROM production.rsid_lookup WHERE rsid = {rsid:String} LIMIT 1) AS chr_,
        (SELECT position    FROM production.rsid_lookup WHERE rsid = {rsid:String} LIMIT 1) AS pos_,
        (SELECT variant_vcf FROM production.rsid_lookup WHERE rsid = {rsid:String} LIMIT 1) AS vcf_
      SELECT *, chromosome, position
      FROM production.variants_hg19
      WHERE chromosome = chr_
        AND position BETWEEN pos_ AND pos_
        AND variant_vcf = vcf_
      LIMIT 1
    `;

    const rows = await clickHouseClient.query<any>({
      query,
      query_params: { rsid },
    });

    if (!rows || rows.length === 0) return null;

    return await addSyntheticApcFields(rows[0]);
  } catch (error) {
    console.error(
      "Error fetching HG19 variant by rsID from ClickHouse:",
      error,
    );
    return null;
  }
}

export async function fetchHg19VariantsByRsid(
  rsid: string,
): Promise<VariantHg19[]> {
  try {
    const lookupQuery = `
      SELECT variant_vcf, chromosome, position
      FROM production.rsid_lookup
      WHERE rsid = {rsid:String}
      ORDER BY chromosome, position
    `;

    const lookupRows = await clickHouseClient.query<{
      variant_vcf: string;
      chromosome: string;
      position: number;
    }>({
      query: lookupQuery,
      query_params: { rsid },
    });

    if (!lookupRows || lookupRows.length === 0) {
      return [];
    }

    const variants: VariantHg19[] = [];

    for (const lookup of lookupRows) {
      const variantQuery = `
        SELECT *, chromosome, position
        FROM production.variants_hg19
        WHERE chromosome = {chromosome:String}
          AND position BETWEEN {position:UInt32} AND {position:UInt32}
          AND variant_vcf = {variant_vcf:String}
        LIMIT 1
      `;

      const variantRows = await clickHouseClient.query<any>({
        query: variantQuery,
        query_params: {
          chromosome: lookup.chromosome,
          position: lookup.position,
          variant_vcf: lookup.variant_vcf,
        },
      });

      if (variantRows && variantRows.length > 0) {
        const variantWithSynthetic = await addSyntheticApcFields(variantRows[0]);
        variants.push(variantWithSynthetic);
      }
    }

    return variants;
  } catch (error) {
    console.error("Error fetching HG19 variants by rsID:", error);
    return [];
  }
}
