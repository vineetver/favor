import type { Variant, VariantSingleResponse } from "@/features/variant/types";
import { fetchOrNull } from "@/lib/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchVariant(vcf: string): Promise<Variant | null> {
  if (!vcf) return null;
  const response = await fetchOrNull<VariantSingleResponse>(
    `${API_BASE}/variant?variant=${encodeURIComponent(vcf)}&view=full`,
  );
  if (!response || "error" in response) return null;
  return response;
}

export async function fetchVariantsByRsid(
  rsid: string,
): Promise<Variant | null> {
  if (!rsid) return null;
  const response = await fetchOrNull<VariantSingleResponse>(
    `${API_BASE}/variant?variant=${encodeURIComponent(rsid)}&view=full`,
  );
  if (!response || "error" in response) return null;
  return response;
}
