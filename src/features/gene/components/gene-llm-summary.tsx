"use client";

import { useAskFollowUp } from "@features/agent/hooks/use-ask-follow-up";
import { useGeneSummary } from "@features/gene/hooks/use-gene-summary";
import type { Gene } from "@features/gene/types";
import { LLMSummaryCard } from "@shared/components/llm-summary-card";
import { Button } from "@shared/components/ui/button";
import { Card } from "@shared/components/ui/card";
import { useAuth } from "@shared/hooks";
import { LogIn, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

interface GeneLLMSummaryProps {
  geneId: string;
  gene?: Gene | null;
}

const TITLE_STRIP = /^#{1,3}\s*Gene Summary[:\s].*?\n+/i;

export function GeneLLMSummary({ geneId, gene }: GeneLLMSummaryProps) {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const askFollowUp = useAskFollowUp();
  const router = useRouter();

  useEffect(() => {
    const base = `/hg38/gene/${encodeURIComponent(geneId)}/gene-level-annotation`;
    router.prefetch(`${base}/graph-explorer`);
    router.prefetch(`${base}/expression`);
    router.prefetch(`${base}/constraints-and-heplo`);
  }, [router, geneId]);

  const { state, retry } = useGeneSummary({
    geneId,
    enabled: isAuthenticated,
  });

  const onAskFollowUp = useCallback(() => {
    if (state.status !== "completed") return;
    askFollowUp({
      kind: "gene",
      id: geneId,
      displayName: gene?.gene_symbol ?? geneId,
      summary: state.summary,
    });
  }, [askFollowUp, state, geneId, gene?.gene_symbol]);

  if (!authLoading && !isAuthenticated) {
    return (
      <Card className="gap-0 py-0">
        <div className="px-6 py-4 flex items-center justify-between border-b border-border">
          <span className="text-sm text-muted-foreground font-medium">
            Powered by FAVOR-GPT
          </span>
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <p className="text-base font-medium text-foreground mb-1">
            Sign in to generate AI summary
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mb-5">
            LLM-powered gene summaries are available to signed-in users.
          </p>
          <Button onClick={() => login()} size="sm" className="gap-2">
            <LogIn className="w-4 h-4" />
            Sign in
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <LLMSummaryCard
      state={state}
      retry={retry}
      onAskFollowUp={onAskFollowUp}
      titleStripPattern={TITLE_STRIP}
    />
  );
}
