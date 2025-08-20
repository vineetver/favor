export const REGION_ANNOTATION_URL = "https://api.genohub.org/v1/annotations/regions";

export async function fetchRegionAnnotation(
  region: string,
): Promise<any | null> {
  try {
    const response = await fetch(`${REGION_ANNOTATION_URL}/${region}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch region annotation: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching region annotation:", error);
    return null;
  }
}