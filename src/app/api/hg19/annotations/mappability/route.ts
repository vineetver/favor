import { NextRequest } from "next/server";
import { clickHouseClient } from "@/lib/clickhouse/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { positions } = body;

    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      return Response.json({ error: "Invalid positions array" }, { status: 400 });
    }

    const conditions = positions.map((pos: { chromosome: string; position: number }) =>
      `(chr = '${pos.chromosome}' AND ${pos.position} BETWEEN start AND end_pos)`
    ).join(' OR ');

    const query = `
      SELECT
        chr as chromosome,
        start,
        end_pos,
        mappability_k24_bismap,
        mappability_k36_bismap,
        mappability_k50_bismap,
        mappability_k100_bismap,
        mappability_k24_umap,
        mappability_k36_umap,
        mappability_k50_umap,
        mappability_k100_umap
      FROM production.mappability
      WHERE ${conditions}
    `;

    const data = await clickHouseClient.query({
      query,
      format: "JSONEachRow",
    });

    const result = positions.map((pos: { chromosome: string; position: number }) => {
      const match = data.find((row: any) =>
        row.chromosome === pos.chromosome &&
        pos.position >= row.start &&
        pos.position <= row.end_pos
      );
      return {
        chromosome: pos.chromosome,
        position: pos.position,
        ...match,
      };
    });

    return Response.json({ data: result });
  } catch (error) {
    console.error("Error fetching mappability data:", error);
    return Response.json(
      { error: "Failed to fetch mappability data" },
      { status: 500 }
    );
  }
}