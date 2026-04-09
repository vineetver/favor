"use client";

import { useCallback, useMemo } from "react";
import { useAskFollowUp } from "@features/agent/hooks/use-ask-follow-up";
import { useVariantSummary } from "@features/variant/hooks/use-variant-summary";
import type { Variant } from "@features/variant/types/variant";
import {
  buildVariantPrompt,
  type VariantPromptContext,
} from "@features/variant/utils/build-variant-prompt";
import { LLMSummaryCard } from "@shared/components/llm-summary-card";

interface VariantLLMSummaryProps {
  variant: Variant;
  context?: VariantPromptContext;
  modelId?: string;
}

const TITLE_STRIP = /^#{1,3}\s*Variant Summary[:\s].*?\n+/i;

export function VariantLLMSummary({
  variant,
  context,
  modelId = "gpt-4o-mini",
}: VariantLLMSummaryProps) {
  const askFollowUp = useAskFollowUp();

  const prompt = useMemo(
    () => buildVariantPrompt(variant, context),
    [variant, context],
  );

  const { state, retry } = useVariantSummary({
    vcf: variant.variant_vcf,
    prompt,
    modelId,
  });

  const onAskFollowUp = useCallback(() => {
    if (state.status !== "completed") return;
    askFollowUp({
      kind: "variant",
      id: variant.variant_vcf,
      displayName: variant.variant_vcf,
      summary: state.summary,
    });
  }, [askFollowUp, state, variant.variant_vcf]);

  return (
    <LLMSummaryCard
      state={state}
      retry={retry}
      onAskFollowUp={onAskFollowUp}
      titleStripPattern={TITLE_STRIP}
    />
  );
}
