import type { VariantHg19 } from "./types";
import { clickHouseClient } from '@/lib/clickhouse/client';

export interface VariantQueryOptions {
  chromosome: string;
  position?: number;
  startPosition?: number;
  endPosition?: number;
  limit?: number;
}

export async function queryHg19Variants(options: VariantQueryOptions): Promise<VariantHg19[]> {

  try {
    let query: string;
    let queryParams: Record<string, any>;

    if (options.position) {
      // Exact position query - leverages partition by chromosome and ordering
      query = `
        SELECT *
        FROM production.variants_hg19
        WHERE chromosome = {chromosome:String}
          AND position = {position:UInt32}
        LIMIT {limit:UInt32}
      `;
      queryParams = {
        chromosome: options.chromosome,
        position: options.position,
        limit: options.limit || 1000
      };
    } else if (options.startPosition && options.endPosition) {
      // Range query - optimal for genomic regions
      query = `
        SELECT *
        FROM production.variants_hg19
        WHERE chromosome = {chromosome:String}
          AND position BETWEEN {startPosition:UInt32} AND {endPosition:UInt32}
        ORDER BY position
        LIMIT {limit:UInt32}
      `;
      queryParams = {
        chromosome: options.chromosome,
        startPosition: options.startPosition,
        endPosition: options.endPosition,
        limit: options.limit || 1000
      };
    } else {
      throw new Error('Must provide either exact position or position range');
    }

    const data = await clickHouseClient.query<VariantHg19>({
      query,
      query_params: queryParams,
      format: 'JSONEachRow',
    });
    if (!Array.isArray(data)) return []
    if (data.length === 0) return []
    
    // Handle nested arrays by flattening
    if (Array.isArray(data[0])) {
      return (data as VariantHg19[][]).flat()
    }
    
    return data as unknown as VariantHg19[];
  } catch (error) {
    console.error('Error querying HG19 variants from ClickHouse:', error);
    return [];
  }
}

export async function explainHg19Query(vcf: string): Promise<void> {

  try {
    const [chromosome, positionStr] = vcf.split('-');
    const position = parseInt(positionStr);

    const explainQuery = `
      EXPLAIN indexes = 1
      SELECT *
      FROM production.variants_hg19
      WHERE chromosome = {chromosome:String}
        AND position BETWEEN {position:UInt32} AND {position:UInt32}
        AND variant_vcf = {vcf:String}
      LIMIT 1
    `;

    const result = await clickHouseClient.query({
      query: explainQuery,
      query_params: { 
        chromosome,
        position,
        vcf 
      },
      format: 'JSONEachRow',
    });

    const explanation = JSON.stringify(result);
    console.log('Query Plan:', explanation);
  } catch (error) {
    console.error('Error explaining query:', error);
  }
}