import type { GeneLevelAnnotation, GeneSummary, Summary, Gene } from "./types";

export const GENE_ANNOTATION_URL = "https://api.genohub.org/v1/annotations";
export const GENE_SUMMARY_URLS = (geneName: string) =>
  `https://api.genohub.org/v1/genes/${geneName}/summary`;

export async function fetchGeneAnnotation(
  geneName: string,
): Promise<GeneLevelAnnotation | null> {
  try {
    const response = await fetch(`${GENE_ANNOTATION_URL}/${geneName}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch gene annotation: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data as GeneLevelAnnotation;
  } catch (error) {
    console.error("Error fetching gene annotation:", error);
    return null;
  }
}

export async function fetchGeneSummary(
  geneName: string,
): Promise<GeneSummary | null> {
  try {
    const response = await fetch(GENE_SUMMARY_URLS(geneName));

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch gene summary: ${response.statusText}`);
    }

    const data = await response.json();
    return data as GeneSummary;
  } catch (error) {
    console.error("Error fetching gene summary:", error);
    return null;
  }
}

export function getSummaryByCategory(
  geneSummary: GeneSummary,
  categorySlug: string,
): Summary {
  if (categorySlug === "SNV-summary") {
    return geneSummary.snv_summary;
  }

  if (categorySlug === "InDel-summary") {
    return geneSummary.indel_summary;
  }

  return geneSummary.total_summary;
}

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
