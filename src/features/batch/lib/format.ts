/**
 * Batch formatting utilities.
 *
 * Generic formatters (formatNumber, formatBytes, etc.) live in
 * @shared/utils/value-formatters and are re-exported here so existing
 * imports from "../lib/format" keep working.
 */

export {
  formatBytes,
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  formatTime,
} from "@shared/utils/value-formatters";

// ── Batch-specific label helpers ──────────────────────────────────

export function getKeyTypeLabel(keyType: string): string {
  const labels: Record<string, string> = {
    VID: "VID",
    RSID: "rsID",
    VCF: "VCF",
    AUTO: "Auto",
    UNKNOWN: "Unknown",
  };
  return labels[keyType] || keyType;
}

export function getFormatLabel(format: string): string {
  const labels: Record<string, string> = {
    CSV: "CSV",
    TSV: "TSV",
    TXT: "TXT",
    AUTO: "Auto",
  };
  return labels[format] || format;
}

export function getDataTypeLabel(dt: string): string {
  const labels: Record<string, string> = {
    variant_list: "Variant List",
    gwas_sumstats: "GWAS Summary Stats",
    credible_set: "Credible Set",
    fine_mapping: "Fine Mapping",
    unknown: "Unknown",
  };
  return labels[dt] || dt;
}

export function getDataTypeDescription(dt: string): string {
  const descriptions: Record<string, string> = {
    variant_list: "Simple list of variant identifiers (rsID, VID, or VCF)",
    gwas_sumstats:
      "Genome-wide association study summary statistics with effect sizes and p-values",
    credible_set:
      "Fine-mapped credible set with posterior inclusion probabilities",
    fine_mapping:
      "Fine mapping results with statistical evidence for causal variants",
    unknown: "File content could not be automatically classified",
  };
  return descriptions[dt] || "";
}

export function getVariantKeyStrategyLabel(strategy: string): string {
  const labels: Record<string, string> = {
    rsid: "rsID lookup",
    chrom_pos_ref_alt: "Chr:Pos:Ref:Alt",
    chrom_pos_only: "Chr:Pos (position only)",
    none: "No variant key",
    vcf_columns: "VCF columns (chrom, pos, ref, alt)",
    single_column: "Single column",
  };
  return labels[strategy] || strategy;
}

/**
 * Human-readable label for a variant-key alternative's key_type.
 * Mirrors the backend's KeyType → presentation mapping ("RSID" → "rsID", etc.).
 */
export function getVariantKeyTypeDescription(keyType: string): string {
  const descriptions: Record<string, string> = {
    VCF: "Direct encoding from VCF columns",
    RSID: "Database lookup via rsID",
    VID: "Internal variant ID (vid:N)",
    AUTO: "Auto-detected per row",
    UNKNOWN: "Key could not be parsed",
  };
  return descriptions[keyType] || "";
}
