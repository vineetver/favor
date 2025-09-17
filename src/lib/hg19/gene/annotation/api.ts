import { clickHouseClient } from "@/lib/clickhouse/client";

export interface Hg19GeneAnnotation {
  gene_name: string;
  chromosome: string;
  start_position: number;
  end_position: number;
  gene_id?: string;
  description?: string;
}

export async function fetchHg19GeneAnnotation(
  geneName: string,
): Promise<Hg19GeneAnnotation | null> {
  try {
    const query = `
      SELECT 
        gene_name,
        chromosome,
        start_position,
        end_position
      FROM production.gene_loci
      WHERE gene_name = {geneName:String}
      LIMIT 1
    `;

    const result = await clickHouseClient.query({
      query,
      query_params: { geneName },
    });

    if (result.length === 0) {
      return null;
    }

    return result[0] as Hg19GeneAnnotation;
  } catch (error) {
    console.error(
      "Error fetching HG19 gene annotation from ClickHouse:",
      error,
    );
    return null;
  }
}
