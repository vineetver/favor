import { NextRequest } from "next/server";
import { fetchHg19RegionVariants } from "@/lib/hg19/region/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { region: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filtersQuery = searchParams.get("filtersQuery") || "";
    const sortingQuery = searchParams.get("sortingQuery") || "";
    const subcategory = searchParams.get("subcategory") || "";
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const cursor = searchParams.get("cursor") || "";

    // Parse filters if provided
    const filters: Record<string, any> = {};
    if (filtersQuery) {
      const pairs = filtersQuery.split(",");
      pairs.forEach((pair) => {
        const [key, value] = pair.split(":");
        if (key && value && value !== "all") {
          filters[key] = value;
        }
      });
    }

    // Parse sorting if provided
    let sort: string | undefined;
    let sortDir: "asc" | "desc" = "asc";
    if (sortingQuery) {
      const [sortField, direction] = sortingQuery.split(":");
      if (sortField) {
        sort = sortField;
        sortDir = direction === "desc" ? "desc" : "asc";
      }
    }

    const offset = cursor ? parseInt(cursor) : 0;

    const data = await fetchHg19RegionVariants({
      region: params.region,
      subcategory,
      limit: pageSize,
      offset,
      sort,
      sortDir,
      filters,
    });

    return Response.json(data);
  } catch (error) {
    console.error("Error fetching hg19 region variants:", error);
    return Response.json(
      { error: "Failed to fetch hg19 region variants" },
      { status: 500 },
    );
  }
}
