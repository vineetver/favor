import { createAgentUIStreamResponse, ToolLoopAgent, stepCountIs, type UIMessage } from "ai";
import { createFavorAgent, createAgentTools } from "@features/agent/agent";
import { appendAgentMessage } from "@features/agent/lib/agent-api";
import { classifyQuery } from "@features/agent/lib/query-classifier";
import { buildSystemPrompt } from "@features/agent/lib/prompts/system";
import { getSynthesisModel, getSynthesisProviderOptions } from "@features/agent/lib/models";
import { compactMessageForStorage } from "@features/agent/lib/compact-message";
import { requireAuth } from "../_lib/require-auth";

export const maxDuration = 120;

/** Persist assistant message with compaction. Falls back to full message on error. */
async function persistCompacted(
  sessionId: string,
  responseMessage: UIMessage,
  vizSpecs?: unknown[],
) {
  // Embed vizSpecs in the serialized message so they survive the round-trip
  const embed = (msg: UIMessage) =>
    vizSpecs?.length ? { ...msg, _vizSpecs: vizSpecs } : msg;

  try {
    const compacted = await compactMessageForStorage(sessionId, responseMessage);
    await appendAgentMessage(sessionId, {
      role: "assistant",
      content: JSON.stringify(embed(compacted)),
    });
  } catch (err) {
    console.error("[chat/route] Compaction failed, persisting full message:", err);
    await appendAgentMessage(sessionId, {
      role: "assistant",
      content: JSON.stringify(embed(responseMessage)),
    });
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

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

  // Detect if prior assistant turn contained an AskUser tool call
  const lastAssistantMsg = [...messages].reverse().find((m: { role: string }) => m.role === "assistant");
  const pendingAskUser = !!(lastAssistantMsg?.parts ?? []).some(
    (p: { type: string; toolName?: string }) =>
      p.type === "tool-invocation" && p.toolName === "AskUser",
  );

  // Classify query for fast-path
  const route = classifyQuery(lastUserText, {
    resolvedEntities: {},
    turnCount: messages.filter((m: { role: string }) => m.role === "user").length - 1,
    pendingAskUser,
  });

  const effectiveSessionId = sessionId ?? `ephemeral-${Date.now()}`;

  // Fast-path: explanation-only (no tools, single LLM call)
  if (route.type === "explanation_only") {
    const synthProviderOpts = getSynthesisProviderOptions(synthesisModel);
    const { tools } = createAgentTools(effectiveSessionId);
    const fastAgent = new ToolLoopAgent({
      model: getSynthesisModel(synthesisModel),
      instructions: buildSystemPrompt() + "\n\n[SYSTEM] This is a follow-up. Write a thorough response using ONLY data from prior tool results in the conversation above. Do NOT call any tools.",
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
            persistCompacted(sessionId, responseMessage).catch((err) =>
              console.error("[chat/route] Failed to persist assistant message:", err),
            );
          }
        : undefined,
    });
  }

  // Full agent loop
  const { agent, getVizSpecs } = createFavorAgent(effectiveSessionId, synthesisModel);

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    onFinish: sessionId
      ? ({ responseMessage }) => {
          persistCompacted(sessionId, responseMessage, getVizSpecs()).catch((err) =>
            console.error("[chat/route] Failed to persist assistant message:", err),
          );
        }
      : undefined,
  });
}
