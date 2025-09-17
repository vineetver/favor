import type { Epimap } from "./types";

const EPIMAP_REGION_URL = "https://api.genohub.org/v1/epimap/regions";

export async function fetchEpimapByRegion(
  region: string,
): Promise<Epimap[] | null> {
  try {
    const response = await fetch(`${EPIMAP_REGION_URL}/${region}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch Epimap data: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching Epimap data:", error);
    return null;
  }
}
