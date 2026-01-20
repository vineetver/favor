// Components
export {
  GlobalSearch,
  SearchTrigger,
  SearchSuggestions,
  PivotExplorer,
  UniversalSearch,
} from './components';

// Context
export { SearchProvider, useSearch } from './context/search-context';

// Hooks
export { useTypeahead } from './hooks/use-typeahead';
export { usePivotSearch } from './hooks/use-pivot-search';

// API
export { fetchTypeahead, fetchSearch } from './api/search-api';

// Utils
export {
  getEntityUrl,
  hasEntityPage,
  getEntityLabel,
  parseQuery,
  getQueryType,
  isValidVariantVCF,
  isValidRsID,
  parseVCF,
  looksLikeVCF,
  isCompleteVCF,
  preloadVariant,
  preloadVariantDebounced,
  getCachedVariant,
  isVariantInDatabase,
  clearPreloadCache,
  getRouteForQuery,
  navigateToQuery,
  isRoutableQuery,
  getPopulateIdentifier,
} from './utils';

// Types
export type {
  EntityType,
  MatchType,
  EntityLinks,
  EntityPreview,
  TypeaheadSuggestion,
  TypeaheadResponse,
  SearchEntity,
  SearchResults,
  TypeaheadParams,
  SearchParams,
} from './types/api';

export type {
  QueryType,
  ParsedQuery,
  VariantVCF,
  ParsedVariantQuery,
  RouteDestination,
} from './types/query';
