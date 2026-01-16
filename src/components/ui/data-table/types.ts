import type { ColumnDef, Row } from "@tanstack/react-table";
import type { DerivedColumn, VisualizationProps } from "@/lib/table/column-builder";

// ============================================================================
// Tab Types
// ============================================================================

/** Top-level tab for major view switching (Table vs Visualization vs Browser) */
export interface DataTableTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/** Filter/sub-tab group for within-table filtering (e.g., Male/Female/Overall) */
export interface DataTableFilterGroup {
  id: string;
  label?: string;
  options: DataTableFilterOption[];
  defaultValue?: string;
}

export interface DataTableFilterOption {
  value: string;
  label: string;
}

// ============================================================================
// Transposed Mode Types
// ============================================================================

/** Row format for transposed data */
export interface TransposedRow {
  id: string;
  label: string;
  value: unknown;
  derived: unknown;
  description?: React.ReactNode;
  columnDef: ColumnDef<unknown>;
  sourceObject: unknown;
}

// ============================================================================
// Main Component Props
// ============================================================================

export interface DataTableProps<TData, TValue> {
  /** Table columns definition */
  columns: ColumnDef<TData, TValue>[];
  /** Table data */
  data: TData[];

  // ========== Header Props ==========
  /** Title displayed in header */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Icon component for header */
  icon?: React.ComponentType<{ className?: string }>;

  // ========== Top-Level Tabs (Tier 1) ==========
  /** Top-level tabs for major view switching */
  tabs?: DataTableTab[];
  /** Active top-level tab */
  activeTab?: string;
  /** Top-level tab change handler */
  onTabChange?: (tabId: string) => void;

  // ========== Sub-Tabs / Filters (Tier 2) ==========
  /** Filter groups (toggle groups) for sub-filtering */
  filterGroups?: DataTableFilterGroup[];
  /** Current filter values keyed by group id */
  filterValues?: Record<string, string>;
  /** Filter change handler */
  onFilterChange?: (groupId: string, value: string) => void;

  // ========== Search ==========
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Column to search on (defaults to global filter) */
  searchColumn?: string;
  /** Enable search */
  searchable?: boolean;

  // ========== Actions ==========
  /** Enable export */
  exportable?: boolean;
  /** Export filename */
  exportFilename?: string;
  /** Enable filters button (for expanded filter panel) */
  filterable?: boolean;
  /** Custom filter panel (expanded) */
  filterPanel?: React.ReactNode;
  /** Show expanded filters panel */
  showFilters?: boolean;
  /** Toggle filters handler */
  onToggleFilters?: () => void;

  // ========== Pagination ==========
  /** Page size options */
  pageSizeOptions?: number[];
  /** Default page size */
  defaultPageSize?: number;

  // ========== Row Interactions ==========
  /** Row click handler */
  onRowClick?: (row: Row<TData>) => void;
  /** Custom row actions */
  rowActions?: (row: Row<TData>) => React.ReactNode;

  // ========== State ==========
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Additional class name */
  className?: string;

  // ========== Transposed Mode Props ==========
  /** Enable transposed format (single object -> rows from columns) */
  transposed?: boolean;
  /** Source object for transposed mode */
  sourceObject?: TData;
  /** Derived column configuration for transposed mode */
  derivedColumn?: DerivedColumn;
  /** Visualization component for transposed mode */
  visualization?: React.ComponentType<VisualizationProps>;
  /** Default sort for transposed mode */
  defaultSort?: { column: "label" | "value" | "derived"; direction: "asc" | "desc" };
}
