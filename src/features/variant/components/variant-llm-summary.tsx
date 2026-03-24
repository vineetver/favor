"use client";

import { useVariantChat } from "@features/variant/hooks/use-variant-chat";
import { useVariantSummary } from "@features/variant/hooks/use-variant-summary";
import type { Variant } from "@features/variant/types/variant";
import {
  buildVariantPrompt,
  type VariantPromptContext,
} from "@features/variant/utils/build-variant-prompt";
import { LLMSummaryCard } from "@shared/components/llm-summary-card";
import { useMemo } from "react";

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
  const { openChat } = useVariantChat();

  const prompt = useMemo(
    () => buildVariantPrompt(variant, context),
    [variant, context],
  );

  const { state, retry } = useVariantSummary({
    vcf: variant.variant_vcf,
    prompt,
    modelId,
  });

  return (
    <LLMSummaryCard
      state={state}
      retry={retry}
      onAskFollowUp={openChat}
      titleStripPattern={TITLE_STRIP}
    />
  );
}
