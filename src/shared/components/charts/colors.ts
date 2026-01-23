import type { ColorScheme, GradientThreshold } from "./types";

// ============================================================================
// Predefined Color Schemes
// ============================================================================

/**
 * Percentile gradient for integrative scores.
 * Lower percentile = more significant = warmer color.
 */
export const PERCENTILE_GRADIENT: GradientThreshold[] = [
  { max: 1, color: "#dc2626", label: "<1%" }, // red-600
  { max: 5, color: "#ea580c", label: "1-5%" }, // orange-600
  { max: 10, color: "#f59e0b", label: "5-10%" }, // amber-500
  { max: 25, color: "#eab308", label: "10-25%" }, // yellow-500
  { max: 50, color: "#84cc16", label: "25-50%" }, // lime-500
  { max: 100, color: "#22c55e", label: ">50%" }, // green-500
];

/**
 * Regulatory state colors for epigenetics data.
 */
export const REGULATORY_COLORS: Record<string, string> = {
  Active: "#34d399", // emerald-400
  Repressed: "#fb7185", // rose-400
  Transcription: "#38bdf8", // sky-400
  Other: "#94a3b8", // slate-400
};

/**
 * Default single color (primary purple).
 */
export const DEFAULT_BAR_COLOR = "#8b5cf6"; // violet-500

/**
 * Generic categorical palette for unknown categories.
 */
export const CATEGORICAL_PALETTE = [
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#ec4899", // pink-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
];

// ============================================================================
// Color Helper Functions
// ============================================================================

/**
 * Get color from gradient thresholds based on value.
 * @param value - The value to map to a color
 * @param thresholds - Gradient thresholds (must be sorted by max ascending)
 * @returns The color for the value
 */
export function getGradientColor(
  value: number | null | undefined,
  thresholds: GradientThreshold[],
): string {
  if (value === null || value === undefined) {
    return "#94a3b8"; // slate-400 for missing values
  }

  for (const threshold of thresholds) {
    if (value <= threshold.max) {
      return threshold.color;
    }
  }

  // Value exceeds all thresholds, return last color
  return thresholds[thresholds.length - 1]?.color ?? "#94a3b8";
}

/**
 * Get color from categorical mapping.
 * @param category - The category to map
 * @param colors - Category to color mapping
 * @returns The color for the category
 */
export function getCategoryColor(
  category: string | null | undefined,
  colors: Record<string, string>,
): string {
  if (!category) {
    return "#94a3b8"; // slate-400 for missing category
  }

  return colors[category] ?? "#94a3b8";
}

/**
 * Get color based on color scheme and data row.
 * @param row - The data row
 * @param colorScheme - The color scheme configuration
 * @param colorField - Which field to use for coloring
 * @returns The color for the row
 */
export function getRowColor(
  row: { value: number | null; derived?: number | null; category?: string },
  colorScheme: ColorScheme,
  colorField: "value" | "derived" | "category" = "derived",
): string {
  switch (colorScheme.type) {
    case "single":
      return colorScheme.color;

    case "gradient": {
      const fieldValue = colorField === "derived" ? row.derived : row.value;
      return getGradientColor(fieldValue, colorScheme.thresholds);
    }

    case "categorical":
      return getCategoryColor(row.category, colorScheme.colors);

    default:
      return DEFAULT_BAR_COLOR;
  }
}

/**
 * Generate legend items from color scheme.
 * @param colorScheme - The color scheme configuration
 * @returns Array of legend items
 */
export function getLegendItems(
  colorScheme: ColorScheme,
): Array<{ label: string; color: string }> {
  switch (colorScheme.type) {
    case "single":
      return []; // No legend needed for single color

    case "gradient":
      return colorScheme.thresholds.map((t) => ({
        label: t.label ?? `≤${t.max}`,
        color: t.color,
      }));

    case "categorical":
      return Object.entries(colorScheme.colors).map(([label, color]) => ({
        label,
        color,
      }));

    default:
      return [];
  }
}
