export type { GeneLevelAnnotation as RegionAnnotation, GeneSummary as RegionSummary, Summary, Gene as RegionVariant } from "@/lib/gene/types";

export const REGION_ANNOTATION_URL = "https://api.genohub.org/v1/annotations/regions";
export const COSMIC_REGION_URL = "https://api.genohub.org/v1/cosmic/regions";

const REGION_URL: {
  [category: string]: (region: string) => string;
} = {
  "SNV-table": (region) => `https://api.genohub.org/v1/regions/${region}/snv`,
  "InDel-table": (region) => `https://api.genohub.org/v1/regions/${region}/indel`,
  "SNV-summary": (region) => `https://api.genohub.org/v1/regions/${region}/summary/snv`,
  "InDel-summary": (region) => `https://api.genohub.org/v1/regions/${region}/summary/indel`,
};

export async function fetchRegionAnnotation(
  region: string,
): Promise<any | null> {
  try {
    const response = await fetch(`${REGION_ANNOTATION_URL}/${region}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch region annotation: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching region annotation:", error);
    return null;
  }
}

export async function fetchRegionSummary(
  region: string,
  category: string = "SNV-summary",
): Promise<any | null> {
  try {
    const baseUrl = REGION_URL[category];
    if (!baseUrl) {
      throw new Error(`Unknown category: ${category}`);
    }

    const response = await fetch(baseUrl(region));

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch region summary: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching region summary:", error);
    return null;
  }
}

export async function fetchCosmicByRegion(
  region: string,
): Promise<any[] | null> {
  try {
    const response = await fetch(`${COSMIC_REGION_URL}/${region}`);

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch COSMIC data: ${response.statusText}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching COSMIC data:", error);
    return null;
  }
}

export async function fetchRegionTableData(
  region: string,
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
): Promise<{ data: any[]; hasNextPage: boolean; nextCursor?: string }> {
  const baseUrl = REGION_URL[subcategory];
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

  const url = `${baseUrl(region)}?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return { data: [], hasNextPage: false };
      }
      throw new Error(`Failed to fetch region table data: ${response.statusText}`);
    }

    const responseData = await response.json();
    const rows = responseData.data as any[];
    const hasNextPage = pageSize ? rows.length > pageSize : false;
    const data = pageSize ? rows.slice(0, pageSize) : rows;
    const nextCursor = hasNextPage
      ? data[data.length - 1].variant_vcf
      : undefined;

    return { data, hasNextPage, nextCursor };
  } catch (error) {
    console.error("Error fetching region table data:", error);
    throw error;
  }
}

// Reuse gene summary helper
export { getSummaryByCategory } from "@/lib/gene/api";