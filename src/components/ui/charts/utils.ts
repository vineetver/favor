// Chart color palettes and utilities for genomics data visualization

// Primary color palette for genomics databases
export const GENOMICS_COLORS = {
  g1000: "#3b82f6", // Blue for 1000 Genomes
  gnomad31: "#10b981", // Green for gnomAD v3.1
  gnomadExome: "#8b5cf6", // Purple-600 for gnomAD Exome
  gnomadGenome: "#a855f7", // Purple-500 for gnomAD Genome (related to Exome)
  clinvar: "#ef4444", // Red for ClinVar
  cosmic: "#8b5cf6", // Purple for COSMIC
  other: "#6b7280", // Gray for other/unknown
};

// Color-blind friendly palette
export const ACCESSIBLE_COLORS = [
  "#1f77b4", // Blue
  "#ff7f0e", // Orange
  "#2ca02c", // Green
  "#d62728", // Red
  "#9467bd", // Purple
  "#8c564b", // Brown
  "#e377c2", // Pink
  "#7f7f7f", // Gray
  "#bcbd22", // Olive
  "#17becf", // Cyan
];

// Categorical palette for populations/groups
export const POPULATION_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#8b5cf6", // Purple
  "#f59e0b", // Orange
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange-red
  "#ec4899", // Pink
  "#6366f1", // Indigo
];

// Format scientific notation for allele frequencies
export const formatAlleleFrequency = (
  value: number | undefined | null,
): string => {
  if (value === undefined || value === null) return "N/A";
  if (value === 0) return "0";
  if (value >= 0.001) return value.toFixed(4);
  return value.toExponential(2);
};

// Format numbers with appropriate precision
export const formatNumber = (value: number, precision: number = 2): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(precision)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(precision)}K`;
  return value.toFixed(precision);
};

// Generate color array for given number of series
export const generateColors = (
  count: number,
  palette: string[] = ACCESSIBLE_COLORS,
): string[] => {
  if (count <= palette.length) {
    return palette.slice(0, count);
  }

  // If we need more colors, cycle through the palette
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length]);
  }
  return colors;
};

// Default chart theme configuration
export const CHART_THEME = {
  grid: {
    stroke: "#e5e7eb",
    strokeWidth: 1,
  },
  axis: {
    stroke: "#6b7280",
    strokeWidth: 1,
    fontSize: 12,
  },
  tooltip: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  },
  legend: {
    fontSize: 12,
    color: "#374151",
  },
};

// Common chart margins
export const CHART_MARGINS = {
  default: { top: 20, right: 30, left: 20, bottom: 5 },
  withLegend: { top: 20, right: 30, left: 20, bottom: 50 },
  withYLabel: { top: 20, right: 30, left: 60, bottom: 5 },
  withBothLabels: { top: 20, right: 30, left: 60, bottom: 50 },
  large: { top: 40, right: 60, left: 80, bottom: 80 },
};

// Custom tooltip formatter for genomics data
export const createTooltipFormatter = (
  formatValue?: (value: any) => string,
  showLabel: boolean = true,
) => {
  return (value: any, name: string) => {
    const formattedValue = formatValue ? formatValue(value) : value;

    if (!showLabel) return [formattedValue];

    return [formattedValue, name];
  };
};

// Trim long labels with ellipsis
export const trimLabel = (label: string, maxLength: number = 15): string => {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength - 3) + "...";
};

// Label formatter for better readability
export const createLabelFormatter = (
  formatter?: (value: any) => string,
  maxLength: number = 15,
) => {
  return (label: string) => {
    let formattedLabel = label;

    if (formatter) {
      formattedLabel = formatter(label);
    } else {
      // Capitalize and format common genomics terms
      formattedLabel = label
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    return trimLabel(formattedLabel, maxLength);
  };
};

// Data validation for charts
export const validateChartData = (data: any[]): boolean => {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every((item) => typeof item === "object" && item !== null)
  );
};

// Export common chart props interface
export interface BaseChartProps {
  data: any[];
  width?: number;
  height?: number;
  margin?: typeof CHART_MARGINS.default;
  colors?: string[];
  className?: string;
  title?: string;
  subtitle?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  responsive?: boolean;
}
