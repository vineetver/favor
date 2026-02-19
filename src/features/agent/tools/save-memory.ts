import { tool } from "ai";
import { z } from "zod";
import { upsertMemory } from "../lib/agent-api";
import { AgentToolError } from "../lib/api-client";

export const saveMemory = tool({
  description:
    "Save a fact, user preference, cohort reference, or workflow pattern for recall in future sessions. Use a memory_key for things that should be updated (upserted) rather than duplicated. Examples: 'cohort coh_abc contains 150 BRCA1 variants with 15 Pathogenic (ClinVar)', 'user is interested in Alzheimer's drug targets'.",
  inputSchema: z.object({
    memory_type: z
      .enum(["preference", "fact", "cohort", "workflow"])
      .describe(
        "Type of memory: 'preference' for user settings, 'fact' for discovered knowledge, 'cohort' for cohort references, 'workflow' for analysis patterns",
      ),
    content: z
      .string()
      .describe(
        "Human-readable description of the memory (used for semantic search)",
      ),
    memory_key: z
      .string()
      .optional()
      .describe(
        "Unique key for upsert — if a memory with this key exists, it will be updated. Omit to always create a new memory.",
      ),
    value: z
      .record(z.unknown())
      .optional()
      .describe(
        "Structured JSON data to store alongside the text content (e.g., { cohortId: 'coh_abc', variantCount: 150 })",
      ),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(1.0)
      .describe("Confidence level 0.0-1.0 (default 1.0)"),
  }),
  execute: async ({ memory_type, content, memory_key, value, confidence }) => {
    if (!content.trim()) {
      return { error: true, message: "Memory content cannot be empty" };
    }

    try {
      const memory = await upsertMemory({
        scope: "user",
        memory_type,
        memory_key,
        content,
        value,
        confidence,
      });

      return {
        saved: true,
        id: memory.id,
        type: memory.memory_type,
        key: memory.memory_key,
        content: memory.content,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
