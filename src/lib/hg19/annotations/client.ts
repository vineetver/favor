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
  const response = await fetch("/api/hg19/annotations/mappability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ positions }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch mappability data");
  }

  const { data } = await response.json();
  return data;
}

export async function fetchRecombinationRateData(
  positions: VariantPosition[]
): Promise<RecombinationRateData[]> {
  const response = await fetch("/api/hg19/annotations/recombination-rate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ positions }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch recombination rate data");
  }

  const { data } = await response.json();
  return data;
}

export async function fetchApcMappabilityData(
  positions: VariantPosition[]
): Promise<ApcMappabilityData[]> {
  const response = await fetch("/api/hg19/annotations/apc-mappability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ positions }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch apc mappability data");
  }

  const { data } = await response.json();
  return data;
}

export async function fetchAllAnnotations(positions: VariantPosition[]) {
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

export function mergeVariantWithAnnotations<T extends { chromosome: string; position: number }>(
  variants: T[],
  annotations: ReturnType<typeof fetchAllAnnotations> extends Promise<infer U> ? U : never
): (T & Partial<MappabilityData & RecombinationRateData & ApcMappabilityData>)[] {
  return variants.map((variant) => {
    const annotation = annotations.find(
      (a) => a.chromosome === variant.chromosome && a.position === variant.position
    );
    return {
      ...variant,
      ...annotation,
    };
  });
}