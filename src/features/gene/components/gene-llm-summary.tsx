"use client";

import { useAskFollowUp } from "@features/agent/hooks/use-ask-follow-up";
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
  const askFollowUp = useAskFollowUp();

  const prompt = useMemo(
    () => (gene ? buildGenePrompt(gene, context) : undefined),
    [gene, context],
  );

  const { state, retry } = useGeneSummary({ geneId, prompt });

  const onAskFollowUp = useCallback(() => {
    if (state.status !== "completed") return;
    askFollowUp({
      kind: "gene",
      id: geneId,
      displayName: gene?.gene_symbol ?? geneId,
      summary: state.summary,
    });
  }, [askFollowUp, state, geneId, gene?.gene_symbol]);

  return (
    <LLMSummaryCard
      state={state}
      retry={retry}
      onAskFollowUp={onAskFollowUp}
      titleStripPattern={TITLE_STRIP}
    />
  );
}
