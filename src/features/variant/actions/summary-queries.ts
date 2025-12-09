"use server";

import { prisma } from "@/lib/prisma";
import type { SummaryStatus, SummaryData } from "../types/summary-types";
import { SummaryDatabaseError } from "../types/summary-types";

const VALID_STATUSES: SummaryStatus[] = [
  "pending",
  "generating",
  "completed",
  "failed",
];

function isValidStatus(status: string): status is SummaryStatus {
  return VALID_STATUSES.includes(status as SummaryStatus);
}

/**
 * Fetches the current summary status for a variant
 * Improved error handling with custom error types
 */
export async function getVariantSummary(vcf: string): Promise<SummaryData> {
  if (!vcf || typeof vcf !== "string") {
    throw new Error("Invalid VCF parameter");
  }

  try {
    const summary = await prisma.variantSummary.findUnique({
      where: { vcf },
    });

    if (!summary) {
      return { status: "pending" };
    }

    return {
      status: isValidStatus(summary.status) ? summary.status : "pending",
      summary: summary.summary || undefined,
      error: summary.error || undefined,
      timestamp: summary.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("Error fetching summary:", error);
    throw new SummaryDatabaseError(
      error instanceof Error ? error.message : "Failed to fetch summary",
    );
  }
}

/**
 * Gets only the status of a variant summary (lighter query)
 */
export async function getVariantSummaryStatus(
  vcf: string,
): Promise<SummaryStatus> {
  try {
    const summary = await prisma.variantSummary.findUnique({
      where: { vcf },
      select: { status: true },
    });

    const status = summary?.status;
    return status && isValidStatus(status) ? status : "pending";
  } catch (error) {
    console.error("Error fetching summary status:", error);
    return "failed";
  }
}
