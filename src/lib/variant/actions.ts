"use server";

import { cookies } from "next/headers";

export async function setRsidVariantCookie(rsid: string, variantVcf: string) {
  const cookieStore = cookies();
  cookieStore.set(`rsid-${rsid}-variant`, variantVcf, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearRsidVariantCookie(rsid: string) {
  const cookieStore = cookies();
  cookieStore.delete(`rsid-${rsid}-variant`);
}
