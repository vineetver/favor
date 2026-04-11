/**
 * Query parser - identifies and validates user queries
 */

import {
  looksLikeRegion,
  parseRegion,
} from "@features/region/utils/parse-region";
import type {
  ParsedQuery,
  ParsedVariantQuery,
  QueryType,
} from "../types/query";
import { looksLikeVCF, parseVCF } from "./vcf-parser";

/**
 * Parse user query and identify its type
 */
export function parseQuery(query: string): ParsedQuery {
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      type: "unknown",
      raw: query,
      normalized: "",
      isValid: false,
      confidence: "low",
    };
  }

  // 1. Try to parse as VCF notation (highest priority for exact matches)
  const vcf = parseVCF(trimmed);
  if (vcf) {
    return {
      type: "variant_vcf",
      raw: query,
      normalized: vcf.normalized,
      isValid: true,
      confidence: "high",
      vcf,
    } as ParsedVariantQuery;
  }

  // 2. Check for rsID pattern (rs followed by digits)
  if (/^rs\d+$/i.test(trimmed)) {
    return {
      type: "variant_rsid",
      raw: query,
      normalized: trimmed.toLowerCase(),
      isValid: true,
      confidence: "high",
      rsid: trimmed.toLowerCase(),
    } as ParsedVariantQuery;
  }

  // 3. Partial rsID match (user still typing)
  if (/^rs\d/i.test(trimmed)) {
    return {
      type: "variant_rsid",
      raw: query,
      normalized: trimmed.toLowerCase(),
      isValid: false,
      confidence: "medium",
    } as ParsedVariantQuery;
  }

  // 4. Check for genomic region pattern (chr-start-end, 3 parts all numeric)
  // Must come before looksLikeVCF which would misclassify "1-10001-20002" as partial VCF
  if (looksLikeRegion(trimmed)) {
    const region = parseRegion(trimmed);
    if (region) {
      return {
        type: "region",
        raw: query,
        normalized: region.loc,
        isValid: true,
        confidence: "high",
      };
    }
  }

  // 5. Check if it looks like a partial VCF (user still typing)
  if (looksLikeVCF(trimmed)) {
    return {
      type: "variant_vcf",
      raw: query,
      normalized: trimmed,
      isValid: false,
      confidence: "medium",
    } as ParsedVariantQuery;
  }

  // 6. ChEMBL ID pattern (drugs)
  if (/^CHEMBL\d+$/i.test(trimmed)) {
    return {
      type: "drug",
      raw: query,
      normalized: trimmed.toUpperCase(),
      isValid: true,
      confidence: "high",
    };
  }

  // 7. Disease ontology ID patterns (MONDO, HPO, EFO, ORPHA, etc.)
  if (/^(MONDO|HPO?|EFO|ORPHA|DOID|OMIM|ICD10|ICD11)[:_]\d+$/i.test(trimmed)) {
    return {
      type: "disease",
      raw: query,
      normalized: trimmed.toUpperCase().replace(":", "_"),
      isValid: true,
      confidence: "high",
    };
  }

  // 8. Gene-like pattern (all uppercase, short)
  if (/^[A-Z][A-Z0-9-]{1,10}$/.test(trimmed)) {
    return {
      type: "gene",
      raw: query,
      normalized: trimmed,
      isValid: true,
      confidence: "medium",
    };
  }

  // 9. Everything else is unknown (could be pathway, etc.)
  return {
    type: "unknown",
    raw: query,
    normalized: trimmed,
    isValid: false,
    confidence: "low",
  };
}

/**
 * Get query type for routing decisions
 */
export function getQueryType(query: string): QueryType {
  const parsed = parseQuery(query);
  return parsed.type;
}

/**
 * Check if query is a complete, valid variant VCF
 */
export function isValidVariantVCF(query: string): boolean {
  const parsed = parseQuery(query);
  return parsed.type === "variant_vcf" && parsed.isValid;
}

/**
 * Check if query is a complete, valid rsID
 */
export function isValidRsID(query: string): boolean {
  const parsed = parseQuery(query);
  return parsed.type === "variant_rsid" && parsed.isValid;
}
