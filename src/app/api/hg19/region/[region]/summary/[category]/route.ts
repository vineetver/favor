import { NextRequest } from "next/server";
import { fetchHg19RegionSummary } from "@/lib/hg19/region/summary/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { region: string; category: string } },
) {
  try {
    const data = await fetchHg19RegionSummary(params.region, params.category);
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching hg19 region summary by category:", error);
    return Response.json(
      { error: "Failed to fetch hg19 region summary by category" },
      { status: 500 },
    );
  }
}
