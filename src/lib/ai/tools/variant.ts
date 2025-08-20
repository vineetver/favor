import { tool } from "ai";
import { z } from "zod";
import { fetchVariant, fetchVariantsByRsid } from "@/lib/variant/api";
import { getCCREByVCF } from "@/lib/variant/ccre/api";

export const getVariantInfo = () =>
  tool({
    description: "Get additional information about a variant by its VCF or rsID.",
    inputSchema: z.object({
      variant_vcf: z.string().optional().describe("The variant_vcf for a variant, e.g., 19-44908822-C-T"),
      rsid: z.string().optional().describe("The rsid for a variant, e.g., rs429358"),
    }),
    execute: async ({ variant_vcf, rsid }) => {
      if ((rsid && variant_vcf) || (!rsid && !variant_vcf)) {
        throw new Error(rsid && variant_vcf 
          ? "Please provide either a variant_vcf or rsid, not both."
          : "Please provide either a variant_vcf or rsid.");
      }

      let result;
      let urlPrefix;

      if (rsid) {
        const variants = await fetchVariantsByRsid(rsid);
        if (!variants || variants.length === 0) {
          throw new Error(`Variant with rsid ${rsid} could not be found.`);
        }
        result = { variant: variants[0] };
        urlPrefix = `rsid/${rsid}`;
      } else if (variant_vcf) {
        const variant = await fetchVariant(variant_vcf);
        if (!variant) {
          throw new Error(`Variant ${variant_vcf} could not be found.`);
        }
        result = { variant };
        urlPrefix = `variant/${variant_vcf}`;
      }

      return {
        ...result,
        url: `https://favor.genohub.org/hg38/${urlPrefix}/summary/basic`,
      };
    },
  });

export const getCCREData = () =>
  tool({
    description: "Retrieves the CCRE data for a given Variant_VCF, including annotation like pELS, etc.",
    inputSchema: z.object({
      vcf: z.string().describe("The variant_vcf for a variant, e.g., 19-44908822-C-T"),
      distance: z.number().optional().default(0).describe("The distance to search for CCREs around the variant"),
    }),
    execute: async ({ vcf, distance }) => {
      const ccre = await getCCREByVCF(vcf, distance);
      
      if (!ccre) {
        throw new Error(`CCRE for ${vcf} could not be found.`);
      }

      return { ccre };
    },
  });