/**
 * Shared value formatting utilities used across different features
 * These utilities help with consistent formatting of data values in tables and components
 */

// Type guards for validation
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

export function isValidString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

// Number formatting utilities
export function roundNumber(value: number, decimals: number = 3): string {
  return Number(value.toFixed(decimals)).toString();
}

export function formatScientific(value: number, decimals: number = 2): string {
  return value.toExponential(decimals);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${roundNumber(value * 100, decimals)}%`;
}

/** Locale-aware integer formatting: 1234567 → "1,234,567" */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

/** Smart numeric display: integers localized, tiny floats scientific, others fixed(3) */
export function formatNumericValue(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString();
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(2);
  return value.toFixed(3);
}

/** Whole-number percent from a 0-1 ratio: 0.5 → "50%" */
export function formatPercent(num: number): string {
  return `${(num * 100).toFixed(0)}%`;
}

/** Human-readable byte size: 1024 → "1.0 KB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Relative time string: "2m ago", "3h ago", "Jan 5" */
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

/** Locale time string: "02:30 PM" */
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Elapsed duration between two ISO timestamps: "2m 30s", "1h 5m" */
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

/** Compact count: 1234 → "1.2K", 1234567 → "1.2M" */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/** Convert −log10(p) back to a display p-value string */
export function formatPvalue(neglogp: number): string {
  if (neglogp <= 0) return "1";
  const p = Math.pow(10, -neglogp);
  if (p < 0.001) return p.toExponential(1);
  return p.toFixed(3);
}

// String utilities
export function splitText(text: string, separator: string = ";"): string[] {
  return text.split(separator).filter(item => item.trim().length > 0);
}

export function cleanText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// Safe value conversion utilities
export function parseStringToNumber(value: string): number | null {
  if (!isValidString(value)) return null;
  const cleaned = value.trim();
  const parsed = parseFloat(cleaned);
  return isValidNumber(parsed) ? parsed : null;
}

export function parseStringToBoolean(value: string): boolean | null {
  if (!isValidString(value)) return null;
  const cleaned = value.trim().toLowerCase();
  if (cleaned === "true" || cleaned === "yes" || cleaned === "y" || cleaned === "1") return true;
  if (cleaned === "false" || cleaned === "no" || cleaned === "n" || cleaned === "0") return false;
  return null;
}

// Nested object accessors for complex data structures
export function safeNestedAccess<T>(
  obj: unknown,
  path: string,
  defaultValue: T | null = null
): T | null {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current !== undefined ? (current as T) : defaultValue;
}

// Constraint score accessors for gene data
export function getConstraintScore(
  gene: unknown,
  category: 'loeuf' | 'posterior' | 'shet' | 'damage' | 'gnomad',
  field: string
): unknown {
  return safeNestedAccess(gene, `constraint_scores.${category}.${field}`);
}

// Common data transformations
export function formatExternalId(id: string, prefix: string = ""): string {
  if (!isValidString(id)) return "";
  return prefix ? `${prefix}:${id}` : id;
}

export function formatGeneSymbol(symbol: string): string {
  if (!isValidString(symbol)) return "";
  return symbol.trim().toUpperCase();
}

export function formatChromosomeLocation(chr: string, start?: number, end?: number): string {
  if (!isValidString(chr)) return "";
  
  let location = chr.startsWith('chr') ? chr : `chr${chr}`;
  
  if (isValidNumber(start)) {
    location += `:${start.toLocaleString()}`;
    if (isValidNumber(end)) {
      location += `-${end.toLocaleString()}`;
    }
  }
  
  return location;
}