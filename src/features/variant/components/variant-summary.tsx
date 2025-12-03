"use client";

import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Markdown } from "@/components/ai-elements/markdown";
import { useVariantSummary } from "@/hooks/use-variant-summary";
import { useVariantChat } from "@/hooks/use-variant-chat";
import { Button } from "@/components/ui/button";
import { VariantSummaryCard } from "./variant-summary-card";
import { VariantSummarySkeleton } from "./variant-summary-skeleton";

interface VariantSummaryProps {
    vcf: string;
    modelId?: string;
}

/**
 * VariantSummary Component
 *
 * Displays AI-generated variant analysis with automatic background generation,
 * caching, and polling. Uses React Query for efficient data management.
 *
 * Features:
 * - Automatic cache checking and generation triggering
 * - Background polling when generating
 * - Persistent caching across navigation
 * - Error handling with retry capability
 * - Clear loading states with skeleton UI
 */
export function VariantSummary({
    vcf,
    modelId = "gpt-4o-mini",
}: VariantSummaryProps) {
    const {
        summary,
        status,
        error,
        isLoading,
        isGenerating,
        isFailed,
        isCompleted,
        retry,
    } = useVariantSummary({ vcf, modelId });

    const { openChat } = useVariantChat();

    // Initial loading state - checking database
    if (isLoading && !summary) {
        return <VariantSummarySkeleton />;
    }

    // Error state
    if (isFailed) {
        return (
            <VariantSummaryCard onChatClick={openChat}>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-destructive font-medium mb-2">
                                Error generating summary
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">
                                {error || "An unexpected error occurred"}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={retry}
                                className="gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Retry
                            </Button>
                        </div>
                    </div>
                </div>
            </VariantSummaryCard>
        );
    }

    // Generating state (initial generation without existing summary)
    if (isGenerating && !summary) {
        return (
            <VariantSummaryCard onChatClick={openChat}>
                <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <div>
                        <p className="font-medium">
                            {status === "generating"
                                ? "Generating AI-powered analysis..."
                                : "Initializing summary generation..."}
                        </p>
                        <p className="text-sm mt-1">
                            You can navigate away and come back later. Your summary will be
                            ready.
                        </p>
                    </div>
                </div>
            </VariantSummaryCard>
        );
    }

    // Completed state with summary (or updating existing summary)
    return (
        <VariantSummaryCard
            onChatClick={openChat}
            isUpdating={isGenerating && !!summary}
        >
            {summary ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                    <Markdown>{summary}</Markdown>
                </div>
            ) : (
                <div className="text-muted-foreground text-sm">
                    No summary available for this variant.
                </div>
            )}
        </VariantSummaryCard>
    );
}
