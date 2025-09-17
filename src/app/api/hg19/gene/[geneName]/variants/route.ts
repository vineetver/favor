import { NextRequest } from "next/server";
import { fetchHg19GeneVariants } from "@/lib/hg19/gene/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { geneName: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filtersQuery = searchParams.get("filtersQuery") || "";
    const sortingQuery = searchParams.get("sortingQuery") || "";
    const subcategory = searchParams.get("subcategory") || "";
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const cursor = searchParams.get("cursor") || "";

    const data = await fetchHg19GeneVariants(params.geneName, {
      filtersQuery,
      sortingQuery,
      subcategory,
      pageSize,
      cursor,
    });

    return Response.json(data);
  } catch (error) {
    console.error("Error fetching hg19 gene variants:", error);
    return Response.json(
      { error: "Failed to fetch hg19 gene variants" },
      { status: 500 },
    );
  }
}
