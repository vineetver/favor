"use server";

import { cookies } from "next/headers";

/**
 * Server action to set the selected variant for an rsID
 * Stores user's allele preference in a cookie
 */
export async function setVariantSelectionCookie(
  rsid: string,
  variantVcf: string,
): Promise<{ success: boolean }> {
  const cookieStore = await cookies();

  cookieStore.set(`variant-${rsid}`, variantVcf, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  return { success: true };
}
