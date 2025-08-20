import type {
  BiogridInteraction,
  IntactInteraction,
  HuriInteraction,
} from "./constants";

const biogrid_url = "https://api.genohub.org/v1/interaction/biogrid";
const intact_url = "https://api.genohub.org/v1/interaction/intact";
const huri_url = "https://api.genohub.org/v1/interaction/huri";

export async function getBiogridInteractions(
  geneName: string,
  limit: number = 100,
): Promise<BiogridInteraction[] | null> {
  try {
    const response = await fetch(`${biogrid_url}/${geneName}?limit=${limit}`);
    if (!response.ok) {
      console.warn(`BioGRID API returned ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching BioGRID interactions:", error);
    return null;
  }
}

export async function getIntactInteractions(
  geneName: string,
  limit: number = 100,
): Promise<IntactInteraction[] | null> {
  try {
    const response = await fetch(`${intact_url}/${geneName}?limit=${limit}`);
    if (!response.ok) {
      console.warn(`IntAct API returned ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching IntAct interactions:", error);
    return null;
  }
}

export async function getHuriInteractions(
  geneName: string,
  limit: number = 100,
): Promise<HuriInteraction[] | null> {
  try {
    const response = await fetch(`${huri_url}/${geneName}?limit=${limit}`);
    if (!response.ok) {
      console.warn(`HuRI API returned ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching HuRI interactions:", error);
    return null;
  }
}

export type { BiogridInteraction, IntactInteraction, HuriInteraction };
