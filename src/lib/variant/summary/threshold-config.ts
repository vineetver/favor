import extractionConfig from '@/../variant-summary-extraction.json';

// Type definitions matching JSON structure
export interface ThresholdItem {
  header: string;
  accessor: string;
  threshold?: string;
  tooltip: string;
  activity?: 'Active' | 'Repressed' | 'Transcription';
}

export interface ThresholdCategory {
  name: string;
  slug: string;
  items: ThresholdItem[];
}

export interface ThresholdConfig {
  categories: ThresholdCategory[];
}

// Type-safe threshold configuration
export const thresholdConfig: ThresholdConfig = extractionConfig as ThresholdConfig;

// Threshold evaluation result
export interface ThresholdResult {
  passes: boolean;
  value: number | null;
  threshold: string | null;
}

/**
 * Parse threshold string and check if value meets criteria
 * Examples: ">= 10", "> 0.8", "0.0 - 0.05"
 */
export function evaluateThreshold(
  value: number | null | undefined,
  thresholdStr: string | undefined
): ThresholdResult {
  if (value === null || value === undefined) {
    return { passes: false, value: null, threshold: null };
  }

  if (!thresholdStr) {
    // No threshold defined = always include if value exists
    return { passes: true, value, threshold: null };
  }

  const threshold = thresholdStr.trim();

  // Handle range format: "0.0 - 0.05"
  if (threshold.includes(' - ')) {
    const [min, max] = threshold.split(' - ').map(s => parseFloat(s.trim()));
    return {
      passes: value >= min && value <= max,
      value,
      threshold: thresholdStr,
    };
  }

  // Handle comparison operators
  if (threshold.startsWith('>=')) {
    const minVal = parseFloat(threshold.substring(2).trim());
    return { passes: value >= minVal, value, threshold: thresholdStr };
  }

  if (threshold.startsWith('<=')) {
    const maxVal = parseFloat(threshold.substring(2).trim());
    return { passes: value <= maxVal, value, threshold: thresholdStr };
  }

  if (threshold.startsWith('>')) {
    const minVal = parseFloat(threshold.substring(1).trim());
    return { passes: value > minVal, value, threshold: thresholdStr };
  }

  if (threshold.startsWith('<')) {
    const maxVal = parseFloat(threshold.substring(1).trim());
    return { passes: value < maxVal, value, threshold: thresholdStr };
  }

  // Fallback: assume simple numeric threshold means >=
  const numThreshold = parseFloat(threshold);
  if (!isNaN(numThreshold)) {
    return { passes: value >= numThreshold, value, threshold: thresholdStr };
  }

  // Unknown format - include by default
  return { passes: true, value, threshold: thresholdStr };
}
