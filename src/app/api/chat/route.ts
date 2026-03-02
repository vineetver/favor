import { createAgentUIStreamResponse, ToolLoopAgent, stepCountIs } from "ai";
import { createFavorAgentV2, createAgentToolsV2 } from "@features/agent/agent-v2";
import { appendAgentMessage } from "@features/agent/lib/agent-api";
import { classifyQuery } from "@features/agent/lib/query-classifier";
import { buildSystemPromptV2 } from "@features/agent/lib/prompts/system-v2";
import { getSynthesisModel, getSynthesisProviderOptions } from "@features/agent/lib/models";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { messages, sessionId, synthesisModel } = await req.json();

  // Persist user message (write-ahead) — fire-and-forget
  if (sessionId) {
    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    if (lastUserMsg) {
      appendAgentMessage(sessionId, {
        role: "user",
        content: JSON.stringify(lastUserMsg),
      }).catch((err) => console.error("[chat/route] Failed to persist user message:", err));
    }
  }

  // Extract last user message text for classification
  const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  const lastUserText = lastUserMsg?.parts
    ?.filter((p: { type: string }) => p.type === "text")
    ?.map((p: { text: string }) => p.text)
    ?.join(" ") ?? lastUserMsg?.content ?? "";

  // Classify query for fast-path
  const route = classifyQuery(lastUserText, {
    resolvedEntities: {},
    turnCount: messages.filter((m: { role: string }) => m.role === "user").length - 1,
  });

  const effectiveSessionId = sessionId ?? `ephemeral-${Date.now()}`;

  // Fast-path: explanation-only (no tools, single LLM call)
  if (route.type === "explanation_only") {
    const synthProviderOpts = getSynthesisProviderOptions(synthesisModel);
    const { tools } = createAgentToolsV2(effectiveSessionId);
    const fastAgent = new ToolLoopAgent({
      model: getSynthesisModel(synthesisModel),
      instructions: buildSystemPromptV2() + "\n\n[SYSTEM] This is a follow-up. Write a thorough response using ONLY data from prior tool results in the conversation above. Do NOT call any tools.",
      tools,
      stopWhen: stepCountIs(1),
      maxOutputTokens: 8000,
      ...(synthProviderOpts ? { providerOptions: synthProviderOpts } : {}),
    });

    return createAgentUIStreamResponse({
      agent: fastAgent,
      uiMessages: messages,
      onFinish: sessionId
        ? ({ responseMessage }) => {
            appendAgentMessage(sessionId, {
              role: "assistant",
              content: JSON.stringify(responseMessage),
            }).catch((err) =>
              console.error("[chat/route] Failed to persist assistant message:", err),
            );
          }
        : undefined,
    });
  }

  // Full agent loop
  const agent = createFavorAgentV2(effectiveSessionId, synthesisModel);

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    onFinish: sessionId
      ? ({ responseMessage }) => {
          appendAgentMessage(sessionId, {
            role: "assistant",
            content: JSON.stringify(responseMessage),
          }).catch((err) =>
            console.error("[chat/route] Failed to persist assistant message:", err),
          );
        }
      : undefined,
  });
}
