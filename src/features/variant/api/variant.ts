import { fetchOrNull } from "@/lib/api";
import type { Variant } from "@/features/variant/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.genohub.org/v1";

export async function fetchVariant(vcf: string): Promise<Variant | null> {
  if (!vcf) return null;
  return fetchOrNull<Variant>(`${API_BASE}/variants/${vcf}`);
}

export async function fetchVariantsByRsid(rsid: string): Promise<Variant[] | null> {
  if (!rsid) return null;
  return fetchOrNull<Variant[]>(`${API_BASE}/rsids/${rsid}`);
}
