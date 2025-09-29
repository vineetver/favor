import { NextRequest } from "next/server";
import { clickHouseClient } from "@/lib/clickhouse/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { positions } = body;

    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      return Response.json({ error: "Invalid positions array" }, { status: 400 });
    }

    const positionPairs = positions.map((pos: { chromosome: string; position: number }) =>
      `(chr = '${pos.chromosome}' AND position = ${pos.position})`
    ).join(' OR ');

    const query = `
      SELECT
        chr as chromosome,
        position,
        apc_mappability
      FROM production.apc_mappability
      WHERE ${positionPairs}
    `;

    const data = await clickHouseClient.query({
      query,
      format: "JSONEachRow",
    });

    const result = positions.map((pos: { chromosome: string; position: number }) => {
      const match = data.find((row: any) =>
        row.chromosome === pos.chromosome && row.position === pos.position
      );
      return {
        chromosome: pos.chromosome,
        position: pos.position,
        apc_mappability: match?.apc_mappability,
      };
    });

    return Response.json({ data: result });
  } catch (error) {
    console.error("Error fetching apc mappability data:", error);
    return Response.json(
      { error: "Failed to fetch apc mappability data" },
      { status: 500 }
    );
  }
}