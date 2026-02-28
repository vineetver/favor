import { createAgentUIStreamResponse, ToolLoopAgent, stepCountIs } from "ai";
import { createFavorAgent } from "@features/agent/agent";
import { appendAgentMessage } from "@features/agent/lib/agent-api";
import { agentFetch } from "@features/agent/lib/api-client";
import { classifyQuery } from "@features/agent/lib/query-classifier";
import { buildSupervisorPrompt } from "@features/agent/lib/prompts/supervisor-prompt";
import { getSynthesisModel, getSynthesisProviderOptions } from "@features/agent/lib/models";
import type { EvidenceRef, ConversationContext, ResultRef } from "@features/agent/types";

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

/** Extract resolved entities and prior result refs from conversation messages */
function extractConversationContext(messages: unknown[]): ConversationContext {
  const resolvedEntities: Record<string, { type: string; id: string }> = {};
  const priorResults: Array<{ ref: ResultRef; data: unknown }> = [];
  let turnCount = 0;

  for (const msg of messages as Array<{
    role: string;
    parts?: Array<{ type: string; toolName?: string; output?: unknown }>;
  }>) {
    if (msg.role === "user") turnCount++;
    if (msg.role !== "assistant" || !msg.parts) continue;

    for (const part of msg.parts) {
      if (part.type !== "tool-invocation") continue;
      const toolName = (part.toolName ?? "").replace(/^tool-/, "");
      const output = part.output as Record<string, unknown> | undefined;
      if (!output) continue;

      // Extract resolved entities from searchEntities
      if (toolName === "searchEntities") {
        const results = (output as { results?: Array<{ type: string; id: string; label: string }> }).results;
        if (results) {
          const top = results[0];
          if (top?.label && top?.type && top?.id) {
            resolvedEntities[top.label] = { type: top.type, id: top.id };
          }
        }
      }

      // Extract result refs from specialist outputs
      if (toolName === "bioContext" || toolName === "variantTriage") {
        if (output.error) continue;
        const resultRefs = output.resultRefs as ResultRef[] | undefined;
        if (Array.isArray(resultRefs)) {
          for (const ref of resultRefs) {
            // Extract corresponding data snapshot based on result type
            let data: unknown;
            switch (ref.type) {
              case "entity_list":
                data = output.entities;
                break;
              case "pathway_list":
                data = output.pathways;
                break;
              case "gene_list":
                data = output.topGenes;
                break;
              case "variant_list":
                data = output.topVariants;
                break;
              case "cohort":
                data = { cohortId: output.cohortId, derivedCohortId: output.derivedCohortId };
                break;
              default:
                // For neighbor_list, enrichment_list etc., we extract from toolTrace
                data = extractDataFromToolTrace(output, ref);
                break;
            }
            if (data) {
              priorResults.push({ ref, data });
            }
          }
        }
      }
    }
  }

  // turnCount represents *prior* turns — exclude the current user message
  return { resolvedEntities, turnCount: Math.max(0, turnCount - 1), priorResults: priorResults.length > 0 ? priorResults : undefined };
}

/** Extract stored data from specialist tool trace for a given ref */
function extractDataFromToolTrace(
  output: Record<string, unknown>,
  ref: ResultRef,
): unknown {
  const toolTrace = output.toolTrace as Array<{
    toolName: string;
    status: string;
    output?: unknown;
  }> | undefined;
  if (!toolTrace) return undefined;

  // Find matching tool trace entry
  const matching = toolTrace.filter(
    (t) => t.toolName === ref.toolName && t.status === "completed" && t.output,
  );
  // Use the entry index derived from the refId counter
  const refNum = parseInt(ref.refId.split("_").pop() ?? "1", 10);
  const entry = matching[refNum - 1];
  return entry?.output;
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

  const context = extractConversationContext(messages);

  // Extract last user message text for classification
  const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  const lastUserText = lastUserMsg?.parts
    ?.filter((p: { type: string }) => p.type === "text")
    ?.map((p: { text: string }) => p.text)
    ?.join(" ") ?? lastUserMsg?.content ?? "";

  const route = classifyQuery(lastUserText, context);

  // Fast-path: explanation-only (no tools, single LLM call)
  if (route.type === "explanation_only") {
    const synthProviderOpts = getSynthesisProviderOptions(synthesisModel);
    const fastAgent = new ToolLoopAgent({
      model: getSynthesisModel(synthesisModel),
      instructions: buildSupervisorPrompt() + "\n\n[SYSTEM] This is a follow-up. Write a thorough response using ONLY data from prior tool results in the conversation above. Do NOT call any tools. Do NOT use training knowledge to fill gaps.",
      tools: {},
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

  const agent = createFavorAgent(synthesisModel, context);

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
