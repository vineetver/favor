import type { ConversationContext } from "../types";

export type QueryRoute =
  | { type: "explanation_only" }
  | { type: "full_agent" };

/**
 * Conservative classifier — defaults to "full_agent" when uncertain.
 * Only routes to "explanation_only" when highly confident the user
 * is asking a follow-up that needs no new data.
 */

const EXPLANATION_PATTERNS = /^(what does|what is|what are|meaning of|explain|in simpler terms|summarize|what tools|how many|which of those|tell me more about (that|the|those)|can you clarify|what do you mean|rephrase|say that again|break that down|why is that|how does that|what happened)\b/i;

const NEW_ENTITY_PATTERNS = /\b(look up|search for|find|analyze|run enrichment|get .+ for|compare|what about)\b/i;

const ENTITY_NAME_PATTERNS = /\b(rs\d+|ENSG\d+|chr\d+[:\-]\d+|[A-Z][A-Z0-9]{1,10}[0-9])\b/;

export function classifyQuery(
  userMessage: string,
  state: ConversationContext & { pendingAskUser?: boolean },
): QueryRoute {
  // Only consider explanation-only on follow-up turns
  if (state.turnCount === 0) {
    return { type: "full_agent" };
  }

  // If the prior turn asked the user a question, this is their answer — always full agent
  if (state.pendingAskUser) {
    return { type: "full_agent" };
  }

  const msg = userMessage.trim();

  // If the message requests new analysis or mentions new entities, full agent
  if (NEW_ENTITY_PATTERNS.test(msg)) {
    return { type: "full_agent" };
  }

  // If the message contains what looks like entity names (gene symbols, rsIDs), full agent
  if (ENTITY_NAME_PATTERNS.test(msg)) {
    return { type: "full_agent" };
  }

  // If the message matches explanation patterns and is a follow-up, explanation only
  if (EXPLANATION_PATTERNS.test(msg)) {
    return { type: "explanation_only" };
  }

  // Short messages on follow-up turns that don't contain entity names are likely explanations
  if (msg.length < 60 && state.turnCount > 0 && !msg.includes("?")) {
    // Very short non-question follow-ups like "yes", "ok", "thanks"
    if (msg.length < 20) {
      return { type: "explanation_only" };
    }
  }

  // Default: full agent
  return { type: "full_agent" };
}
