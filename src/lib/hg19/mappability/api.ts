import { clickHouseClient } from "@/lib/clickhouse/client";

export interface MappabilityDataPoint {
  chr: string;
  start: number;
  end_pos: number;
  score: number;
}

export interface MappabilityParams {
  region: string;
  kmer?: string;
  type?: "bismap" | "umap";
  binSize?: number;
}

export async function fetchMappabilityData({
  region,
  kmer = "k24",
  type = "bismap",
}: MappabilityParams): Promise<MappabilityDataPoint[]> {
  try {
    const [chr, start, end] = region.split("-");
    const startPos = Number(start);
    const endPos = Number(end);
    const chrWithPrefix = chr.startsWith('chr') ? chr : `chr${chr}`;

    const tableName = `production.mappability_${kmer}_${type}`;

    const regionSpan = endPos - startPos;
    const effectiveBinSize = Math.max(100, Math.floor(regionSpan / 1000));

    const query = `
      SELECT
        chr,
        intDiv(start, {binSize:UInt32}) * {binSize:UInt32} as start,
        (intDiv(start, {binSize:UInt32}) + 1) * {binSize:UInt32} as end_pos,
        avg(score) as score
      FROM ${tableName}
      WHERE chr = {chr:String}
        AND start >= {start:UInt32}
        AND end_pos <= {end:UInt32}
      GROUP BY chr, start, end_pos
      ORDER BY start
    `;

    const data = await clickHouseClient.query({
      query,
      query_params: {
        chr: chrWithPrefix,
        start: startPos,
        end: endPos,
        binSize: effectiveBinSize,
      },
      format: "JSONEachRow",
    });

    return data;
  } catch (error) {
    console.error("Error fetching mappability data from ClickHouse:", error);
    throw error;
  }
}

export async function fetchMappabilityScores(
  chr: string,
  position: number,
): Promise<Record<string, number>> {
  try {
    const scores: Record<string, number> = {};
    const chrWithPrefix = chr.startsWith('chr') ? chr : `chr${chr}`;

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

    for (const table of tables) {
      const query = `
        SELECT score
        FROM production.mappability_${table}
        WHERE chr = {chr:String}
          AND start <= {position:UInt32}
          AND end_pos > {position:UInt32}
        LIMIT 1
      `;

      const rows = await clickHouseClient.query<{ score: number }>({
        query,
        query_params: { chr: chrWithPrefix, position },
      });

      if (rows && rows.length > 0) {
        scores[table] = rows[0].score;
      }
    }

    return scores;
  } catch (error) {
    console.error("Error fetching mappability scores from ClickHouse:", error);
    throw error;
  }
}
