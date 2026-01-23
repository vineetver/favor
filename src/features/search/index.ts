// Components
export { UniversalSearch } from './components';

// Context
export { SearchProvider, useSearch } from './context/search-context';

// API
export { fetchTypeahead, fetchSearch } from './api/search-api';

// Utils
export {
  getEntityUrl,
  hasEntityPage,
  parseQuery,
  parseVCF,
  looksLikeVCF,
  preloadVariant,
  preloadVariantDebounced,
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
