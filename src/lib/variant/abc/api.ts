export type ABCPeaks = {
  chromosome: string;
  start_position: number;
  end_position: number;
  signal_value: number;
  p_value: number;
  q_value: number;
  peak: number;
  tissue: string;
};

export type ABCScore = {
  chromosome: string;
  start_position: number;
  end_position: number;
  promotor_chromosome: string;
  promotor_start_position: number;
  promotor_end_position: number;
  abc_score: number;
  gene_name: string;
  distance: number;
  tissue: string;
};

export type ABCQueryParams = {
  chromosome?: string;
  start_position?: number;
  end_position?: number;
  tissue?: string;
  gene_name?: string;
};

const ABC_PEAKS_URL = "https://api.genohub.org/v1/abc/peaks";
const ABC_SCORE_URL = "https://api.genohub.org/v1/abc";

export async function fetchABCPeaks(vcf: string): Promise<ABCPeaks[]> {
  const response = await fetch(`${ABC_PEAKS_URL}/${vcf}`);
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchABCScores(vcf: string): Promise<ABCScore[]> {
  const response = await fetch(`${ABC_SCORE_URL}/${vcf}`);
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}