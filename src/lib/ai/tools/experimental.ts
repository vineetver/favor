import { tool } from "ai";
import { z } from "zod";

// Placeholder tools for APIs that don't exist yet
export const getCRISPRData = () =>
  tool({
    description: "Retrieves CRISPR data for a given Accession. Use with getCCREData to get accession of a variant_vcf.",
    inputSchema: z.object({
      accession: z.string().describe("The accessionID e.g. EH38E3309095"),
      limit: z.number().optional().default(1).describe("Optional limit for the number of CRISPR results"),
    }),
    execute: async ({ accession }) => {
      return { error: `CRISPR API for ${accession} is not yet implemented.` };
    },
  });

export const getChiaPetData = () =>
  tool({
    description: "Retrieves ChiaPet data for a given Accession. Use with getCCREData to get accession of a variant_vcf.",
    inputSchema: z.object({
      accession: z.string().describe("The accessionID e.g. EH38E3309095"),
      limit: z.number().optional().default(1).describe("Optional limit for the number of ChiaPet results"),
    }),
    execute: async ({ accession }) => {
      return { error: `ChiaPet API for ${accession} is not yet implemented.` };
    },
  });

export const getEQTLData = () =>
  tool({
    description: "Retrieves eQTL data for a given Accession. Use with getCCREData to get accession of a variant_vcf.",
    inputSchema: z.object({
      accession: z.string().describe("The accessionID e.g. EH38E3309095"),
      limit: z.number().optional().default(1).describe("Optional limit for the number of eQTL results"),
    }),
    execute: async ({ accession }) => {
      return { error: `eQTL API for ${accession} is not yet implemented.` };
    },
  });