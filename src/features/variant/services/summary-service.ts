import { openai } from "@/lib/openai";

/**
 * Service layer for AI interactions
 * Separates business logic from data access layer
 */

/**
 * Generates a summary for a variant using AI
 * @param vcf - The variant VCF identifier
 * @param model - The AI model to use
 * @returns The generated summary text
 */
export async function generateSummaryWithAI(
  vcf: string,
  model: string = "gpt-4o-mini",
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that summarizes genetic variants. Provide a concise, clinical summary.",
        },
        {
          role: "user",
          content: `Please provide a summary for the variant: ${vcf}.`,
        },
      ],
    });

    const summary =
      completion.choices[0].message.content || "No summary generated.";

    return summary;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw new Error(
      `Failed to generate AI summary: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
