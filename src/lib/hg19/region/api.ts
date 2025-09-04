import { clickHouseClient } from '@/lib/clickhouse/client';
import type { Hg19RegionVariantsResponse } from './types';

interface FetchRegionVariantsParams {
  region: string;
  subcategory?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export async function fetchHg19RegionVariants({
  region,
  subcategory = 'SNV-table',
  limit = 50,
  offset = 0,
  sort,
  sortDir = 'asc',
  filters,
}: FetchRegionVariantsParams): Promise<Hg19RegionVariantsResponse> {
  try {
    const [chr, start, end] = region.split('-');
    const startPos = Number(start);
    const endPos = Number(end);

    let variantTypeFilter = '';
    if (subcategory === 'SNV-table') {
      variantTypeFilter = 'AND length(ref) = 1 AND length(alt) = 1';
    } else if (subcategory === 'InDel-table') {
      variantTypeFilter = 'AND (length(ref) > 1 OR length(alt) > 1)';
    }

    let filterClause = '';
    const queryParams: Record<string, any> = {
      chr,
      start: startPos,
      end: endPos,
      limit,
    };

    if (offset > 0) {
      queryParams.offset = offset;
    }

    if (filters) {
      const filterConditions: string[] = [];
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          filterConditions.push(`${key} = {${key}:String}`);
          queryParams[key] = value;
        }
      });
      if (filterConditions.length > 0) {
        filterClause = ` AND ${filterConditions.join(' AND ')}`;
      }
    }

    let orderClause = '';
    if (sort) {
      orderClause = ` ORDER BY ${sort} ${sortDir.toUpperCase()}`;
    }

    const query = `
      SELECT *
      FROM production.variants_hg19
      WHERE chromosome = {chr:String}
        AND position BETWEEN {start:UInt32} AND {end:UInt32}
        AND rsid != '' AND rsid IS NOT NULL
        ${variantTypeFilter}
        ${filterClause}
      ${orderClause}
      LIMIT {limit:UInt32}
      ${offset > 0 ? 'OFFSET {offset:UInt32}' : ''}
    `;

    const data = await clickHouseClient.query({
      query,
      query_params: queryParams,
      format: 'JSONEachRow',
    });

    return {
      data,
      hasNextPage: data.length === limit,
      nextCursor: data.length === limit ? String(offset + limit) : undefined,
    };
  } catch (error) {
    console.error('Error fetching HG19 region variants from ClickHouse:', error);
    throw error;
  }
}

export async function fetchHg19RegionSummaryClient(region: string, subcategory?: string) {
  const searchParams = new URLSearchParams();
  
  if (subcategory) {
    searchParams.set('subcategory', subcategory);
  }

  const response = await fetch(`/api/hg19/region/${region}/summary?${searchParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch region summary: ${response.statusText}`);
  }

  return response.json();
}