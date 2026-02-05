"use client";

import { useVariantChat } from "@features/variant/hooks/use-variant-chat";
import { useVariantSummary } from "@features/variant/hooks/use-variant-summary";
import type { Variant } from "@features/variant/types/variant";
import {
  buildVariantPrompt,
  type VariantPromptContext,
} from "@features/variant/utils/build-variant-prompt";
import { Markdown } from "@shared/components/ai-elements/markdown";
import { Button } from "@shared/components/ui/button";
import { Card } from "@shared/components/ui/card";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface VariantLLMSummaryProps {
  variant: Variant;
  context?: VariantPromptContext;
  modelId?: string;
}

export function VariantLLMSummary({
  variant,
  context,
  modelId = "gpt-4o-mini",
}: VariantLLMSummaryProps) {
  const { openChat } = useVariantChat();
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(
    () => buildVariantPrompt(variant, context),
    [variant, context],
  );

  const { state, retry } = useVariantSummary({
    vcf: variant.variant_vcf,
    prompt,
    modelId,
  });

  const handleCopy = useCallback(() => {
    if (state.status === "completed") {
      navigator.clipboard.writeText(state.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [state]);

  return (
    <div className="space-y-3">
      <Card className="gap-0 py-0">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="text-sm text-subtle font-medium">
              Powered by FAVOR-GPT
            </span>
          </div>
          <div className="flex items-center gap-3">
            {state.status === "completed" && (
              <>
                <button
                  onClick={handleCopy}
                  className="text-sm text-subtle hover:text-heading flex items-center gap-1.5 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>Copy</span>
                </button>
                <div className="w-px h-4 bg-slate-200" />
              </>
            )}
            <button
              onClick={openChat}
              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Ask follow-up
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <SummaryContent state={state} retry={retry} />
        </div>
      </Card>
    </div>
  );
}

interface SummaryContentProps {
  state: ReturnType<typeof useVariantSummary>["state"];
  retry: () => void;
}

function SummaryContent({ state, retry }: SummaryContentProps) {
  switch (state.status) {
    case "idle":
    case "loading":
      return <LoadingSkeleton />;

    case "pending":
    case "generating":
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="relative mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" />
          </div>
          <p className="text-base font-medium text-heading mb-1">
            {state.status === "pending" ? "Queued" : "Generating analysis"}
          </p>
          <p className="text-sm text-subtle max-w-sm">
            {state.status === "generating" && state.estimatedSeconds
              ? `This usually takes about ${state.estimatedSeconds} seconds`
              : "You can navigate away — we'll save your results"}
          </p>
        </div>
      );

    case "completed":
      // Strip redundant "Variant Summary" title - sidebar already shows this
      const content = state.summary.replace(
        /^#{1,3}\s*Variant Summary[:\s].*?\n+/i,
        ""
      );
      return (
        <article className="ai-summary-content">
          <Markdown showCopy={false}>{content}</Markdown>
        </article>
      );

    case "failed":
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <p className="text-base font-medium text-heading mb-1">
            Unable to generate analysis
          </p>
          <p className="text-sm text-subtle max-w-sm mb-4">
            {state.error || "Something went wrong. Please try again."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            className="gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </Button>
        </div>
      );

    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <Skeleton className="h-6 w-2/3" />

      {/* Paragraph skeletons */}
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      {/* Section skeleton */}
      <div className="space-y-2.5">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
      </div>

      {/* Another section */}
      <div className="space-y-2.5">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
