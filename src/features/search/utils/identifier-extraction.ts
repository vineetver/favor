/**
 * Identifier extraction utilities for populating search bar
 */

import type { TypeaheadSuggestion } from "../types/api";

/**
 * Get the display text for populating the search bar after selection
 * Always uses display_name for consistency - the true anchor id/type
 * are kept in state separately for pivot fetch and routing
 */
export function getPopulateIdentifier(suggestion: TypeaheadSuggestion): string {
  return suggestion.display_name;
}
