"use server";

import { cookies } from "next/headers";
import { generateText, type UIMessage } from "ai";
import { myProvider } from "@/lib/ai";
import { getModelById } from "@/lib/ai/models";

export async function saveChatModelAsCookie(modelId: string) {
  // Validate model exists
  const model = getModelById(modelId);
  if (!model) {
    throw new Error(`Invalid model ID: ${modelId}`);
  }

  const cookieStore = await cookies();
  cookieStore.set("model-id", modelId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

// Legacy support for existing API
export async function saveModelId(modelId: string) {
  return saveChatModelAsCookie(modelId);
}

export async function getChatModelFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("model-id")?.value || null;
}

// Utility to validate and sanitize model selection
export async function ensureValidModel(modelId?: string): Promise<string> {
  const model = modelId ? getModelById(modelId) : null;

  if (model && !model.disabled) {
    return model.id;
  }

  // Fallback to default model
  const { DEFAULT_MODEL_NAME } = await import("@/lib/ai/models");
  return DEFAULT_MODEL_NAME;
}
