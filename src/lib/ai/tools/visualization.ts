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
    }),
    execute: async ({ data }) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { data };
    },
  });

export const getFieldDescription = () =>
  tool({
    description: "Returns the description of a scientific field or term e.g. bravo an, cadd, Allele Origin, GNOMAD Total AF, etc.",
    inputSchema: z.object({
      field: z.string().describe("The scientific field or term to describe"),
    }),
    execute: async ({ field }) => {
      const descriptions: Record<string, string> = {
        "bravo an": "BraVO Allele Number - Total number of alleles in samples",
        "cadd": "Combined Annotation Dependent Depletion - Pathogenicity prediction score",
        "allele origin": "Origin of the allele (germline, somatic, etc.)",
        "gnomad total af": "gnomAD Total Allele Frequency - Population frequency from Genome Aggregation Database"
      };
      
      const description = descriptions[field.toLowerCase()] || 
        `Description for "${field}" is not available in our database.`;
      
      return { description };
    },
  });