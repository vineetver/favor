import type { VariantHg19 } from "./types";

export interface VariantQueryOptions {
  chromosome: string;
  position?: number;
  startPosition?: number;
  endPosition?: number;
  limit?: number;
}

export async function queryHg19Variants(options: VariantQueryOptions): Promise<VariantHg19[]> {
  const { createClient } = await import('@clickhouse/client');
  
  const client = createClient({
    url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: process.env.CLICKHOUSE_DATABASE || 'production',
  });

  try {
    let query: string;
    let queryParams: Record<string, any>;

    if (options.position) {
      // Exact position query - leverages partition by chromosome and ordering
      query = `
        SELECT *
        FROM variants_hg19
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
        FROM variants_hg19
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

    const result = await client.query({
      query,
      query_params: queryParams,
      format: 'JSONEachRow',
    });

    return await result.json<VariantHg19[]>();
  } catch (error) {
    console.error('Error querying HG19 variants from ClickHouse:', error);
    return [];
  } finally {
    await client.close();
  }
}

export async function explainHg19Query(vcf: string): Promise<void> {
  const { createClient } = await import('@clickhouse/client');
  
  const client = createClient({
    url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: process.env.CLICKHOUSE_DATABASE || 'production',
  });

  try {
    const [chromosome, positionStr] = vcf.split('-');
    const position = parseInt(positionStr);

    const explainQuery = `
      EXPLAIN indexes = 1
      SELECT *
      FROM variants_hg19
      WHERE chromosome = {chromosome:String}
        AND position = {position:UInt32}
        AND variant_vcf = {vcf:String}
      LIMIT 1
    `;

    const result = await client.query({
      query: explainQuery,
      query_params: { 
        chromosome,
        position,
        vcf 
      },
      format: 'Pretty',
    });

    const explanation = await result.text();
    console.log('Query Plan:', explanation);
  } catch (error) {
    console.error('Error explaining query:', error);
  } finally {
    await client.close();
  }
}