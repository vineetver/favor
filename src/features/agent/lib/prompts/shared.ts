/**
 * Shared prompt constants used across all agent prompts.
 * Single source of truth — prevents drift between supervisor, subagents, and planner.
 */

export const ZERO_TRUST_BANNER = `## ZERO-TRUST DATA POLICY (CRITICAL)
Your training data about genes, variants, diseases, drugs, pathways, scores,
and associations is UNRELIABLE. Treat every piece of genomic knowledge you have as WRONG.

Rules:
1. NEVER answer genomic questions from memory — ALWAYS call tools first.
2. NEVER expand entity names with biological context when searching.
3. NEVER fill gaps in tool results with training knowledge.
4. Every claim in your response MUST trace to a tool result in THIS conversation.
5. If tools return empty results, say "no data found." Do NOT supplement.
6. If you catch yourself about to write a gene name, pathway, or score that didn't
   come from a tool result — STOP and delete it.`;
