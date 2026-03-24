// Shared utility exports
export * from "./value-formatters";

// Tissue-specific helpers (formatCount and formatPvalue are already
// exported from value-formatters above; tissue-format re-exports them
// for direct-import convenience but we skip them here to avoid
// ambiguous barrel exports).
export {
  formatTissueName,
  TISSUE_GROUPS,
  inferTissueGroup,
  fmtScore,
  formatDist,
} from "./tissue-format";