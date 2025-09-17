import { NextRequest, NextResponse } from "next/server";
import { fetchHg19GeneVariants } from "@/lib/hg19/gene/api";

interface RouteParams {
  params: {
    geneName: string;
  };
}

interface QueryParams {
  subcategory?: string;
  limit?: string;
  offset?: string;
  sort?: string;
  sortDir?: string;
  filters?: string;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { geneName } = params;
  const { searchParams } = new URL(request.url);

  const queryParams: QueryParams = {
    subcategory: searchParams.get("subcategory") || "SNV-table",
    limit: searchParams.get("limit") || "50",
    offset: searchParams.get("offset") || "0",
    sort: searchParams.get("sort") || undefined,
    sortDir: searchParams.get("sortDir") || "asc",
    filters: searchParams.get("filters") || undefined,
  };

  if (!geneName) {
    return NextResponse.json(
      { error: "Gene name parameter is required" },
      { status: 400 },
    );
  }

  try {
    const data = await fetchHg19GeneVariants(geneName, {
      filtersQuery: queryParams.filters,
      sortingQuery: queryParams.sort
        ? `${queryParams.sort}:${queryParams.sortDir}`
        : undefined,
      subcategory: queryParams.subcategory,
      pageSize: parseInt(queryParams.limit || "50"),
      cursor: queryParams.offset,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching HG19 gene variants:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
