import { tool, generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { SubagentOutput } from "../../types";
import { searchEntities } from "../search-entities";
import { getEntityContext } from "../entity-context";
import { getRankedNeighbors } from "../ranked-neighbors";
import { findPaths } from "../find-paths";
import { getSharedNeighbors } from "../shared-neighbors";
import { graphTraverse } from "../graph-traverse";
import { compareEntities } from "../compare-entities";

const GRAPH_EXPLORER_PROMPT = `You are a focused graph exploration sub-agent for the FAVOR biomedical knowledge graph.

Your job: Given seed entities and a task, explore the knowledge graph to answer the question. You have access to graph-focused tools only.

RULES:
- Use findPaths for "how connected" questions between two entities.
- Use getRankedNeighbors for "top X neighbors" with a specific edge type.
- Use getSharedNeighbors to find common connections between entities.
- Use graphTraverse only for multi-hop queries that simpler tools can't answer.
- Use compareEntities for side-by-side comparison of two entities.
- Use getEntityContext for detailed information about a single entity.
- Use searchEntities to resolve entity names you discover during exploration.
- Chain tools intelligently: each result informs the next call.
- When done, write a clear summary of what you found.

IDENTIFIERS:
- IDs use underscores: MONDO_0005070, HP_0000001, GO_0008150
- Edge types are UPPER_SNAKE_CASE: ASSOCIATED_WITH_DISEASE, TARGETS, etc.
- Direction is auto-inferred by the server. Omit unless overriding for self-edges.`;

const GRAPH_TOOLS = {
  searchEntities,
  getEntityContext,
  getRankedNeighbors,
  findPaths,
  getSharedNeighbors,
  graphTraverse,
  compareEntities,
};

const SUBAGENT_TIMEOUT = 90_000; // 90s

export const graphExplorer = tool({
  description:
    "Delegate complex multi-hop graph exploration to a focused sub-agent. Use for 3+ hop queries, complex network analysis, or mechanism-of-action exploration. Do NOT use for simple 1-2 tool call queries.",
  inputSchema: z.object({
    task: z
      .string()
      .describe("Natural language description of the exploration task"),
    seedEntities: z
      .array(
        z.object({
          type: z.string().describe("Entity type (e.g., Gene, Disease)"),
          id: z.string().describe("Entity ID (e.g., ENSG00000012048)"),
          label: z.string().optional().describe("Human-readable label"),
        }),
      )
      .min(1)
      .describe("Starting entities for exploration"),
    maxHops: z
      .number()
      .optional()
      .default(3)
      .describe("Maximum exploration depth (default 3)"),
  }),
  execute: async ({
    task,
    seedEntities,
    maxHops,
  }): Promise<SubagentOutput | { error: boolean; message: string }> => {
    try {
      const result = await Promise.race([
        generateText({
          model: openai("gpt-4o"),
          system: GRAPH_EXPLORER_PROMPT,
          prompt: `Task: ${task}\nSeed entities: ${JSON.stringify(seedEntities)}\nMax exploration depth: ${maxHops}`,
          tools: GRAPH_TOOLS,
          stopWhen: stepCountIs(8),
          maxOutputTokens: 4000,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Subagent timeout")),
            SUBAGENT_TIMEOUT,
          ),
        ),
      ]);

      return {
        summary: result.text,
        stepsUsed: result.steps.length,
        toolCallsMade: result.steps.reduce(
          (sum, step) => sum + step.toolCalls.length,
          0,
        ),
        toolsUsed: [
          ...new Set(
            result.steps.flatMap((s) =>
              s.toolCalls.map((tc) => tc.toolName),
            ),
          ),
        ],
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown subagent error";
      return {
        error: true,
        message: `Graph explorer failed: ${message}`,
      };
    }
  },
});
