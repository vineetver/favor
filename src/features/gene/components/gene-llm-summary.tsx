"use client";

import { useGeneSummary } from "@features/gene/hooks/use-gene-summary";
import type { Gene } from "@features/gene/types";
import {
  buildGenePrompt,
  type GenePromptContext,
} from "@features/gene/utils/build-gene-prompt";
import { LLMSummaryCard } from "@shared/components/llm-summary-card";
import { useCallback, useMemo } from "react";

interface GeneLLMSummaryProps {
  geneId: string;
  gene?: Gene | null;
  context?: GenePromptContext;
}

const TITLE_STRIP = /^#{1,3}\s*Gene Summary[:\s].*?\n+/i;

export function GeneLLMSummary({ geneId, gene, context }: GeneLLMSummaryProps) {
  const prompt = useMemo(
    () => (gene ? buildGenePrompt(gene, context) : undefined),
    [gene, context],
  );

  const { state, retry } = useGeneSummary({ geneId, prompt });

  const openChat = useCallback(() => {
    document.getElementById("chatbot-trigger-button")?.click();
  }, []);

  return (
    <LLMSummaryCard
      state={state}
      retry={retry}
      onAskFollowUp={openChat}
      titleStripPattern={TITLE_STRIP}
    />
  );
}
