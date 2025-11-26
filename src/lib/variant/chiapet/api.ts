import type { Chiapet } from "./types";

const CHIAPET_URL = "https://api.genohub.org/v1/chiapet/vcf";

export async function fetchChiaPet(vcf: string): Promise<Chiapet[] | null> {
  try {
    const response = await fetch(`${CHIAPET_URL}/${vcf}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch ChIA-PET data: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching ChIA-PET data:", error);
    return null;
  }
}

export interface SeparatedChiaPetData {
  rnapii: Chiapet[];
  intactHic: Chiapet[];
}

export function separateChiaPetData(chiapetData: Chiapet[]): SeparatedChiaPetData {
  const rnapii: Chiapet[] = [];
  const intactHic: Chiapet[] = [];

  chiapetData.forEach((item) => {
    if (item.assay_type === "RNAPII-ChIAPET") {
      rnapii.push(item);
    } else if (item.assay_type === "Intact-HiC") {
      intactHic.push(item);
    }
  });

  return { rnapii, intactHic };
}
