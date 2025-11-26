import {
  EQTL_URL,
  CHIA_PET_URL,
  CRISPR_URL,
  type Eqtl,
  type Chiapet,
  type Crispr,
} from "./types";

export async function fetchEQTL(accession: string): Promise<Eqtl[]> {
  const response = await fetch(`${EQTL_URL}/${accession}`);
  if (!response.ok) return [];
  return response.json();
}

export async function fetchChiaPet(accession: string): Promise<Chiapet[]> {
  const response = await fetch(`${CHIA_PET_URL}/${accession}`);
  if (!response.ok) return [];
  return response.json();
}

export async function fetchCRISPR(accession: string): Promise<Crispr[]> {
  const response = await fetch(`${CRISPR_URL}/${accession}`);
  if (!response.ok) return [];
  return response.json();
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
