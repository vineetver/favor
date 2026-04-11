// Shared utility exports

// Tissue-specific helpers (formatCount and formatPvalue are already
// exported from value-formatters above; tissue-format re-exports them
// for direct-import convenience but we skip them here to avoid
// ambiguous barrel exports).
export {
  fmtScore,
  formatDist,
  formatTissueName,
  inferTissueGroup,
  TISSUE_GROUPS,
} from "./tissue-format";
export * from "./value-formatters";
