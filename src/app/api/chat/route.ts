import { myProvider, tools } from "@/lib/ai";
import { systemPrompt } from "@/lib/ai/prompts";
import { isReasoningModel } from "@/lib/ai/models";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 600;

export async function POST(req: Request) {
  const {
    messages,
    model,
  }: {
    messages: UIMessage[];
    model: string;
  } = await req.json();

  const result = streamText({
    model: myProvider.languageModel(model),
    providerOptions: isReasoningModel(model) ? {
      openai: {
        reasoningEffort: 'low',
      } satisfies OpenAIResponsesProviderOptions,
    } : undefined,
    messages: convertToModelMessages(messages),
    tools: tools,
    stopWhen: stepCountIs(10),
    system:  systemPrompt(model)
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
