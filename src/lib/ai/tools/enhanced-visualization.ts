import { z } from "zod";
import { tool } from "ai";

export function createScatterPlot() {
  return tool({
    description: "Create a scatter plot visualization from data points",
    inputSchema: z.object({
      data: z
        .array(
          z.object({
            x: z.number(),
            y: z.number(),
            label: z.string().optional(),
            color: z.string().optional(),
            size: z.number().optional(),
          }),
        )
        .describe("Array of data points with x, y coordinates"),
      title: z.string().describe("Chart title"),
      xLabel: z.string().describe("X-axis label"),
      yLabel: z.string().describe("Y-axis label"),
      width: z.number().optional().describe("Chart width in pixels"),
      height: z.number().optional().describe("Chart height in pixels"),
    }),
    execute: async ({
      data,
      title,
      xLabel,
      yLabel,
      width = 600,
      height = 400,
    }: {
      data: Array<{
        x: number;
        y: number;
        label?: string;
        color?: string;
        size?: number;
      }>;
      title: string;
      xLabel: string;
      yLabel: string;
      width?: number;
      height?: number;
    }) => {
      return {
        type: "chart",
        chartType: "scatter",
        data,
        config: {
          title,
          xLabel,
          yLabel,
          width,
          height,
          xKey: "x",
          yKey: "y",
        },
        metadata: {
          chartType: "scatter",
          dataPoints: data.length,
        },
      };
    },
  });
}

