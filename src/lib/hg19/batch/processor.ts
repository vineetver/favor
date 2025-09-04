import { BatchVariantInput, BatchProcessingResult } from './types';
import { VariantHg19 } from '../variant/types';
import { clickHouseClient } from '@/lib/clickhouse/client';

export async function processBatchAnnotation(
  variants: BatchVariantInput[],
  sampleId: string
): Promise<BatchProcessingResult & { annotatedData: (VariantHg19 & { sample_id: string })[] }> {
  const startTime = Date.now();
  
  try {
    // Create temporary Join table for efficient batch processing
    const tempTableName = `batch_temp_${sampleId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    
    await createTempJoinTable(tempTableName, variants);
    
    // Perform efficient join query
    const annotatedVariants = await performBatchJoin(tempTableName);
    
    // Clean up temporary table
    await dropTempTable(tempTableName);
    
    const processingTime = Date.now() - startTime;
    
    return {
      sampleId,
      totalVariants: variants.length,
      annotatedVariants: annotatedVariants.length,
      processingTimeMs: processingTime,
      annotatedData: annotatedVariants
    };
    
  } catch (error) {
    console.error('Batch processing error:', error);
    throw error;
  }
}

async function createTempJoinTable(tableName: string, variants: BatchVariantInput[]): Promise<void> {
  // Create temporary Join table - optimized for memory-based joins
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      variant_vcf String,
      sample_id String
    ) ENGINE = Memory
  `;
  
  await clickHouseClient.query({
    query: createTableQuery,
    format: 'JSONEachRow'
  });
  
  // Batch insert variants
  if (variants.length === 0) return;
  
  const batchSize = 1000;
  for (let i = 0; i < variants.length; i += batchSize) {
    const batch = variants.slice(i, i + batchSize);
    const values = batch.map(v => ({
      variant_vcf: `${v.chromosome}-${v.position}-${v.ref}-${v.alt}`,
      sample_id: v.sampleId
    }));
    
    const insertQuery = `
      INSERT INTO ${tableName} 
      VALUES ${values.map(v => `('${v.variant_vcf}', '${v.sample_id}')`).join(', ')}
    `;
    
    await clickHouseClient.query({
      query: insertQuery,
      format: 'JSONEachRow'
    });
  }
}

async function performBatchJoin(tempTableName: string): Promise<(VariantHg19 & { sample_id: string })[]> {
  // Efficient join leveraging ClickHouse's optimizations
  const joinQuery = `
    SELECT 
      v.*,
      t.sample_id
    FROM production.variants_hg19 v
    INNER JOIN ${tempTableName} t ON v.variant_vcf = t.variant_vcf
    ORDER BY v.chromosome, v.position
  `;
  
  return await clickHouseClient.query<VariantHg19 & { sample_id: string }>({
    query: joinQuery,
    format: 'JSONEachRow'
  });
}

async function dropTempTable(tableName: string): Promise<void> {
  try {
    await clickHouseClient.query({
      query: `DROP TABLE IF EXISTS ${tableName}`,
      format: 'JSONEachRow'
    });
  } catch (error) {
    console.warn('Failed to drop temp table:', tableName, error);
  }
}

export async function formatBatchResults(
  variants: (VariantHg19 & { sample_id: string })[],
  format: 'csv' | 'json' | 'tsv'
): Promise<string> {
  if (format === 'json') {
    return JSON.stringify(variants, null, 2);
  }
  
  if (variants.length === 0) {
    return format === 'csv' ? '' : '';
  }
  
  const headers = Object.keys(variants[0]);
  const separator = format === 'csv' ? ',' : '\t';
  
  const headerRow = headers.join(separator);
  const dataRows = variants.map(variant => 
    headers.map(header => {
      const value = variant[header as keyof typeof variant];
      return typeof value === 'string' && value.includes(separator) 
        ? `"${value}"` 
        : String(value ?? '');
    }).join(separator)
  );
  
  return [headerRow, ...dataRows].join('\n');
}