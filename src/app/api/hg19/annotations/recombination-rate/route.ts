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
        score as recombination_rate
      FROM production.recombination_rate
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
        recombination_rate: match?.recombination_rate,
      };
    });

    return Response.json({ data: result });
  } catch (error) {
    console.error("Error fetching recombination rate data:", error);
    return Response.json(
      { error: "Failed to fetch recombination rate data" },
      { status: 500 }
    );
  }
}