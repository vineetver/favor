import { openai } from "@ai-sdk/openai";
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { AI_CONFIG } from './constants';
import { models, getModelById } from './models';
import { tools } from './tools';

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
});

export function getModelConfig(modelId: string) {
  const model = getModelById(modelId);
  return {
    maxTokens: AI_CONFIG.maxTokens,
    temperature: AI_CONFIG.temperature,
    topP: AI_CONFIG.topP,
    ...(model?.context && { maxInputTokens: model.context }),
  };
}

export const myProvider = customProvider({
  languageModels: {
    "gpt-4o-mini": openai("gpt-4o-mini"),
    "gpt-3.5-turbo": openai("gpt-3.5-turbo"),
    "deepseek-chat": wrapLanguageModel({
      model: deepseek("deepseek-reasoner"),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
  },
});

export { tools };
