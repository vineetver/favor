import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";
import type { Variant, AmbiguousVariantResponse } from "@features/variant/types/variant";
import { buildVariantPrompt } from "@features/variant/utils/build-variant-prompt";

export const lookupVariant = tool({
  description:
    "Look up detailed annotation for a SINGLE variant by rsID (e.g., rs7412) or VCF notation (e.g., 19-44908684-T-C). Returns clinical significance, pathogenicity scores, population frequencies, and functional predictions. For multiple variants, use createCohort or variantBatchSummary instead.",
  inputSchema: z.object({
    identifier: z
      .string()
      .describe("Variant identifier — rsID (rs7412) or VCF (19-44908684-T-C)"),
  }),
  execute: async ({ identifier }) => {
    try {
      const data = await agentFetch<Variant | AmbiguousVariantResponse>(
        `/variants/${encodeURIComponent(identifier)}`,
      );

      // Check for ambiguous variant (rsID maps to multiple)
      if (data && typeof data === "object" && "ambiguous" in data && data.ambiguous) {
        const ambiguous = data as AmbiguousVariantResponse;
        const candidates = ambiguous.candidates?.slice(0, 5).map((c) => ({
          vcf: c.variant_vcf,
          chromosome: c.chromosome,
          position: c.position,
          gene: c.genecode?.genes?.filter(Boolean)?.join(", "),
        }));
        return {
          ambiguous: true,
          message:
            "Multiple variants match this identifier. Ask the user which one, or use the VCF notation.",
          candidates,
        };
      }

      // Use the existing buildVariantPrompt for rich, structured output
      const variant = data as Variant;
      const prompt = buildVariantPrompt(variant);

      // Strip the instructions section — the agent doesn't need summarization directions
      const instructionsIdx = prompt.indexOf("\n\n---\n\n**Instructions**");
      return instructionsIdx > 0 ? prompt.slice(0, instructionsIdx) : prompt;
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
