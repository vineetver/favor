import { NextRequest, NextResponse } from "next/server";
import { fetchHg19VariantsByRsid } from "@/lib/hg19/rsid/api";

interface RouteParams {
  params: {
    rsid: string;
  };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { rsid } = params;

  if (!rsid) {
    return NextResponse.json(
      { error: "rsID parameter is required" },
      { status: 400 },
    );
  }

  if (!rsid.startsWith("rs")) {
    return NextResponse.json(
      { error: 'Invalid rsID format. Must start with "rs"' },
      { status: 400 },
    );
  }

  try {
    const variants = await fetchHg19VariantsByRsid(rsid);

    if (!variants || variants.length === 0) {
      return NextResponse.json(
        { error: "No variants found for this rsID" },
        { status: 404 },
      );
    }

    return NextResponse.json(variants);
  } catch (error) {
    console.error("Error fetching HG19 variants by rsID:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
