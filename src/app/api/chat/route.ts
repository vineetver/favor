import {
  convertToModelMessages,
  streamText,
  stepCountIs,
} from "ai";
import { systemPrompt } from "@/lib/ai/prompts";
import { myProvider, getModelConfig, tools } from "@/lib/ai";
import { models } from "@/lib/ai/models";
import { ChatSDKError } from "@/lib/chatbot/errors";
import type { ChatMessage } from "@/lib/chatbot/types";
import { postRequestBodySchema, type PostRequestBody } from "./schema";

export const maxDuration = 600;

export async function POST(request: Request) {
  const startTime = performance.now();
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const { messages, selectedChatModel } = requestBody;

  const model = models.find((model) => model.id === selectedChatModel);
  if (!model) {
    return new Response("Model not found", { status: 404 });
  }

  // Check API key availability based on model provider
  if (
    (model.id.startsWith("gpt-") || model.id === "gpt-5" || model.id === "gpt-5-nano" || model.id.startsWith("o1-")) &&
    !process.env.OPENAI_API_KEY
  ) {
    console.error(`[API] OpenAI API key not configured for model: ${model.id}`);
    return new Response("OpenAI API key not configured", { status: 500 });
  }

  if (model.id.startsWith("deepseek-") && !process.env.DEEPSEEK_API_KEY) {
    console.error(`[API] DeepSeek API key not configured for model: ${model.id}`);
    return new Response("DeepSeek API key not configured", { status: 500 });
  }

  // Convert the message history into proper format for the AI model
  console.log("[API] Processing messages:", messages.length, "messages for", model.apiIdentifier);
  const uiMessages: ChatMessage[] = messages;

  const modelConfig = getModelConfig(selectedChatModel);

  console.log('[API] Model selection:', {
    selectedId: selectedChatModel,
    modelFound: model.id,
    apiIdentifier: model.apiIdentifier,
    label: model.label,
    reasoning: model.reasoning,
    context: model.context,
    config: modelConfig
  });
  
  // Timing variables
  let firstToolCallTime: number | null = null;
  let lastToolResultTime: number | null = null;
  let responseStreamStartTime: number | null = null;
  
  const result = streamText({
    model: myProvider.languageModel(model.apiIdentifier),
    providerOptions: {
      openai: { reasoningEffort: 'minimal' },
    },
    system: systemPrompt(model),
    stopWhen: stepCountIs(10),
    messages: convertToModelMessages(uiMessages),
    tools: tools && Object.keys(tools).length > 0 ? tools : undefined,
    onStepFinish: (step) => {
      const stepTime = performance.now();
      
      if (step.toolCalls && step.toolCalls.length > 0) {
        // First tool call
        if (firstToolCallTime === null) {
          firstToolCallTime = stepTime;
          const queryToToolTime = firstToolCallTime - startTime;
        }
        
        // Track tool results
        step.toolCalls.forEach((toolCall) => {
        });
      }
      
      if (step.toolResults && step.toolResults.length > 0) {
        lastToolResultTime = stepTime;
        step.toolResults.forEach(() => {
        });
      }
    },
    onFinish: () => {
      const finishTime = performance.now();
      responseStreamStartTime = finishTime;
      
      if (lastToolResultTime && responseStreamStartTime) {
        const toolToResponseTime = responseStreamStartTime - lastToolResultTime;
      }
      
      const totalTime = finishTime - startTime;
      
      // Summary timing log
      if (firstToolCallTime && lastToolResultTime && responseStreamStartTime) {
        console.log(`[TIMING SUMMARY] Query→Tool: ${(firstToolCallTime - startTime).toFixed(2)}ms | Tool→Response: ${(responseStreamStartTime - lastToolResultTime).toFixed(2)}ms | Total: ${totalTime.toFixed(2)}ms`);
      }
    },
  });

  return result.toUIMessageStreamResponse(
    {
      sendReasoning: true,
    }
  );
}
