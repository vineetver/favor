/**
 * Shared formatting utilities for batch components
 */

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatPercent(num: number): string {
  return `${(num * 100).toFixed(0)}%`;
}

export function formatDuration(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getKeyTypeLabel(keyType: string): string {
  const labels: Record<string, string> = {
    VID: "VID",
    RSID: "rsID",
    VCF: "VCF",
    AUTO: "Auto",
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
  };
  return labels[dt] || dt;
}

export function getDataTypeDescription(dt: string): string {
  const descriptions: Record<string, string> = {
    variant_list: "Simple list of variant identifiers (rsID, VID, or VCF)",
    gwas_sumstats: "Genome-wide association study summary statistics with effect sizes and p-values",
    credible_set: "Fine-mapped credible set with posterior inclusion probabilities",
    fine_mapping: "Fine mapping results with statistical evidence for causal variants",
  };
  return descriptions[dt] || "";
}

export function getVariantKeyStrategyLabel(strategy: string): string {
  const labels: Record<string, string> = {
    rsid: "rsID lookup",
    chrom_pos_ref_alt: "Chr:Pos:Ref:Alt",
    chrom_pos_only: "Chr:Pos (position only)",
    none: "No variant key",
  };
  return labels[strategy] || strategy;
}
