'use server';

import { cookies } from 'next/headers';
import { generateText, type UIMessage } from 'ai';
import { myProvider } from '@/lib/ai';
import { getModelById } from '@/lib/ai/models';

export async function saveChatModelAsCookie(modelId: string) {
  // Validate model exists
  const model = getModelById(modelId);
  if (!model) {
    throw new Error(`Invalid model ID: ${modelId}`);
  }

  const cookieStore = await cookies();
  cookieStore.set('model-id', modelId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

// Legacy support for existing API
export async function saveModelId(modelId: string) {
  return saveChatModelAsCookie(modelId);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  try {
    const { text: title } = await generateText({
      model: myProvider.languageModel('title-model'),
      system: `Generate a concise title for this genomics/biology conversation:
      - Maximum 60 characters
      - Focus on the main biological concept (gene, variant, pathway, etc.)
      - Use scientific terminology when appropriate
      - No quotes or special characters`,
      prompt: JSON.stringify(message),
    });

    return title;
  } catch (error) {
    console.error('Failed to generate title:', error);
    // Fallback to a simple truncated version
    const content = typeof message.content === 'string' 
      ? message.content 
      : JSON.stringify(message.content);
    return content.substring(0, 50) + (content.length > 50 ? '...' : '');
  }
}

export async function getChatModelFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('model-id')?.value || null;
}

// Utility to validate and sanitize model selection
export async function ensureValidModel(modelId?: string): Promise<string> {
  const model = modelId ? getModelById(modelId) : null;
  
  if (model && !model.disabled) {
    return model.id;
  }
  
  // Fallback to default model
  const { DEFAULT_MODEL_NAME } = await import('@/lib/ai/models');
  return DEFAULT_MODEL_NAME;
}