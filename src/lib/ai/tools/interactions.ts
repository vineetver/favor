import { tool } from "ai";
import { z } from "zod";
import { 
  getBiogridInteractions as fetchBiogridInteractions, 
  getIntactInteractions as fetchIntactInteractions, 
  getHuriInteractions as fetchHuriInteractions 
} from "@/lib/gene/ppi/api";
import { 
  getPathwayPairs as fetchPathwayPairs, 
  getPathwayGenes as fetchPathwayGenes 
} from "@/lib/gene/pathways/api";

export const getBiogridInteractions = () =>
  tool({
    description: "Fetches BioGRID protein–protein interactions for a given gene.",
    inputSchema: z.object({
      geneName: z.string().describe("The gene symbol to look up (e.g. TP53)"),
      limit: z.number().optional().default(4).describe("Max number of interactions to return"),
    }),
    execute: async ({ geneName, limit }) => {
      const biogrid = await fetchBiogridInteractions(geneName, limit);
      
      if (!biogrid) {
        throw new Error(`No BioGRID interactions found for ${geneName}.`);
      }

      return { biogrid };
    },
  });

export const getIntactInteractions = () =>
  tool({
    description: "Fetches IntAct protein–protein interactions for a given gene.",
    inputSchema: z.object({
      geneName: z.string().describe("The gene symbol to look up (e.g. TP53)"),
      limit: z.number().optional().default(4).describe("Max number of interactions to return"),
    }),
    execute: async ({ geneName, limit }) => {
      const intact = await fetchIntactInteractions(geneName, limit);
      
      if (!intact) {
        throw new Error(`No IntAct interactions found for ${geneName}.`);
      }

      return { intact };
    },
  });

export const getHuriInteractions = () =>
  tool({
    description: "Fetches HuRI protein–protein interactions for a given gene.",
    inputSchema: z.object({
      geneName: z.string().describe("The gene symbol to look up (e.g. TP53)"),
      limit: z.number().optional().default(100).describe("Max number of interactions to return"),
    }),
    execute: async ({ geneName, limit }) => {
      const huri = await fetchHuriInteractions(geneName, limit);
      
      if (!huri) {
        throw new Error(`No HuRI interactions found for ${geneName}.`);
      }

      return { huri };
    },
  });

export const getPathwayPairs = () =>
  tool({
    description: "Fetches general pathway interaction pairs for a gene, optionally filtered by source.",
    inputSchema: z.object({
      geneName: z.string().describe("The gene symbol to look up (e.g. TP53)"),
      limit: z.number().optional().default(100).describe("Max number of pathway interactions"),
      source: z.enum(["KEGG", "CycBio", "WikiPathways"]).optional().describe("Pathway source"),
    }),
    execute: async ({ geneName, limit, source }) => {
      const pathwayPairs = await fetchPathwayPairs(geneName, limit, source);
      
      if (!pathwayPairs) {
        throw new Error(`No pathway pairs found for ${geneName}${source ? ` (source=${source})` : ""}`);
      }

      return { pathwayPairs };
    },
  });

export const getPathwayGenes = () =>
  tool({
    description: "Fetches all genes in pathways that include the given gene, optionally filtered by source.",
    inputSchema: z.object({
      geneName: z.string().describe("The gene symbol to look up (e.g. TP53)"),
      source: z.enum(["KEGG", "CycBio", "WikiPathways"]).optional().describe("Pathway source"),
    }),
    execute: async ({ geneName, source }) => {
      const pathwayGenes = await fetchPathwayGenes(geneName, source);
      
      if (!pathwayGenes) {
        throw new Error(`No pathway genes found for ${geneName}${source ? ` (source=${source})` : ""}`);
      }

      return { pathwayGenes };
    },
  });