import type { VariantHg19 } from "./types";
import { clickHouseClient } from "@/lib/clickhouse/client";

export async function fetchHg19Variant(vcf: string): Promise<VariantHg19 | null> {
  try {
    // Parse VCF format: chr-pos-ref-alt
    const [chromosome, positionStr, ref, alt] = vcf.split('-');
    const position = parseInt(positionStr);

    if (!chromosome || !position || !ref || !alt) {
      throw new Error('Invalid VCF format');
    }

    const query = `
      SELECT *
      FROM production.variants_hg19
      WHERE chromosome = {chromosome:String}
        AND position BETWEEN {position:UInt32} AND {position:UInt32}
        AND variant_vcf = {vcf:String}
      LIMIT 1
    `;

    const rows = await clickHouseClient.query<VariantHg19>({
      query,
      query_params: { 
        chromosome,
        position,
        vcf 
      },
    });

    return rows && rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error fetching HG19 variant from ClickHouse:', error);
    return null;
  }
}