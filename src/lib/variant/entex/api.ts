const ENTEX_DEFAULT_URL = "https://api.genohub.org/v1/entex/default";
const ENTEX_POOLED_URL = "https://api.genohub.org/v1/entex/pooled";
const ENTEX_DEFAULT_REGION_URL = "https://api.genohub.org/v1/entex/default/region";
const ENTEX_POOLED_REGION_URL = "https://api.genohub.org/v1/entex/pooled/region";

async function fetchEntexData(
  vcf: string,
  type: "default" | "pooled",
): Promise<Entex[] | null> {
  const url = type === "default" ? ENTEX_DEFAULT_URL : ENTEX_POOLED_URL;

  try {
    const response = await fetch(`${url}/${vcf}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch ${type} ENTEx data: ${response.statusText}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching ${type} ENTEx data:`, error);
    return null;
  }
}

export async function fetchEntexDefault(vcf: string): Promise<Entex[] | null> {
  return fetchEntexData(vcf, "default");
}

export async function fetchEntexPooled(vcf: string): Promise<Entex[] | null> {
  return fetchEntexData(vcf, "pooled");
}

async function fetchEntexDataByRegion(
  region: string,
  type: "default" | "pooled",
): Promise<Entex[] | null> {
  const url = type === "default" ? ENTEX_DEFAULT_REGION_URL : ENTEX_POOLED_REGION_URL;

  try {
    const response = await fetch(`${url}/${region}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch ${type} ENTEx data: ${response.statusText}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching ${type} ENTEx data:`, error);
    return null;
  }
}

export async function fetchEntexDefaultByRegion(region: string): Promise<Entex[] | null> {
  return fetchEntexDataByRegion(region, "default");
}

export async function fetchEntexPooledByRegion(region: string): Promise<Entex[] | null> {
  return fetchEntexDataByRegion(region, "pooled");
}

export interface Entex {
  chromosome: string;
  ref_start: number;
  ref_end: number;
  ref_allele: string;
  hap1_allele: string;
  hap2_allele: string;
  experiment_accession: string;
  donor: string;
  tissue: string;
  assay: string;
  ca: number;
  cc: number;
  cg: number;
  ct: number;
  ref_allele_ratio: number;
  p_betabinom: number;
  imbalance_significance: number;
}
