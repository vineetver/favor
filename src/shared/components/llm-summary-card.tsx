"use client";

import { Markdown } from "@shared/components/ai-elements/markdown";
import { Button } from "@shared/components/ui/button";
import { Card } from "@shared/components/ui/card";
import { Skeleton } from "@shared/components/ui/skeleton";
import { cn } from "@infra/utils";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  State type — mirrors the discriminated union both hooks produce    */
/* ------------------------------------------------------------------ */

export type LLMSummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "pending"; requestId: string }
  | { status: "generating"; requestId: string; estimatedSeconds?: number }
  | { status: "completed"; summary: string; cachedAt?: string }
  | { status: "failed"; error: string };

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface LLMSummaryCardProps {
  state: LLMSummaryState;
  retry: () => void;
  onAskFollowUp?: () => void;
  /** Regex to strip a redundant title from the completed summary. */
  titleStripPattern?: RegExp;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LLMSummaryCard({
  state,
  retry,
  onAskFollowUp,
  titleStripPattern,
  className,
}: LLMSummaryCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (state.status === "completed") {
      navigator.clipboard.writeText(state.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [state]);

  return (
    <div className={cn("space-y-3", className)}>
      <Card className="gap-0 py-0">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-border">
          <span className="text-sm text-muted-foreground font-medium">
            Powered by FAVOR-GPT
          </span>

          <div className="flex items-center gap-3">
            {state.status === "completed" && (
              <>
                <button
                  onClick={handleCopy}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                  aria-label="Copy summary to clipboard"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>Copy</span>
                </button>
                <div className="w-px h-4 bg-border" />
              </>
            )}
            {onAskFollowUp && (
              <button
                onClick={onAskFollowUp}
                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 transition-colors"
                aria-label="Ask follow-up in FAVOR-GPT"
              >
                <MessageSquare className="w-4 h-4" />
                Ask follow-up
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <SummaryBody
            state={state}
            retry={retry}
            titleStripPattern={titleStripPattern}
          />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal: body content (loading / generating / done / error)       */
/* ------------------------------------------------------------------ */

function SummaryBody({
  state,
  retry,
  titleStripPattern,
}: {
  state: LLMSummaryState;
  retry: () => void;
  titleStripPattern?: RegExp;
}) {
  switch (state.status) {
    case "idle":
    case "loading":
      return <LLMSummarySkeleton />;

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
          <p className="text-base font-medium text-foreground mb-1">
            {state.status === "pending" ? "Queued" : "Generating analysis"}
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {state.status === "generating" && state.estimatedSeconds
              ? `This usually takes about ${state.estimatedSeconds} seconds`
              : "You can navigate away \u2014 we\u2019ll save your results"}
          </p>
        </div>
      );

    case "completed": {
      const content = titleStripPattern
        ? state.summary.replace(titleStripPattern, "")
        : state.summary;
      return (
        <article className="ai-summary-content">
          <Markdown showCopy={false}>{content}</Markdown>
        </article>
      );
    }

    case "failed":
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <p className="text-base font-medium text-foreground mb-1">
            Unable to generate analysis
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            {state.error || "Something went wrong. Please try again."}
          </p>
          <Button variant="outline" size="sm" onClick={retry} className="gap-2">
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

/* ------------------------------------------------------------------ */
/*  Shared loading skeleton                                            */
/* ------------------------------------------------------------------ */

function LLMSummarySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-2/3" />
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
