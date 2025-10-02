import { NextRequest } from "next/server";
import { clickHouseClient } from "@/lib/clickhouse/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { positions } = body;

    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      return Response.json({ error: "Invalid positions array" }, { status: 400 });
    }

    const tables = [
      "k24_bismap",
      "k24_umap",
      "k36_bismap",
      "k36_umap",
      "k50_bismap",
      "k50_umap",
      "k100_bismap",
      "k100_umap",
    ];

    const results = await Promise.all(
      tables.map(async (table) => {
        const conditions = positions
          .map(
            (pos: { chromosome: string; position: number }) => {
              const chr = pos.chromosome.startsWith('chr') ? pos.chromosome : `chr${pos.chromosome}`;
              return `(chr = '${chr}' AND ${pos.position} BETWEEN start AND end_pos)`;
            }
          )
          .join(" OR ");

        const query = `
          SELECT
            chr as chromosome,
            start,
            end_pos,
            score
          FROM production.mappability_${table}
          WHERE ${conditions}
        `;

        const data = await clickHouseClient.query({
          query,
          format: "JSONEachRow",
        });

        return { table, data };
      })
    );

    const result = positions.map((pos: { chromosome: string; position: number }) => {
      const mappabilityScores: any = {
        chromosome: pos.chromosome,
        position: pos.position,
      };

      const chr = pos.chromosome.startsWith('chr') ? pos.chromosome : `chr${pos.chromosome}`;

      results.forEach(({ table, data }) => {
        const match = data.find(
          (row: any) =>
            row.chromosome === chr &&
            pos.position >= row.start &&
            pos.position <= row.end_pos
        );
        if (match) {
          mappabilityScores[`mappability_${table}`] = match.score;
        }
      });

      return mappabilityScores;
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