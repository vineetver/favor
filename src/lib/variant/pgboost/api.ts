import type { PGBoost } from "@/lib/variant/pgboost/types";

const PGBOOST = "https://api.genohub.org/v1/tissues/pgboost";
const PGBOOST_GENE_URL = "https://api.genohub.org/v1/tissues/pgboost/gene";

export async function fetchPGBoost(rsid: string): Promise<PGBoost[] | null> {
  try {
    const response = await fetch(`${PGBOOST}/${rsid}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? (data as PGBoost[]) : ([data] as PGBoost[]);
  } catch (error) {
    console.error("Error fetching PGBoost data:", error);
    return null;
  }
}

export async function fetchPGBoostByGene(gene: string): Promise<PGBoost[] | null> {
  try {
    const response = await fetch(`${PGBOOST_GENE_URL}/${gene}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? (data as PGBoost[]) : ([data] as PGBoost[]);
  } catch (error) {
    console.error("Error fetching PGBoost gene data:", error);
    return null;
  }
}
