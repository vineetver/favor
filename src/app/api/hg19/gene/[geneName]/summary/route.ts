import { NextRequest, NextResponse } from "next/server";
import { fetchHg19GeneSummary } from "@/lib/hg19/gene/summary/api";

interface RouteParams {
  params: {
    geneName: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { geneName } = params;
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");

  if (!geneName) {
    return NextResponse.json(
      { error: "Gene name parameter is required" },
      { status: 400 },
    );
  }

  try {
    const summary = await fetchHg19GeneSummary(
      geneName,
      categorySlug || undefined,
    );
    if (!summary) {
      return NextResponse.json(
        { error: "Gene summary not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching HG19 gene summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
