import { VistaEnhancer } from "@/lib/region/vista-enhancers/types";

const VISTA_ENHANCER_URL = "https://api.genohub.org/v1/vista-enhancers";

export async function fetchVistaEnhancerByRegion(
  region: string,
): Promise<VistaEnhancer[] | null> {
  try {
    const response = await fetch(`${VISTA_ENHANCER_URL}/${region}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch VISTA enhancer data: ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching VISTA enhancer data:", error);
    return null;
  }
}
