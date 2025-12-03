"use server";

import { prisma } from "@/lib/prisma";
import { generateSummaryWithAI } from "../services/summary-service";
import type { SummaryData, SummaryStatus } from "../types/summary-types";

/**
 * Triggers the generation of a variant summary
 * Separated from queries for better code organization
 */
export async function generateVariantSummary(
    vcf: string,
    model: string = "gpt-4o-mini"
): Promise<SummaryData> {
    if (!vcf || typeof vcf !== "string") {
        throw new Error("Invalid VCF parameter");
    }

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

        // Create initial record with "generating" status
        await prisma.variantSummary.upsert({
            where: { vcf },
            update: {
                status: "generating",
                modelId: model,
                error: null,
                updatedAt: new Date(),
            },
            create: {
                id: crypto.randomUUID(),
                vcf,
                status: "generating",
                modelId: model,
                updatedAt: new Date(),
            },
        });

        // Trigger background generation (fire and forget)
        generateSummaryBackground(vcf, model);

        return { status: "generating" };
    } catch (error) {
        console.error("Error triggering summary generation:", error);
        return {
            status: "failed",
            error: error instanceof Error ? error.message : "Failed to start generation",
        };
    }
}

/**
 * Retries a failed summary generation
 */
export async function retryVariantSummary(
    vcf: string,
    model: string = "gpt-4o-mini"
): Promise<SummaryData> {
    try {
        // Reset the status and trigger new generation
        await prisma.variantSummary.update({
            where: { vcf },
            data: {
                status: "pending",
                error: null,
                updatedAt: new Date(),
            },
        });

        // Trigger generation again
        return await generateVariantSummary(vcf, model);
    } catch (error) {
        console.error("Error retrying summary generation:", error);
        return {
            status: "failed",
            error: error instanceof Error ? error.message : "Failed to retry generation",
        };
    }
}

/**
 * Background function to generate summary
 * Internal function, not exported to clients
 */
async function generateSummaryBackground(vcf: string, model: string) {
    try {
        // Use the service layer for AI interaction
        const summary = await generateSummaryWithAI(vcf, model);

        await prisma.variantSummary.update({
            where: { vcf },
            data: {
                status: "completed",
                summary: summary,
                updatedAt: new Date(),
            },
        });
    } catch (error: any) {
        console.error("Error generating summary in background:", error);
        await prisma.variantSummary.update({
            where: { vcf },
            data: {
                status: "failed",
                error: error.message || "Unknown error",
                updatedAt: new Date(),
            },
        });
    }
}
