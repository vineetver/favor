"use client";

import { useCallback } from "react";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Markdown } from "@/components/ai-elements/markdown";
import { useVariantSummary } from "@/hooks/use-variant-summary";
import { Button } from "@/components/ui/button";

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
 */
export function VariantSummary({
    vcf,
    modelId = "gpt-4o-mini"
}: VariantSummaryProps) {
    const {
        summary,
        status,
        error,
        isGenerating,
        isFailed,
        isCompleted,
        retry,
    } = useVariantSummary({ vcf, modelId });

    const handleOpenChat = useCallback(() => {
        const chatTrigger = document.getElementById("chatbot-trigger-button");
        chatTrigger?.click();
    }, []);

    // Error state
    if (isFailed) {
        return (
            <SummaryCard onChatClick={handleOpenChat}>
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
            </SummaryCard>
        );
    }

    // Loading/Generating state
    if (isGenerating && !summary) {
        return (
            <SummaryCard onChatClick={handleOpenChat}>
                <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <div>
                        <p className="font-medium">
                            {status === "generating"
                                ? "Generating AI-powered analysis..."
                                : "Initializing summary generation..."}
                        </p>
                        <p className="text-sm mt-1">
                            You can navigate away and come back later. Your summary will be ready.
                        </p>
                    </div>
                </div>
            </SummaryCard>
        );
    }

    // Completed state with summary
    return (
        <SummaryCard
            onChatClick={handleOpenChat}
            isUpdating={isGenerating && !!summary}
        >
            {summary ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                    <Markdown>{summary}</Markdown>
                </div>
            ) : (
                <div className="text-muted-foreground text-sm">
                    No summary available yet.
                </div>
            )}
        </SummaryCard>
    );
}

/**
 * Reusable card wrapper for the summary component
 */
function SummaryCard({
    children,
    onChatClick,
    isUpdating = false,
}: {
    children: React.ReactNode;
    onChatClick: () => void;
    isUpdating?: boolean;
}) {
    return (
        <div className="rounded-lg border border-border/50 bg-card shadow-md text-sm">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 sm:px-6 border-b border-border/40">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground">
                        AI-Powered Analysis by{" "}
                        <button
                            onClick={onChatClick}
                            className="inline-flex items-center rounded-md text-foreground hover:bg-muted/50 hover:underline transition-colors focus:outline-none focus:ring-1 focus:ring-border px-1 py-0.5"
                            aria-label="Open FAVOR-GPT chat"
                        >
                            FAVOR-GPT
                        </button>
                    </h2>
                    {isUpdating && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Updating...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 pt-5 pb-5 sm:px-6">
                {children}
            </div>
        </div>
    );
}
