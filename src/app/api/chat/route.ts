import { createAgentUIStreamResponse } from "ai";
import { createFavorAgent } from "@features/agent/agent";
import { appendAgentMessage } from "@features/agent/lib/agent-api";
import { agentFetch } from "@features/agent/lib/api-client";
import type { EvidenceRef, ConversationContext } from "@features/agent/types";

export const maxDuration = 120;

/** Extract evidence refs from specialist tool results in the response message */
function extractEvidenceRefs(responseMessage: unknown): EvidenceRef[] {
  const refs: EvidenceRef[] = [];
  try {
    const msg = responseMessage as { parts?: Array<{ type: string; toolName?: string; output?: unknown }> };
    if (!msg?.parts) return refs;

    for (const part of msg.parts) {
      if (part.type !== "tool-invocation") continue;
      const name = (part.toolName ?? "").replace(/^tool-/, "");
      if (name !== "variantTriage" && name !== "bioContext") continue;

      const output = part.output as Record<string, unknown> | undefined;
      if (!output || output.error) continue;

      const partRefs = output.evidenceRefs as EvidenceRef[] | undefined;
      if (Array.isArray(partRefs)) {
        refs.push(...partRefs);
      }
    }
  } catch {
    // Non-critical — silently ignore
  }
  return refs;
}

/** Extract resolved entities from prior searchEntities calls in conversation */
function extractConversationContext(messages: unknown[]): ConversationContext {
  const resolvedEntities: Record<string, { type: string; id: string }> = {};
  let turnCount = 0;

  for (const msg of messages as Array<{
    role: string;
    parts?: Array<{ type: string; toolName?: string; output?: unknown }>;
  }>) {
    if (msg.role === "user") turnCount++;
    if (msg.role !== "assistant" || !msg.parts) continue;

    for (const part of msg.parts) {
      if (part.type !== "tool-invocation" || part.toolName !== "searchEntities")
        continue;
      const output = part.output as
        | { results?: Array<{ type: string; id: string; label: string }> }
        | undefined;
      if (!output?.results) continue;
      const top = output.results[0];
      if (top?.label && top?.type && top?.id) {
        resolvedEntities[top.label] = { type: top.type, id: top.id };
      }
    }
  }

  return { resolvedEntities, turnCount };
}

/** Persist evidence refs to the session (fire-and-forget) */
function persistEvidence(sessionId: string, refs: EvidenceRef[]): void {
  if (refs.length === 0) return;
  agentFetch(`/agent/sessions/${sessionId}/evidence`, {
    method: "POST",
    body: { evidence: refs },
  }).catch((err) => console.error("[chat/route] Failed to persist evidence:", err));
}

export async function POST(req: Request) {
  const { messages, sessionId, synthesisModel } = await req.json();

  // Persist user message (write-ahead) — fire-and-forget, don't block streaming
  if (sessionId) {
    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    if (lastUserMsg) {
      appendAgentMessage(sessionId, {
        role: "user",
        content: JSON.stringify(lastUserMsg),
      }).catch((err) => console.error("[chat/route] Failed to persist user message:", err));
    }
  }

  const agent = createFavorAgent(
    synthesisModel,
    extractConversationContext(messages),
  );

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    onFinish: sessionId
      ? ({ responseMessage }) => {
          // Persist assistant message
          appendAgentMessage(sessionId, {
            role: "assistant",
            content: JSON.stringify(responseMessage),
          }).catch((err) =>
            console.error("[chat/route] Failed to persist assistant message:", err),
          );

          // Persist evidence refs from specialist outputs (fire-and-forget)
          const refs = extractEvidenceRefs(responseMessage);
          persistEvidence(sessionId, refs);
        }
      : undefined,
  });
}
