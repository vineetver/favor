import type { Variant } from "../types/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.genohub.org/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchVariant(vcf: string): Promise<Variant | null> {
  if (!vcf || typeof vcf !== "string") {
    console.warn("Invalid VCF provided to fetchVariant");
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/variants/${vcf}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new ApiError(
        response.status,
        `Failed to fetch variant: ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error; // Re-throw known API errors
    console.error("Unexpected error fetching variant:", error);
    return null;
  }
}

export async function fetchVariantsByRsid(
  rsid: string,
): Promise<Variant[] | null> {
  if (!rsid || typeof rsid !== "string") {
    console.warn("Invalid RSID provided to fetchVariantsByRsid");
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/rsids/${rsid}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new ApiError(
        response.status,
        `Failed to fetch variants by RSID: ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Unexpected error fetching variants by RSID:", error);
    return null;
  }
}
