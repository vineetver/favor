import { z } from 'zod';
import type { UIMessage, InferUITool } from 'ai';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Define tool types for genomics tools
export type GenomicsTools = {
  getVariantInfo: InferUITool<any>;
  getGeneExpression: InferUITool<any>;
  analyzePathways: InferUITool<any>;
  getProteinInteractions: InferUITool<any>;
  findClinicalTrials: InferUITool<any>;
  analyzeSequence: InferUITool<any>;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  appendMessage: string;
  id: string;
  title: string;
  kind: string;
  clear: null;
  finish: null;
  // Add genomics-specific data types
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

export type VisibilityType = 'public' | 'private';