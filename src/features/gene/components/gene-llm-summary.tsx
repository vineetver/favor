"use client";

import { useGeneSummary } from "@features/gene/hooks/use-gene-summary";
import { LLMSummaryCard } from "@shared/components/llm-summary-card";
import { useCallback } from "react";

interface GeneLLMSummaryProps {
  geneId: string;
}

const TITLE_STRIP = /^#{1,3}\s*Gene Summary[:\s].*?\n+/i;

export function GeneLLMSummary({ geneId }: GeneLLMSummaryProps) {
  const { state, retry } = useGeneSummary({ geneId });

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
