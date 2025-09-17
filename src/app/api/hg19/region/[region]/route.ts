import { NextRequest, NextResponse } from "next/server";
import { fetchHg19RegionVariants } from "@/lib/hg19/region/api";

interface RouteParams {
  params: {
    region: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { region } = params;
  const { searchParams } = new URL(request.url);

  const subcategory = searchParams.get("subcategory") || "SNV-table";
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const sort = searchParams.get("sort");
  const sortDir = (searchParams.get("sortDir") || "asc") as "asc" | "desc";
  const filters = searchParams.get("filters");

  if (!region) {
    return NextResponse.json(
      { error: "Region parameter is required" },
      { status: 400 },
    );
  }

  try {
    const parsedFilters = filters ? JSON.parse(filters) : undefined;

    const result = await fetchHg19RegionVariants({
      region,
      subcategory,
      limit,
      offset,
      sort: sort || undefined,
      sortDir,
      filters: parsedFilters,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching HG19 region variants:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
