import { NextRequest, NextResponse } from "next/server";
import { fetchMappabilityData } from "@/lib/hg19/mappability/api";

interface RouteParams {
  params: Promise<{
    region: string;
  }>;
}

export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  const { region } = params;
  const { searchParams } = new URL(request.url);

  const kmer = searchParams.get("kmer") || "k24";
  const type = (searchParams.get("type") || "bismap") as "bismap" | "umap";
  const binSize = parseInt(searchParams.get("binSize") || "1000");

  if (!region) {
    return NextResponse.json(
      { error: "Region parameter is required" },
      { status: 400 },
    );
  }

  try {
    const data = await fetchMappabilityData({
      region,
      kmer,
      type,
      binSize,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching mappability data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
