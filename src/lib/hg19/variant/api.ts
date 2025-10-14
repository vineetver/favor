import type { VariantHg19 } from "./types";
import { clickHouseClient } from "@/lib/clickhouse/client";
import { addSyntheticApcFields } from "./utils";

export async function fetchHg19Variant(
  vcf: string,
): Promise<VariantHg19 | null> {
  try {
    const [chromosome, positionStr, ref, alt] = vcf.split("-");
    const position = parseInt(positionStr);

    if (!chromosome || !position || !ref || !alt) {
      throw new Error("Invalid VCF format");
    }

    const query = `
      SELECT *, chromosome, position
      FROM production.variants_hg19
      WHERE chromosome = {chromosome:String}
        AND position BETWEEN {position:UInt32} AND {position:UInt32}
        AND variant_vcf = {vcf:String}
      LIMIT 1
    `;

    const rows = await clickHouseClient.query<any>({
      query,
      query_params: {
        chromosome,
        position,
        vcf,
      },
    });

    if (!rows || rows.length === 0) return null;

    return await addSyntheticApcFields(rows[0]);
  } catch (error) {
    console.error("Error fetching HG19 variant from ClickHouse:", error);
    return null;
  }
}
