"use server";

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

/**
 * Server action to trigger AI summary generation for a gene
 */
const MAX_PROMPT_LENGTH = 12000;

export async function generateGeneSummary(params: {
  geneId: string;
  prompt: string;
  model?: string;
}): Promise<GenerateResponse> {
  const cookie = await getAuthCookie();

  if (
    typeof params.prompt !== "string" ||
    params.prompt.length > MAX_PROMPT_LENGTH
  ) {
    throw new Error(
      `Prompt must be a string of at most ${MAX_PROMPT_LENGTH} characters`,
    );
  }
  if (typeof params.geneId !== "string" || params.geneId.length > 64) {
    throw new Error("Invalid geneId");
  }
  const response = await fetch(`${API_BASE}/ai-text/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
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
