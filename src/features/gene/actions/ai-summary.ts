"use server";

import { API_BASE } from "@/config/api";

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
 * Server action to fetch cached AI summary for a gene
 */
export async function getGeneSummary(
  geneId: string,
): Promise<{ data: AITextData | null }> {
  const searchParams = new URLSearchParams({
    entity_type: "gene",
    entity_id: geneId,
    content_type: "summary",
  });

  const response = await fetch(`${API_BASE}/ai-text?${searchParams}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FAVOR_API_KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { data: null };
    }
    throw new Error(`Failed to fetch AI text: ${response.status}`);
  }

  const data = await response.json();
  return { data };
}

/**
 * Server action to trigger AI summary generation for a gene
 */
const MAX_PROMPT_LENGTH = 12000;

export async function generateGeneSummary(params: {
  geneId: string;
  prompt: string;
  model?: string;
}): Promise<GenerateResponse> {
  if (typeof params.prompt !== "string" || params.prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt must be a string of at most ${MAX_PROMPT_LENGTH} characters`);
  }
  if (typeof params.geneId !== "string" || params.geneId.length > 64) {
    throw new Error("Invalid geneId");
  }
  const response = await fetch(`${API_BASE}/ai-text/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FAVOR_API_KEY}`,
    },
    body: JSON.stringify({
      entity_type: "gene",
      entity_id: params.geneId,
      content_type: "summary",
      prompt: params.prompt,
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
