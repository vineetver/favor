import type { ReactNode } from "react";

// ============================================================================
// Chart Data Types
// ============================================================================

/** Base data row for all chart visualizations */
export interface ChartDataRow {
  id: string;
  label: string;
  value: number | null;
  derived?: number | null;
  category?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Color Scheme Types
// ============================================================================

/** Gradient threshold for continuous color mapping */
export interface GradientThreshold {
  max: number;
  color: string;
  label?: string;
}

/** Color scheme configuration */
export type ColorScheme =
  | { type: "single"; color: string }
  | { type: "categorical"; colors: Record<string, string> }
  | { type: "gradient"; thresholds: GradientThreshold[] };

// ============================================================================
// Chart Component Props
// ============================================================================

/** Props for the BarChart component */
export interface BarChartProps {
  /** Chart data rows */
  data: ChartDataRow[];
  /** Color scheme for bars */
  colorScheme?: ColorScheme;
  /** Which field to use for coloring (default: "derived" for gradient, "category" for categorical) */
  colorField?: "value" | "derived" | "category";
  /** Chart layout direction */
  layout?: "horizontal" | "vertical";
  /** Show legend above chart */
  showLegend?: boolean;
  /** IDs to exclude from chart */
  excludeIds?: string[];
  /** Format value for display */
  valueFormatter?: (value: number) => string;
  /** Message when no data */
  emptyMessage?: string;
  /** Additional CSS classes */
  className?: string;
}

/** Props for the ChartLegend component */
export interface ChartLegendProps {
  items: Array<{ label: string; color: string }>;
  title?: string;
  className?: string;
}

/** Props for the ChartTooltip component */
export interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string | null;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
  children?: ReactNode;
  className?: string;
}

// ============================================================================
// Derived Column (for DataSurface integration)
// ============================================================================

/** Derived column configuration for computed values */
export interface DerivedColumn {
  header: string;
  headerTooltip?: ReactNode;
  derive: (value: unknown, id?: string) => unknown;
  render: (value: unknown) => ReactNode;
}

/** Props for visualization components (DataSurface integration) */
export interface VisualizationProps {
  data: ChartDataRow[];
  derivedColumn?: DerivedColumn;
}
