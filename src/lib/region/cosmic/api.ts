export const COSMIC_REGION_URL = "https://api.genohub.org/v1/cosmic/regions";

export async function fetchCosmicByRegion(
  region: string,
): Promise<any[] | null> {
  try {
    const response = await fetch(`${COSMIC_REGION_URL}/${region}`);

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch COSMIC data: ${response.statusText}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching COSMIC data:", error);
    return null;
  }
}
