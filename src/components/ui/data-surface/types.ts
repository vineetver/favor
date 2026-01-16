import type { ColumnDef, Row, Table } from "@tanstack/react-table";
import type * as React from "react";

export type ViewMode = "table" | "chart";

export interface DimensionOption {
  value: string;
  label: string;
}

export interface DimensionConfig {
  label: string;
  options: DimensionOption[];
  value: string;
  onChange: (value: string) => void;
  presentation?: "segmented" | "dropdown";
}

export interface FilterChip {
  id: string;
  label: string;
  value: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: "select" | "multiselect" | "range" | "text";
  options?: DimensionOption[];
  placeholder?: string;
}

export interface ColumnMeta {
  description?: string;
  tooltip?: React.ReactNode;
  align?: "left" | "center" | "right";
}

export interface DataSurfaceProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  headerActions?: React.ReactNode;
  searchPlaceholder?: string;
  searchColumn?: string;
  searchable?: boolean;
  showViewSwitch?: boolean;
  visualization?: React.ComponentType<{ data: TData[] }>;
  defaultViewMode?: ViewMode;
  dimensions?: DimensionConfig[];
  filters?: FilterConfig[];
  filterable?: boolean;
  filterValues?: Record<string, unknown>;
  onFilterChange?: (filterId: string, value: unknown) => void;
  filterChips?: FilterChip[];
  onRemoveFilterChip?: (chipId: string) => void;
  onClearFilters?: () => void;
  exportable?: boolean;
  exportFilename?: string;
  onExport?: () => void;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  onRowClick?: (row: Row<TData>) => void;
  rowActions?: (row: Row<TData>) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  stickyHeader?: boolean;
  className?: string;
}

export interface ContextHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
}

export interface ControlBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
  onFilterClick?: () => void;
  hasActiveFilters?: boolean;
  filterChips?: FilterChip[];
  onRemoveFilterChip?: (chipId: string) => void;
  onClearFilters?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  showViewSwitch?: boolean;
  sticky?: boolean;
}

export interface ScopeBarProps {
  dimensions: DimensionConfig[];
}

export interface FooterBarProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: FilterConfig[];
  filterValues: Record<string, unknown>;
  onFilterChange: (filterId: string, value: unknown) => void;
  onApply?: () => void;
  onReset?: () => void;
}
