export const PGBOOST_REGION_URL =
  "https://api.genohub.org/v1/tissues/pgboost/region";

export async function fetchPGBoostByRegion(
  region: string,
): Promise<any[] | null> {
  try {
    const response = await fetch(`${PGBOOST_REGION_URL}/${region}`);

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch PGBoost data: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error("Error fetching PGBoost data:", error);
    return null;
  }
}
