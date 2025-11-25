import { thresholdConfig, type ThresholdItem, evaluateThreshold } from './threshold-config';

/**
 * Build a fast lookup map: accessor -> ThresholdItem
 */
const thresholdLookup = new Map<string, ThresholdItem>();

thresholdConfig.categories.forEach(category => {
  category.items.forEach(item => {
    thresholdLookup.set(item.accessor, item);
  });
});

/**
 * Get threshold configuration for a specific accessor
 */
export function getThresholdConfig(accessor: string): ThresholdItem | undefined {
  return thresholdLookup.get(accessor);
}

/**
 * Check if a variant field value meets its threshold
 * @param accessor - The field accessor name (e.g., "cadd_phred")
 * @param value - The numeric value to check
 * @returns true if the value meets the threshold (or no threshold defined), false otherwise
 */
export function shouldIncludeField(
  accessor: string,
  value: number | null | undefined
): boolean {
  const config = getThresholdConfig(accessor);

  if (!config) {
    // Field not in config - include if value exists
    return value !== null && value !== undefined;
  }

  const result = evaluateThreshold(value, config.threshold);

  return result.passes;
}

/**
 * Get all accessors for a specific category
 */
export function getAccessorsForCategory(categorySlug: string): string[] {
  const category = thresholdConfig.categories.find(c => c.slug === categorySlug);
  return category ? category.items.map(item => item.accessor) : [];
}

/**
 * Filter variant data object to only include fields that meet thresholds
 * @param data - The data object containing variant fields
 * @param categorySlug - Optional category to filter by
 * @returns Filtered object with only fields meeting thresholds
 */
export function filterByThresholds<T extends Record<string, any>>(
  data: T,
  categorySlug?: string
): Partial<T> {
  const filtered: Partial<T> = {};

  const accessorsToCheck = categorySlug
    ? getAccessorsForCategory(categorySlug)
    : Object.keys(data);

  accessorsToCheck.forEach(accessor => {
    const value = data[accessor];
    if (shouldIncludeField(accessor, value)) {
      filtered[accessor as keyof T] = value;
    }
  });

  return filtered;
}

/**
 * Get items by activity type (for epigenetic marks)
 */
export function getItemsByActivity(activity: 'Active' | 'Repressed' | 'Transcription'): ThresholdItem[] {
  const epigeneticsCategory = thresholdConfig.categories.find(c => c.slug === 'epigenetics');
  if (!epigeneticsCategory) return [];

  return epigeneticsCategory.items.filter(item => item.activity === activity);
}
