import type { ColumnDef, Row, Table } from "@tanstack/react-table";
import type * as React from "react";

export type ViewMode = "table" | "chart";

// ============================================================================
// Transposed Mode Types
// ============================================================================

/** Simplified row data for visualizations (only essential fields) */
export interface VisualizationRow {
  id: string;
  label: string;
  value: unknown;
  derived: unknown;
}

/** A row in transposed format (columns become rows) - internal use */
export interface TransposedRow extends VisualizationRow {
  description?: React.ReactNode;
  columnDef: ColumnDef<unknown>;
  sourceObject: unknown;
}

/** Derived column configuration for computed values (e.g., percentile) */
export interface DerivedColumn {
  header: string;
  headerTooltip?: React.ReactNode;
  /** Transform the base value into a derived value */
  derive: (value: unknown, id?: string) => unknown;
  /** Render the derived value */
  render: (value: unknown) => React.ReactNode;
}

/** Default sort configuration for transposed tables */
export interface DefaultSort {
  column: "label" | "value" | "derived";
  direction: "asc" | "desc";
}

/** Props for visualization components - uses simplified row type */
export interface VisualizationProps {
  data: VisualizationRow[];
  derivedColumn?: DerivedColumn;
}

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

export interface ServerPaginationProps {
  /** Total count across all pages */
  totalCount?: number;
  /** Current page size */
  pageSize: number;
  /** Whether there are more pages */
  hasMore?: boolean;
  /** Handler for next page */
  onNextPage: () => void;
  /** Handler for previous page */
  onPreviousPage: () => void;
  /** Handler for page size change */
  onPageSizeChange: (size: number) => void;
  /** Can navigate to next page */
  canGoNext: boolean;
  /** Can navigate to previous page */
  canGoPrevious: boolean;
}

export interface ServerSortProps {
  /** Current sort column (matches column id) */
  sortBy: string | null;
  /** Current sort direction */
  sortDir: "asc" | "desc";
  /** Called when user clicks a sortable column header */
  onSortChange: (columnId: string, desc: boolean) => void;
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
  visualization?:
    | React.ComponentType<{ data: TData[] }>
    | React.ComponentType<VisualizationProps>
    | React.ComponentType<{ data: VisualizationRow[] }>;
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
  // Server pagination props
  /** Enable server-side pagination mode */
  serverPagination?: ServerPaginationProps;
  /** Enable server-side sorting (manual sorting — API handles the sort) */
  serverSort?: ServerSortProps;
  /** Show subtle transition indicator when true (does NOT replace table with skeleton) */
  transitioning?: boolean;
  // Transposed mode props
  /** Enable transposed mode - columns become rows */
  transposed?: boolean;
  /** Source object to extract values from (required for transposed mode) */
  sourceObject?: TData;
  /** Derived column configuration (e.g., percentile) */
  derivedColumn?: DerivedColumn;
  /** Default sort for transposed tables */
  defaultSort?: DefaultSort;
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
