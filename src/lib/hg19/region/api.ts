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
  const searchParams = new URLSearchParams({
    subcategory,
    limit: limit.toString(),
    offset: offset.toString(),
    sortDir,
  });

  if (sort) {
    searchParams.set('sort', sort);
  }

  if (filters) {
    searchParams.set('filters', JSON.stringify(filters));
  }

  const response = await fetch(`/api/hg19/region/${region}?${searchParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch region variants: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchHg19RegionSummary(region: string, subcategory?: string) {
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