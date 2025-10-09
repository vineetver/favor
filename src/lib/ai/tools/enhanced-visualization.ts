import { z } from "zod";
import { tool } from "ai";

export function createBarChart() {
  return tool({
    description: "Create a bar chart visualization from categorical data. Use descriptive axis labels that explain what the data represents (e.g., 'Clinical Significance', 'Gene Expression Level', 'Chromosome').",
    inputSchema: z.object({
      data: z
        .array(
          z.object({
            category: z.string(),
            value: z.number(),
            color: z.string().optional(),
          }),
        )
        .describe("Array of categories and values for the bar chart"),
      title: z.string().describe("Descriptive chart title"),
      xLabel: z.string().describe("X-axis label describing what the categories represent (e.g., 'Clinical Significance', 'Tissue Type', 'Variant Classification')"),
      yLabel: z.string().describe("Y-axis label describing what the values represent (e.g., 'Count', 'Frequency', 'Expression Level')"),
      orientation: z
        .enum(["horizontal", "vertical"])
        .optional()
        .describe("Bar orientation (default: vertical)"),
      width: z.number().optional().describe("Chart width in pixels (default: 400)"),
      height: z.number().optional().describe("Chart height in pixels (default: 300)"),
    }),
    execute: async ({
      data,
      title,
      xLabel,
      yLabel,
      orientation = "vertical",
      width = 400,
      height = 300,
    }) => {
      return {
        type: "chart",
        chartType: "bar",
        data,
        config: {
          title,
          xLabel,
          yLabel,
          orientation,
          width,
          height,
          keys: ["value"],
          indexBy: "category",
        },
        metadata: {
          chartType: "bar",
          categories: data.length,
        },
      };
    },
  });
}
