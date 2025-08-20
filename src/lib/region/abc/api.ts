import { ABCPeaks, ABCScore } from "@/lib/variant/abc/api";

const ABC_PEAKS_REGION_URL = "https://api.genohub.org/v1/abc/peaks/regions";
const ABC_SCORE_REGION_URL = "https://api.genohub.org/v1/abc/regions";


export async function fetchABCPeaksByRegion(region: string): Promise<ABCPeaks[]> {
  const response = await fetch(`${ABC_PEAKS_REGION_URL}/${region}`);
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchABCScoresByRegion(region: string): Promise<ABCScore[]> {
  const response = await fetch(`${ABC_SCORE_REGION_URL}/${region}`);
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}