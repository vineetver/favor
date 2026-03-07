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

/**
 * Action verbs that ALWAYS mean tool use, regardless of message length.
 * Catches "now show drugs" (16 chars), "group by gene" (13 chars), "top 20" (6 chars).
 */
const ACTION_PATTERNS = [
  /^(show|find|get|list|rank|sort|filter|group|run|try|use|compare)\b/i,
  /^(explore|traverse|search|check|analyze|plot|export|switch|pin)\b/i,
  /^(now|then|next|also|and)\s+/i,       // Continuation markers
  /^(top|bottom)\s+\d+/i,                // "top 20"
  /^(by|for|with|from)\s+/i,             // "by gene", "for BRCA2"
  /^(more|less|fewer|increase|decrease)\b/i,
  /\b(limit|offset|page|scroll)\b/i,
];

/** Pure acknowledgements — safe to route to explanation_only */
const ACKNOWLEDGEMENT_PATTERN = /^(ok|okay|thanks|thank you|got it|sure|yes|no|yep|nope|cool|great|nice|perfect|understood|i see|makes sense)\.?$/i;

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

  // Action verbs always route to full agent — even on short messages
  if (ACTION_PATTERNS.some((p) => p.test(msg))) {
    return { type: "full_agent" };
  }

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

  // Pure acknowledgements ("ok", "thanks", "got it") are safe as explanation_only
  if (ACKNOWLEDGEMENT_PATTERN.test(msg)) {
    return { type: "explanation_only" };
  }

  // Default: full agent — never assume a message is explanation-only
  return { type: "full_agent" };
}
