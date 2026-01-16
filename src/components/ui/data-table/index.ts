// Main component
export { DataTable, default } from "./data-table";

// Header components
export { DataTableTopBar, DataTableTabs, DataTableToolbarRow, DataTableSubTabs, DataTableHeader as DataTableHeaderBar } from "./data-table-header";

// Filter components
export { DataTableFilters } from "./data-table-filters";

// Table components
export { DataTableBody } from "./data-table-body";
export { DataTablePagination } from "./data-table-pagination";

// Cell components
export {
  DataTableBadge,
  DataTableScore,
  DataTableProgress,
  DataTableMono,
  DataTableSparkline,
  DataTableLink,
  DataTableMultiValue,
  DataTableColumnHeader,
  DataTableHeader, // Deprecated alias for DataTableColumnHeader
  DataTableStatus,
  DataTableGene,
} from "./cells";

// Types
export type {
  DataTableProps,
  DataTableTab,
  DataTableFilterGroup,
  DataTableFilterOption,
  TransposedRow,
} from "./types";
