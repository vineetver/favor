import { tool } from "ai";
import { z } from "zod";

export const displayBarChart = () =>
  tool({
    description: "Display data in a bar chart for better interpretation and visualization.",
    inputSchema: z.object({
      data: z.array(z.object({
        category: z.string(),
        value: z.number(),
      })).describe("The data to display in the bar chart"),
      title: z.string().optional().describe("Chart title"),
      xLabel: z.string().optional().describe("X-axis label"),
      yLabel: z.string().optional().describe("Y-axis label"),
    }),
    execute: async ({ data, title, xLabel, yLabel }) => {
      // Transform data to match BarChart component expectations
      const chartData = data.map(item => ({
        name: item.category,
        value: item.value
      }));

      return {
        type: 'chart',
        chartType: 'bar',
        data: chartData,
        config: {
          keys: ['value'],
          title: title || 'Bar Chart',
          xLabel: xLabel || 'Category',
          yLabel: yLabel || 'Value',
          indexBy: 'name'
        }
      };
    },
  });

export const getFieldDescription = () =>
  tool({
    description: "Returns the description of a scientific field or term e.g. bravo an, cadd, Allele Origin, GNOMAD Total AF, etc. Uses fuzzy matching to find similar field names.",
    inputSchema: z.object({
      field: z.string().describe("The scientific field or term to describe"),
    }),
    execute: async ({ field }) => {
      const { fetchFieldDescription } = await import('./description');
      const description = await fetchFieldDescription(field);
      return { description };
    },
  });