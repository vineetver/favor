"use server";

import {
  fetchChromBpnetByTissueGroup,
  fetchMethylationByTissueGroup,
  fetchQtlsByTissueGroup,
  fetchRegionSummary,
  fetchSignalsByTissueGroup,
  fetchTargetGenes,
  fetchVariantAllelicImbalanceByTissueGroup,
} from "@features/enrichment/api/region";
import { fetchVariantSignals } from "@features/variant/api/credible-sets-graph";
import { fetchGwasAssociations } from "@features/variant/api/gwas";
import { buildVariantContext } from "@features/variant/utils/build-variant-context";
import { buildVariantPrompt } from "@features/variant/utils/build-variant-prompt";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { cookies } from "next/headers";
import { API_BASE } from "@/config/api";

async function getAuthCookie(): Promise<string> {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();
  if (!cookie) throw new Error("Unauthorized");

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) throw new Error("Unauthorized");
  return cookie;
}

export interface AITextData {
  content: string | null;
  status: string;
  model?: string;
  completed_at?: string;
}

export interface GenerateResponse {
  status: "pending" | "generating" | "completed" | "failed";
  request_id: string;
  content?: string;
  error?: string;
  estimated_seconds?: number;
}

/**
 * Server action to fetch cached AI summary for a variant
 */
export async function getVariantSummary(
  vcf: string,
): Promise<{ data: AITextData | null }> {
  const searchParams = new URLSearchParams({
    entity_type: "variant",
    entity_id: vcf,
    content_type: "summary",
  });

  const cookieStore = await cookies();
  const response = await fetch(`${API_BASE}/ai-text?${searchParams}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404 || response.status === 401) {
      return { data: null };
    }
    throw new Error(`Failed to fetch AI text: ${response.status}`);
  }

  const data = await response.json();
  return { data };
}

const MAX_PROMPT_LENGTH = 12000;

/**
 * Server action to trigger AI summary generation for a variant.
 * Fetches variant + regulatory/tissue evidence and builds the prompt server-side
 * so callers don't pay the cost on cache hits.
 */
export async function generateVariantSummary(params: {
  vcf: string;
  model?: string;
}): Promise<GenerateResponse> {
  if (typeof params.vcf !== "string" || params.vcf.length > 64) {
    throw new Error("Invalid vcf identifier");
  }

  const cookie = await getAuthCookie();

  const result = await fetchVariantWithCookie(params.vcf).catch(() => null);
  if (!result) {
    throw new Error(`Variant not found: ${params.vcf}`);
  }

  const variant = result.selected;
  const loc = `${variant.chromosome}-${variant.position}-${variant.position}`;

  const catchNull = (label: string) => (err: unknown) => {
    console.error(`[variant-llm] ${label} failed:`, err);
    return null;
  };
  const catchEmpty = (label: string) => (err: unknown) => {
    console.error(`[variant-llm] ${label} failed:`, err);
    return [] as never[];
  };

  const [
    gwas,
    credibleSets,
    targetGenes,
    qtls,
    regionSummary,
    signals,
    chromBpnet,
    allelicImbalance,
    methylation,
  ] = await Promise.all([
    fetchGwasAssociations(variant.variant_vcf, { limit: 10 }).catch(
      catchNull("gwas"),
    ),
    fetchVariantSignals(variant.variant_vcf, 100).catch(
      catchEmpty("credibleSets"),
    ),
    fetchTargetGenes(variant.variant_vcf, 10).catch(catchEmpty("targetGenes")),
    fetchQtlsByTissueGroup(variant.variant_vcf).catch(catchEmpty("qtls")),
    fetchRegionSummary(loc).catch(catchNull("regionSummary")),
    fetchSignalsByTissueGroup(loc).catch(catchEmpty("signals")),
    fetchChromBpnetByTissueGroup(variant.variant_vcf).catch(
      catchEmpty("chromBpnet"),
    ),
    fetchVariantAllelicImbalanceByTissueGroup(variant.variant_vcf).catch(
      catchEmpty("allelicImbalance"),
    ),
    fetchMethylationByTissueGroup(variant.variant_vcf).catch(
      catchEmpty("methylation"),
    ),
  ]);

  const context = buildVariantContext({
    gwas,
    credibleSets,
    targetGenes,
    qtls,
    regionSummary,
    signals,
    chromBpnet,
    allelicImbalance,
    methylation,
  });

  const prompt = buildVariantPrompt(variant, context);

  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(
      `Prompt must be a string of at most ${MAX_PROMPT_LENGTH} characters`,
    );
  }

  const response = await fetch(`${API_BASE}/ai-text/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      entity_type: "variant",
      entity_id: params.vcf,
      content_type: "summary",
      prompt,
      model: params.model ?? "gpt-4o-mini",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to generate AI text: ${response.status} - ${errorText}`,
    );
  }

  return response.json();
}
