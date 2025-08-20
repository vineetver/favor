import type { CV2F } from "@/lib/variant/cv2f/types";

const CV2F_URL = "https://api.genohub.org/v1/cv2f";
const CV2F_REGION_URL = "https://api.genohub.org/v1/cv2f/regions";

export async function fetchCV2F(rsid: string): Promise<CV2F | null> {
  if (!rsid || rsid === "NA" || rsid.trim() === "") {
    return null;
  }

  try {
    const response = await fetch(`${CV2F_URL}/${rsid}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch CV2F data: ${response.statusText}`);
    }

    const data = await response.json();
    return data as CV2F;
  } catch (error) {
    console.error("Error fetching CV2F data:", error);
    return null;
  }
}

export async function fetchCV2FByRegion(region: string): Promise<CV2F[] | null> {
  try {
    const response = await fetch(`${CV2F_REGION_URL}/${region}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch CV2F data: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching CV2F data:", error);
    return null;
  }
}
