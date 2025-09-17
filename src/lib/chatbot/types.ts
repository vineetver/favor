import { z } from "zod";
import type { UIMessage, InferUITool } from "ai";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Define tool types for genomics tools - matching actual tools from tools/index.ts
export type GenomicsTools = {
  // Variant tools
  getVariant: InferUITool<any>;
  ccreTool: InferUITool<any>;

  // Gene tools
  getGeneSummary: InferUITool<any>;
  getGeneAnnotation: InferUITool<any>;
  getGeneVariants: InferUITool<any>;

  // Region tools
  getRegionSummary: InferUITool<any>;
  getRegionVariants: InferUITool<any>;

  // Interaction tools
  getBiogrid: InferUITool<any>;
  getIntact: InferUITool<any>;
  getHuri: InferUITool<any>;
  getPathwayPairs: InferUITool<any>;
  getPathwayGenes: InferUITool<any>;

  // Visualization tools
  displayBarChart: InferUITool<any>;
  getDescription: InferUITool<any>;

  // Experimental tools
  crisprLinksTool: InferUITool<any>;
  chiaPetLinksTool: InferUITool<any>;
  eqtlLinksTool: InferUITool<any>;
};

// Custom UI data types for genomics-specific streaming data
export type CustomUIDataTypes = {
  // Genomics data streaming types - these match what you use in data-stream-handler.tsx
  variantAnnotation: {
    rsid: string;
    chromosome: string;
    position: number;
    refAllele: string;
    altAllele: string;
    functionalImpact: string;
  };
  geneExpression: {
    geneSymbol: string;
    tissueType: string;
    expressionLevel: number;
    pValue: number;
  };
  pathwayAnalysis: {
    pathwayId: string;
    pathwayName: string;
    genes: string[];
    enrichmentScore: number;
  };
  interactionNetwork: {
    sourceGene: string;
    targetGene: string;
    interactionType: string;
    confidence: number;
  };
  chartData: any; // For visualization data
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  GenomicsTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}

export type VisibilityType = "public" | "private";
