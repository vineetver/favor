import type { GnomadData } from "@features/variant/types";
import { fetchOrNull } from "@infra/api";

import { API_BASE } from "@/config/api";

export async function fetchGnomadExome(
  vcf: string,
): Promise<GnomadData | null> {
  if (!vcf) return null;
  return fetchOrNull<GnomadData>(`${API_BASE}/ancestry/gnomad/exome/${vcf}`);
}

export async function fetchGnomadGenome(
  vcf: string,
): Promise<GnomadData | null> {
  if (!vcf) return null;
  return fetchOrNull<GnomadData>(`${API_BASE}/ancestry/gnomad/genome/${vcf}`);
}

export async function fetchGnomadBoth(vcf: string): Promise<{
  exome: GnomadData | null;
  genome: GnomadData | null;
}> {
  const [exome, genome] = await Promise.all([
    fetchGnomadExome(vcf),
    fetchGnomadGenome(vcf),
  ]);
  return { exome, genome };
}
