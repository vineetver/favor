import type { Gene } from "../types";

const GENE_TABLE_URLS: {
  [category: string]: (geneName: string) => string;
} = {
  "SNV-table": (geneName) => `https://api.genohub.org/v1/genes/${geneName}/snv`,
  "InDel-table": (geneName) =>
    `https://api.genohub.org/v1/genes/${geneName}/indel`,
};

export async function fetchGeneTableData(
  geneName: string,
  {
    filtersQuery,
    sortingQuery,
    subcategory,
    numericFilters,
    pageSize,
    cursor,
  }: {
    filtersQuery?: string;
    sortingQuery?: string;
    subcategory: string;
    numericFilters?: {
      operator: "gt" | "lt" | "eq";
      value: string;
      field: string;
    }[];
    pageSize?: number;
    cursor?: string;
  },
): Promise<{ data: Gene[]; hasNextPage: boolean; nextCursor?: string }> {
  const baseUrl = GENE_TABLE_URLS[subcategory];
  if (!baseUrl) {
    throw new Error(`Unknown subcategory: ${subcategory}`);
  }

  const params = new URLSearchParams();

  if (pageSize) {
    params.set("limit", String(pageSize + 1));
  }
  if (cursor) {
    params.set("cursor", cursor);
  }

  if (filtersQuery) {
    const filterParams = new URLSearchParams(filtersQuery);
    filterParams.forEach((value, key) => {
      params.append(key, value);
    });
  }

  if (sortingQuery) {
    const sortingParams = new URLSearchParams(sortingQuery);
    sortingParams.forEach((value, key) => {
      params.append(key, value);
    });
  }

  if (numericFilters) {
    for (const filter of numericFilters) {
      params.append(`${filter.field}[${filter.operator}]`, filter.value);
    }
  }

  const url = `${baseUrl(geneName)}?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return { data: [], hasNextPage: false };
      }
      throw new Error(`Failed to fetch gene table data: ${response.statusText}`);
    }

    const responseData = await response.json();
    const rows = responseData.data as Gene[];
    const hasNextPage = pageSize ? rows.length > pageSize : false;
    const data = pageSize ? rows.slice(0, pageSize) : rows;
    const nextCursor = hasNextPage
      ? data[data.length - 1].variant_vcf
      : undefined;

    return { data, hasNextPage, nextCursor };
  } catch (error) {
    console.error("Error fetching gene table data:", error);
    throw error;
  }
}