import { clickHouseClient } from "@/lib/clickhouse/client";

export interface VariantPosition {
  chromosome: string;
  position: number;
}

export interface MappabilityData {
  chromosome: string;
  position: number;
  mappability_k24_bismap?: number;
  mappability_k36_bismap?: number;
  mappability_k50_bismap?: number;
  mappability_k100_bismap?: number;
  mappability_k24_umap?: number;
  mappability_k36_umap?: number;
  mappability_k50_umap?: number;
  mappability_k100_umap?: number;
}

export interface RecombinationRateData {
  chromosome: string;
  position: number;
  recombination_rate?: number;
}

export interface ApcMappabilityData {
  chromosome: string;
  position: number;
  apc_mappability?: number;
}

export async function fetchMappabilityData(
  positions: VariantPosition[]
): Promise<MappabilityData[]> {
  if (positions.length === 0) return [];

  const conditions = positions
    .map(
      (pos) =>
        `(chr = '${pos.chromosome}' AND ${pos.position} BETWEEN start AND end_pos)`
    )
    .join(" OR ");

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

  return positions.map((pos) => {
    const match = data.find(
      (row: any) =>
        row.chromosome === pos.chromosome &&
        pos.position >= row.start &&
        pos.position <= row.end_pos
    );
    return {
      chromosome: pos.chromosome,
      position: pos.position,
      mappability_k24_bismap: match?.mappability_k24_bismap,
      mappability_k36_bismap: match?.mappability_k36_bismap,
      mappability_k50_bismap: match?.mappability_k50_bismap,
      mappability_k100_bismap: match?.mappability_k100_bismap,
      mappability_k24_umap: match?.mappability_k24_umap,
      mappability_k36_umap: match?.mappability_k36_umap,
      mappability_k50_umap: match?.mappability_k50_umap,
      mappability_k100_umap: match?.mappability_k100_umap,
    };
  });
}

export async function fetchRecombinationRateData(
  positions: VariantPosition[]
): Promise<RecombinationRateData[]> {
  if (positions.length === 0) return [];

  const conditions = positions
    .map(
      (pos) =>
        `(chr = '${pos.chromosome}' AND ${pos.position} BETWEEN start AND end_pos)`
    )
    .join(" OR ");

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

  return positions.map((pos) => {
    const match = data.find(
      (row: any) =>
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
}

export async function fetchApcMappabilityData(
  positions: VariantPosition[]
): Promise<ApcMappabilityData[]> {
  if (positions.length === 0) return [];

  const positionPairs = positions
    .map((pos) => `(chr = '${pos.chromosome}' AND position = ${pos.position})`)
    .join(" OR ");

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

  return positions.map((pos) => {
    const match = data.find(
      (row: any) =>
        row.chromosome === pos.chromosome && row.position === pos.position
    );
    return {
      chromosome: pos.chromosome,
      position: pos.position,
      apc_mappability: match?.apc_mappability,
    };
  });
}

export async function fetchAllAnnotations(positions: VariantPosition[]) {
  if (positions.length === 0) return [];

  const [mappability, recombinationRate, apcMappability] = await Promise.all([
    fetchMappabilityData(positions),
    fetchRecombinationRateData(positions),
    fetchApcMappabilityData(positions),
  ]);

  return positions.map((pos) => {
    const mappabilityMatch = mappability.find(
      (m) => m.chromosome === pos.chromosome && m.position === pos.position
    );
    const recombMatch = recombinationRate.find(
      (r) => r.chromosome === pos.chromosome && r.position === pos.position
    );
    const apcMatch = apcMappability.find(
      (a) => a.chromosome === pos.chromosome && a.position === pos.position
    );

    return {
      chromosome: pos.chromosome,
      position: pos.position,
      ...mappabilityMatch,
      recombination_rate: recombMatch?.recombination_rate,
      apc_mappability: apcMatch?.apc_mappability,
    };
  });
}