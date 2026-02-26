import type { ExplorerConfig } from "../explorer-config";

// =============================================================================
// Variant Explorer Configuration (stub — future implementation)
// =============================================================================

export const VARIANT_EXPLORER_CONFIG: ExplorerConfig = {
  seedEntityType: "Variant",

  templates: [],
  defaultTemplateId: "",

  edgeTypeGroups: [],

  externalLinks: {
    Variant: [
      { label: "dbSNP", urlTemplate: "https://www.ncbi.nlm.nih.gov/snp/{label}" },
    ],
  },

  enableVariantTrail: false,
};
