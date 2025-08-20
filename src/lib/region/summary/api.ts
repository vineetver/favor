const REGION_SUMMARY_URLS: {
  [category: string]: (region: string) => string;
} = {
  "SNV-summary": (region) => `https://api.genohub.org/v1/regions/${region}/summary/snv`,
  "InDel-summary": (region) => `https://api.genohub.org/v1/regions/${region}/summary/indel`,
};

export async function fetchRegionSummary(
  region: string,
  category: string = "SNV-summary",
): Promise<any | null> {
  try {
    const baseUrl = REGION_SUMMARY_URLS[category];
    if (!baseUrl) {
      throw new Error(`Unknown category: ${category}`);
    }

    const response = await fetch(baseUrl(region));

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch region summary: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching region summary:", error);
    return null;
  }
}