export function createBarChart() {
  return tool({
    description: "Create a bar chart visualization",
    inputSchema: z.object({
      data: z
        .array(
          z.object({
            category: z.string(),
            value: z.number(),
            color: z.string().optional(),
          }),
        )
        .describe("Array of categories and values"),
      title: z.string().describe("Chart title"),
      xLabel: z.string().describe("X-axis label"),
      yLabel: z.string().describe("Y-axis label"),
      orientation: z
        .enum(["horizontal", "vertical"])
        .optional()
        .describe("Bar orientation"),
      width: z.number().optional().describe("Chart width in pixels"),
      height: z.number().optional().describe("Chart height in pixels"),
    }),
    execute: async ({
      data,
      title,
      xLabel,
      yLabel,
      orientation = "vertical",
      width = 600,
      height = 400,
    }: {
      data: Array<{ category: string; value: number; color?: string }>;
      title: string;
      xLabel: string;
      yLabel: string;
      orientation?: "horizontal" | "vertical";
      width?: number;
      height?: number;
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

export function createLineChart() {
  return tool({
    description:
      "Create a line chart visualization for time series or sequential data",
    inputSchema: z.object({
      data: z
        .array(
          z.object({
            x: z.union([z.number(), z.string()]),
            y: z.number(),
            series: z.string().optional(),
          }),
        )
        .describe("Array of data points"),
      title: z.string().describe("Chart title"),
      xLabel: z.string().describe("X-axis label"),
      yLabel: z.string().describe("Y-axis label"),
      smooth: z.boolean().optional().describe("Whether to smooth the line"),
      width: z.number().optional().describe("Chart width in pixels"),
      height: z.number().optional().describe("Chart height in pixels"),
    }),
    execute: async ({
      data,
      title,
      xLabel,
      yLabel,
      smooth = false,
      width = 600,
      height = 400,
    }: {
      data: Array<{ x: number | string; y: number; series?: string }>;
      title: string;
      xLabel: string;
      yLabel: string;
      smooth?: boolean;
      width?: number;
      height?: number;
    }) => {
      return {
        type: "chart",
        chartType: "line",
        config: {
          data,
          title,
          xLabel,
          yLabel,
          smooth,
          width,
          height,
        },
        metadata: {
          chartType: "line",
          dataPoints: data.length,
        },
      };
    },
  });
}

export function createHeatmap() {
  return tool({
    description: "Create a heatmap visualization for matrix data",
    inputSchema: z.object({
      data: z.array(z.array(z.number())).describe("2D array of numeric values"),
      rowLabels: z.array(z.string()).optional().describe("Labels for rows"),
      colLabels: z.array(z.string()).optional().describe("Labels for columns"),
      title: z.string().describe("Chart title"),
      colorScale: z
        .enum(["viridis", "plasma", "blues", "reds"])
        .optional()
        .describe("Color scale"),
      width: z.number().optional().describe("Chart width in pixels"),
      height: z.number().optional().describe("Chart height in pixels"),
    }),
    execute: async ({
      data,
      rowLabels,
      colLabels,
      title,
      colorScale = "viridis",
      width = 600,
      height = 400,
    }: {
      data: number[][];
      rowLabels?: string[];
      colLabels?: string[];
      title: string;
      colorScale?: "viridis" | "plasma" | "blues" | "reds";
      width?: number;
      height?: number;
    }) => {
      return {
        type: "chart",
        chartType: "heatmap",
        config: {
          data,
          rowLabels,
          colLabels,
          title,
          colorScale,
          width,
          height,
        },
        metadata: {
          chartType: "heatmap",
          dimensions: [data.length, data[0]?.length || 0],
        },
      };
    },
  });
}

export function createNetworkGraph() {
  return tool({
    description:
      "Create a network graph visualization for relationships and interactions",
    inputSchema: z.object({
      nodes: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            size: z.number().optional(),
            color: z.string().optional(),
            group: z.string().optional(),
          }),
        )
        .describe("Array of nodes"),
      edges: z
        .array(
          z.object({
            source: z.string(),
            target: z.string(),
            weight: z.number().optional(),
            color: z.string().optional(),
            label: z.string().optional(),
          }),
        )
        .describe("Array of edges connecting nodes"),
      title: z.string().describe("Graph title"),
      layout: z
        .enum(["force", "circular", "hierarchical"])
        .optional()
        .describe("Layout algorithm"),
      width: z.number().optional().describe("Graph width in pixels"),
      height: z.number().optional().describe("Graph height in pixels"),
    }),
    execute: async ({
      nodes,
      edges,
      title,
      layout = "force",
      width = 800,
      height = 600,
    }: {
      nodes: Array<{
        id: string;
        label: string;
        size?: number;
        color?: string;
        group?: string;
      }>;
      edges: Array<{
        source: string;
        target: string;
        weight?: number;
        color?: string;
        label?: string;
      }>;
      title: string;
      layout?: "force" | "circular" | "hierarchical";
      width?: number;
      height?: number;
    }) => {
      return {
        type: "chart",
        chartType: "network",
        config: {
          nodes,
          edges,
          title,
          layout,
          width,
          height,
        },
        metadata: {
          chartType: "network",
          nodeCount: nodes.length,
          edgeCount: edges.length,
        },
      };
    },
  });
}

export function createManhattanPlot() {
  return tool({
    description: "Create a Manhattan plot for GWAS data visualization",
    inputSchema: z.object({
      data: z
        .array(
          z.object({
            chromosome: z.string(),
            position: z.number(),
            pvalue: z.number(),
            snp: z.string().optional(),
            gene: z.string().optional(),
          }),
        )
        .describe("GWAS data points"),
      title: z.string().describe("Plot title"),
      significanceThreshold: z
        .number()
        .optional()
        .describe("P-value significance threshold"),
      width: z.number().optional().describe("Plot width in pixels"),
      height: z.number().optional().describe("Plot height in pixels"),
    }),
    execute: async ({
      data,
      title,
      significanceThreshold = 5e-8,
      width = 1200,
      height = 400,
    }: {
      data: Array<{
        chromosome: string;
        position: number;
        pvalue: number;
        snp?: string;
        gene?: string;
      }>;
      title: string;
      significanceThreshold?: number;
      width?: number;
      height?: number;
    }) => {
      return {
        type: "chart",
        chartType: "manhattan",
        config: {
          data,
          title,
          significanceThreshold,
          width,
          height,
        },
        metadata: {
          chartType: "manhattan",
          dataPoints: data.length,
          chromosomes: Array.from(new Set(data.map((d: any) => d.chromosome))),
        },
      };
    },
  });
}

export function createVolcanoPlot() {
  return tool({
    description: "Create a volcano plot for differential expression analysis",
    inputSchema: z.object({
      data: z
        .array(
          z.object({
            gene: z.string(),
            logFC: z.number(),
            pvalue: z.number(),
            significant: z.boolean().optional(),
          }),
        )
        .describe("Differential expression data"),
      title: z.string().describe("Plot title"),
      fcThreshold: z.number().optional().describe("Fold change threshold"),
      pThreshold: z.number().optional().describe("P-value threshold"),
      width: z.number().optional().describe("Plot width in pixels"),
      height: z.number().optional().describe("Plot height in pixels"),
    }),
    execute: async ({
      data,
      title,
      fcThreshold = 1,
      pThreshold = 0.05,
      width = 600,
      height = 500,
    }: {
      data: Array<{
        gene: string;
        logFC: number;
        pvalue: number;
        significant?: boolean;
      }>;
      title: string;
      fcThreshold?: number;
      pThreshold?: number;
      width?: number;
      height?: number;
    }) => {
      return {
        type: "chart",
        chartType: "volcano",
        config: {
          data,
          title,
          fcThreshold,
          pThreshold,
          width,
          height,
        },
        metadata: {
          chartType: "volcano",
          geneCount: data.length,
          significantGenes: data.filter((d: any) => d.significant).length,
        },
      };
    },
  });
}

export function createUniversalVisualization() {
  return tool({
    description:
      "Universal visualization tool that can create any chart type (scatter, bar, line, heatmap, network, manhattan, volcano) based on data and requirements",
    inputSchema: z.object({
      chartType: z
        .enum([
          "scatter",
          "bar",
          "line",
          "heatmap",
          "network",
          "manhattan",
          "volcano",
        ])
        .describe("Type of chart to create"),
      data: z
        .any()
        .describe("Data for visualization - structure varies by chart type"),
      title: z.string().describe("Chart title"),
      xLabel: z.string().optional().describe("X-axis label"),
      yLabel: z.string().optional().describe("Y-axis label"),
      width: z.number().optional().describe("Chart width in pixels"),
      height: z.number().optional().describe("Chart height in pixels"),
      options: z
        .record(z.any())
        .optional()
        .describe("Chart-specific configuration options"),
    }),
    execute: async ({
      chartType,
      data,
      title,
      xLabel,
      yLabel,
      width = 600,
      height = 400,
      options = {},
    }) => {
      return {
        type: "chart",
        chartType,
        data,
        config: {
          title,
          xLabel,
          yLabel,
          width,
          height,
          ...options,
        },
        metadata: {
          chartType,
          dataPoints: Array.isArray(data) ? data.length : 0,
          created: new Date().toISOString(),
        },
      };
    },
  });
}
