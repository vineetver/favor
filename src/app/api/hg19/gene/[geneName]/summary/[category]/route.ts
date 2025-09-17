import { NextRequest } from "next/server";
import { fetchHg19GeneSummary } from "@/lib/hg19/gene/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { geneName: string; category: string } },
) {
  try {
    const data = await fetchHg19GeneSummary(params.geneName, params.category);
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching hg19 gene summary by category:", error);
    return Response.json(
      { error: "Failed to fetch hg19 gene summary by category" },
      { status: 500 },
    );
  }
}
