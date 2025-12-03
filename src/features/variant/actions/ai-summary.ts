"use server";

import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";

export type SummaryStatus = "pending" | "generating" | "completed" | "failed";

export interface SummaryData {
    status: SummaryStatus;
    summary?: string;
    error?: string;
    timestamp?: string;
}

/**
 * Fetches the current summary status for a variant
 */
export async function getVariantSummary(vcf: string): Promise<SummaryData> {
    try {
        const summary = await prisma.variantSummary.findUnique({
            where: { vcf },
        });

        if (!summary) {
            return { status: "pending" };
        }

        return {
            status: summary.status as SummaryStatus,
            summary: summary.summary || undefined,
            error: summary.error || undefined,
            timestamp: summary.updatedAt.toISOString(),
        };
    } catch (error) {
        console.error("Error fetching summary:", error);
        return { status: "failed", error: "Failed to fetch summary" };
    }
}

/**
 * Triggers the generation of a variant summary
 */
export async function generateVariantSummary(
    vcf: string,
    model: string = "gpt-4o-mini"
): Promise<SummaryData> {
    try {
        // Check if already exists
        const existing = await prisma.variantSummary.findUnique({
            where: { vcf },
        });

        if (existing) {
            if (existing.status === "completed") {
                return {
                    status: "completed",
                    summary: existing.summary || undefined,
                    timestamp: existing.updatedAt.toISOString(),
                };
            }
            if (existing.status === "generating") {
                return { status: "generating" };
            }
        }

        // Create initial record
        await prisma.variantSummary.upsert({
            where: { vcf },
            update: {
                status: "generating",
                model: model,
                error: null,
            },
            create: {
                vcf,
                status: "generating",
                model: model,
            },
        });

        // Trigger background generation
        // We intentionally do not await this to allow immediate response
        generateSummaryBackground(vcf, model);

        return { status: "generating" };
    } catch (error) {
        console.error("Error triggering summary generation:", error);
        return { status: "failed", error: "Failed to start generation" };
    }
}

/**
 * Background function to generate summary
 * Not exported as it's internal
 */
async function generateSummaryBackground(vcf: string, model: string) {
    try {
        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content:
                        "You are a helpful assistant that summarizes genetic variants. Provide a concise, clinical summary.",
                },
                {
                    role: "user",
                    content: `Please provide a summary for the variant: ${vcf}.`,
                },
            ],
        });

        const summary =
            completion.choices[0].message.content || "No summary generated.";

        await prisma.variantSummary.update({
            where: { vcf },
            data: {
                status: "completed",
                summary: summary,
            },
        });
    } catch (error: any) {
        console.error("Error generating summary in background:", error);
        await prisma.variantSummary.update({
            where: { vcf },
            data: {
                status: "failed",
                error: error.message || "Unknown error",
            },
        });
    }
}
