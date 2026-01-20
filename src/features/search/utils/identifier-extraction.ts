/**
 * Identifier extraction utilities for populating search bar
 */

import type { TypeaheadSuggestion } from '../types/api';

/**
 * Extract the best identifier for populating the search bar
 * Uses smart defaults based on entity type:
 * - Genes: Display name (e.g., "BRCA1")
 * - Drugs: ChEMBL ID if available, otherwise name
 * - Diseases: Ontology ID (MONDO_*, HPO_*, etc.)
 * - Variants: rsID or VCF notation
 * - Pathways: Name
 */
export function getPopulateIdentifier(suggestion: TypeaheadSuggestion): string {
  switch (suggestion.type) {
    case 'genes':
      // Use display name (e.g., "BRCA1") - users search by symbol
      return suggestion.name;

    case 'drugs':
      // Prefer CHEMBL ID if available - stable identifier for routing
      if (suggestion.id && /^CHEMBL\d+$/i.test(suggestion.id)) {
        return suggestion.id;
      }
      return suggestion.name;

    case 'diseases':
      // Use ontology ID (MONDO_*, HPO_*, etc.) - required for routing
      return suggestion.id;

    case 'variants':
      // Use rsID or VCF notation - already used by query parser
      return suggestion.id;

    case 'pathways':
      // Use name for pathways
      return suggestion.name;

    default:
      return suggestion.name;
  }
}
