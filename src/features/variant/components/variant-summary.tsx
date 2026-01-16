"use client";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Markdown } from "@/components/ai-elements/markdown";
import { Button } from "@/components/ui/button";
import { useVariantChat } from "@/features/variant/hooks/use-variant-chat";
import { useVariantSummary } from "@/features/variant/hooks/use-variant-summary";
import { VariantSummaryCard } from "./variant-summary-card";
import { VariantSummarySkeleton } from "./variant-summary-skeleton";

interface VariantSummaryProps {
  vcf: string;
  modelId?: string;
}

/**
 * VariantSummary Component
 *
 * Uses exhaustive pattern matching on discriminated union state.
 * Each case handles exactly one state - no boolean flag combinations.
 */
export function VariantSummary({
  vcf,
  modelId = "gpt-4o-mini",
}: VariantSummaryProps) {
  const { state, retry } = useVariantSummary({ vcf, modelId });
  const { openChat } = useVariantChat();

  // Exhaustive pattern matching - each state renders exactly one UI
  switch (state.status) {
    case "idle":
    case "loading":
      return <VariantSummarySkeleton />;

    case "pending":
      return (
        <VariantSummaryCard onChatClick={openChat}>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            <div>
              <p className="font-medium">Queued for generation...</p>
              <p className="text-base mt-1">
                Your request is in the queue. You can navigate away and come back later.
              </p>
            </div>
          </div>
        </VariantSummaryCard>
      );

    case "generating":
      return (
        <VariantSummaryCard onChatClick={openChat}>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            <div>
              <p className="font-medium">Generating AI-powered analysis...</p>
              <p className="text-base mt-1">
                {state.estimatedSeconds
                  ? `Estimated time: ~${state.estimatedSeconds}s`
                  : "You can navigate away and come back later."}
              </p>
            </div>
          </div>
        </VariantSummaryCard>
      );

    case "completed":
      return (
        <VariantSummaryCard onChatClick={openChat}>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <Markdown>{state.summary}</Markdown>
          </div>
        </VariantSummaryCard>
      );

    case "failed":
      return (
        <VariantSummaryCard onChatClick={openChat}>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-destructive font-medium mb-2">
                  Error generating summary
                </h3>
                <p className="text-base text-muted-foreground mb-3">
                  {state.error}
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

    default: {
      // Exhaustiveness check - TypeScript will error if we miss a case
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
