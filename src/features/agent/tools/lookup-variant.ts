import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";
import type { Variant, AmbiguousVariantResponse } from "@features/variant/types/variant";
import { buildVariantPrompt } from "@features/variant/utils/build-variant-prompt";

export const lookupVariant = tool({
  description:
    "Look up annotation for a SINGLE variant by rsID (e.g., rs7412) or VCF notation (e.g., 19-44908684-T-C). Returns clinical significance, pathogenicity scores, population frequencies, and functional predictions. Use depth=standard (default) for most queries; depth=detailed only when the user explicitly needs full raw annotations. For multiple variants, use createCohort or variantBatchSummary instead.",
  inputSchema: z.object({
    identifier: z
      .string()
      .describe("Variant identifier — rsID (rs7412) or VCF (19-44908684-T-C)"),
    depth: z
      .enum(["minimal", "standard", "detailed"])
      .optional()
      .default("standard")
      .describe(
        "Response detail: minimal (~50 tokens, 7 fields), standard (~150 tokens, 19 key scores — default), detailed (full ~3-5K tokens, all annotation groups)",
      ),
  }),
  execute: async ({ identifier, depth }) => {
    try {
      const d = depth ?? "standard";
      const data = await agentFetch<Record<string, unknown>>(
        `/variants/${encodeURIComponent(identifier)}?depth=${d}`,
      );

      // Check for ambiguous variant (rsID maps to multiple)
      if (data && typeof data === "object" && "ambiguous" in data && data.ambiguous) {
        const ambig = data as { ambiguous: true; rsid: string; candidates: unknown[] };
        return {
          ambiguous: true,
          message:
            "Multiple variants match this identifier. Ask the user which one, or use the VCF notation.",
          candidates: ambig.candidates?.slice(0, 5),
        };
      }

      // For detailed depth, use buildVariantPrompt for rich formatting
      if (d === "detailed") {
        const variant = data as unknown as Variant;
        const prompt = buildVariantPrompt(variant);
        const instructionsIdx = prompt.indexOf("\n\n---\n\n**Instructions**");
        return instructionsIdx > 0 ? prompt.slice(0, instructionsIdx) : prompt;
      }

      // For standard/minimal, return directly (already compact)
      return data;
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
