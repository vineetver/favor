// Query parsing and validation
export {
  parseQuery,
  getQueryType,
  isValidVariantVCF,
  isValidRsID,
} from './query-parser';

// VCF parsing
export {
  parseVCF,
  looksLikeVCF,
  isCompleteVCF,
} from './vcf-parser';

// Variant preloading
export {
  preloadVariant,
  preloadVariantDebounced,
  getCachedVariant,
  isVariantInDatabase,
  clearPreloadCache,
} from './variant-preloader';

// Query routing
export {
  getRouteForQuery,
  navigateToQuery,
  isRoutableQuery,
} from './query-router';

// Entity utilities (existing)
export {
  getEntityUrl,
  hasEntityPage,
  getEntityLabel,
} from './entity-routes';

// Identifier extraction
export {
  getPopulateIdentifier,
} from './identifier-extraction';
