import { z } from "zod";
import { tool } from "ai";

const seriesSchema = z.object({
  type: z.literal("bar").describe("Must be 'bar' for bar chart series"),
  dataKey: z.string().min(1).describe("REQUIRED: The key in each data row to read numeric values from"),
  label: z.string().describe("REQUIRED: Label displayed in legends and tooltips"),
  color: z.string().optional().describe("Optional: Color for the series (e.g., 'blue', 'purple', '#3b82f6')"),
});

const xAxisSchema = z.object({
  dataKey: z.string().min(1).describe("REQUIRED: The data key to use for x-axis categories"),
});

const dataRowSchema = z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]));

export function createBarChart() {
  return tool({
    description: `Create a bar chart visualization from tabular data with strict schema enforcement.

REQUIRED STRUCTURE - All fields marked REQUIRED must be provided:
{
  "title": "Population Allele Frequencies",
  "data": [
    { "population": "AFR (African)", "frequency": 10.5 },
    { "population": "NFE (Non-Finnish European)", "frequency": 8.2 }
  ],
  "series": [
    { "type": "bar", "dataKey": "frequency", "label": "Allele Frequency" }
  ],
  "xAxis": { "dataKey": "population" },
  "yAxisLabel": "Frequency (%)"
}

The data array must contain at least 1 item. Each series must specify which dataKey to visualize.
`,
    inputSchema: z.object({
      title: z.string().min(1).describe("REQUIRED: Chart title (cannot be empty)"),
      data: z
        .array(dataRowSchema)
        .min(1)
        .describe("REQUIRED: Array of data objects (minimum 1 item). Each object can have any keys with string/number values."),
      series: z
        .array(seriesSchema)
        .min(1)
        .describe("REQUIRED: Array of series definitions (minimum 1 series). Each series specifies which data key to render as bars."),
      xAxis: xAxisSchema.describe("REQUIRED: X-axis configuration with dataKey"),
      yAxisLabel: z.string().optional().describe("Optional: Y-axis label (e.g., 'Count', 'Frequency (%)', 'Expression Level')"),
      height: z.number().int().positive().default(300).describe("Optional: Chart height in pixels (default: 300)"),
      showYAxis: z.boolean().default(true).describe("Optional: Show left y-axis with tick labels (default: true)"),
    }),
    execute: async ({
      title,
      data,
      series,
      xAxis,
      yAxisLabel,
      height = 300,
      showYAxis = true,
    }) => {
      return {
        type: "chart",
        chartType: "bar",
        title,
        data,
        series,
        xAxis,
        yAxisLabel,
        config: {
          title,
          height,
          showYAxis,
        },
      };
    },
  });
}
