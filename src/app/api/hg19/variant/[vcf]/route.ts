import { NextRequest, NextResponse } from "next/server";
import type { VariantHg19 } from "@/lib/hg19/variant/types";
import { clickHouseClient } from "@/lib/clickhouse/client";

interface RouteParams {
  params: {
    vcf: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { vcf } = params;

  if (!vcf) {
    return NextResponse.json(
      { error: "VCF parameter is required" },
      { status: 400 },
    );
  }

  try {
    const variant = await fetchHg19Variant(vcf);

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    return NextResponse.json(variant);
  } catch (error) {
    console.error("Error fetching HG19 variant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function fetchHg19Variant(vcf: string): Promise<VariantHg19 | null> {
  try {
    // Parse VCF format: chr-pos-ref-alt
    const [chromosome, positionStr, ref, alt] = vcf.split("-");
    const position = parseInt(positionStr);

    if (!chromosome || !position || !ref || !alt) {
      throw new Error("Invalid VCF format");
    }

    const query = `
      SELECT *
      FROM production.variants_hg19
      WHERE chromosome = {chromosome:String}
        AND position BETWEEN {position:UInt32} AND {position:UInt32}
        AND variant_vcf = {vcf:String}
      LIMIT 1
    `;

    const rows = await clickHouseClient.query<VariantHg19>({
      query,
      query_params: {
        chromosome,
        position,
        vcf,
      },
    });

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error fetching HG19 variant from ClickHouse:", error);
    return null;
  }
}
