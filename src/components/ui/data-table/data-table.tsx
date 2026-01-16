"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Table as TableIcon, BarChart3, MoreHorizontal, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ColumnMeta } from "@/lib/table/column-builder";
import type { DataTableProps, TransposedRow } from "./types";
import { DataTableHeader, DataTableTabs } from "./data-table-header";
import { DataTableBody } from "./data-table-body";
import { DataTablePagination } from "./data-table-pagination";

export function DataTable<TData, TValue>({
  columns,
  data,
  title,
  subtitle,
  icon,
  searchPlaceholder = "Search...",
  searchColumn,
  searchable = true,
  exportable = true,
  exportFilename = "data-export",
  filterable = false,
  tabs: externalTabs,
  activeTab: externalActiveTab,
  onTabChange: externalOnTabChange,
  filterGroups,
  filterValues,
  onFilterChange,
  filterPanel,
  showFilters,
  onToggleFilters,
  pageSizeOptions = [10, 20, 50, 100],
  defaultPageSize = 10,
  onRowClick,
  rowActions,
  emptyMessage = "No results found",
  loading = false,
  className,
  // Transposed mode props
  transposed = false,
  sourceObject,
  derivedColumn,
  visualization: VisualizationComponent,
  defaultSort,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(
    defaultSort ? [{ id: defaultSort.column, desc: defaultSort.direction === "desc" }] : []
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [internalActiveTab, setInternalActiveTab] = React.useState<"table" | "visualization">("table");

  // Resolve tabs
  const hasVisualization = transposed && VisualizationComponent;
  const tabs = hasVisualization
    ? [
        { id: "table", label: "Table", icon: TableIcon },
        { id: "visualization", label: "Chart", icon: BarChart3 },
      ]
    : externalTabs;
  const activeTab = hasVisualization ? internalActiveTab : externalActiveTab;
  const onTabChange = hasVisualization
    ? (id: string) => setInternalActiveTab(id as "table" | "visualization")
    : externalOnTabChange;

  // Transposed mode logic
  const transposedRows = React.useMemo<TransposedRow[]>(() => {
    if (!transposed || !sourceObject) return [];

    return columns.map((colDef) => {
      const header = typeof colDef.header === "string" ? colDef.header : colDef.id ?? "";
      let value: unknown = null;

      if ("accessorFn" in colDef && typeof colDef.accessorFn === "function") {
        value = colDef.accessorFn(sourceObject, 0);
      } else if ("accessorKey" in colDef && colDef.accessorKey) {
        value = (sourceObject as Record<string, unknown>)[colDef.accessorKey as string];
      }

      const meta = colDef.meta as ColumnMeta | undefined;
      const derived = derivedColumn?.derive(value, colDef.id);

      return {
        id: colDef.id ?? header,
        label: header,
        value,
        derived,
        description: meta?.description,
        columnDef: colDef as ColumnDef<unknown>,
        sourceObject,
      };
    });
  }, [transposed, sourceObject, columns, derivedColumn]);

  const transposedTableColumns = React.useMemo<ColumnDef<TransposedRow>[]>(() => {
    if (!transposed) return [];

    const cols: ColumnDef<TransposedRow>[] = [
      {
        id: "label",
        accessorKey: "label",
        header: "Annotation",
        cell: ({ row }) => {
          const { label, description } = row.original;
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              {description && (
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help shrink-0 text-slate-300 hover:text-slate-500 transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-sm">
                      {description}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
        filterFn: (row, _columnId, filterValue) => {
          return row.original.label.toLowerCase().includes((filterValue as string).toLowerCase());
        },
      },
      {
        id: "value",
        accessorKey: "value",
        header: "Value",
        cell: ({ row }) => {
          const { columnDef, sourceObject: src, value } = row.original;
          if (columnDef.cell && typeof columnDef.cell === "function") {
            const ctx = {
              getValue: () => value,
              row: { original: src, id: "0", index: 0 },
              column: { id: columnDef.id ?? "" },
              table: {} as never,
              cell: {} as never,
              renderValue: () => value,
            };
            return flexRender(columnDef.cell, ctx as never);
          }
          return value == null ? "—" : String(value);
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.value;
          const b = rowB.original.value;
          if (a == null && b == null) return 0;
          if (a == null) return 1;
          if (b == null) return -1;
          if (typeof a === "number" && typeof b === "number") return a - b;
          return String(a).localeCompare(String(b));
        },
      },
    ];

    if (derivedColumn) {
      cols.push({
        id: "derived",
        accessorKey: "derived",
        header: () => (
          <div className="flex items-center gap-1.5">
            <span>{derivedColumn.header}</span>
            {derivedColumn.headerTooltip && (
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help shrink-0 text-slate-300 hover:text-slate-500 transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm">
                    {derivedColumn.headerTooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ),
        cell: ({ row }) => derivedColumn.render(row.original.derived),
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.derived;
          const b = rowB.original.derived;
          if (a == null && b == null) return 0;
          if (a == null) return 1;
          if (b == null) return -1;
          if (typeof a === "number" && typeof b === "number") return a - b;
          return String(a).localeCompare(String(b));
        },
      });
    }

    return cols;
  }, [transposed, derivedColumn]);

  const effectiveData = transposed ? (transposedRows as unknown as TData[]) : data;
  const effectiveColumns = transposed
    ? (transposedTableColumns as unknown as ColumnDef<TData, TValue>[])
    : columns;

  const columnsWithActions = React.useMemo(() => {
    if (!rowActions) return effectiveColumns;

    return [
      ...effectiveColumns,
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {rowActions(row)}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      } as ColumnDef<TData, TValue>,
    ];
  }, [effectiveColumns, rowActions]);

  const table = useReactTable({
    data: effectiveData,
    columns: columnsWithActions,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: defaultPageSize },
    },
  });

  // Export handler
  const handleExport = () => {
    const headers = effectiveColumns
      .filter((col) => col.id !== "actions")
      .map((col) => {
        if (typeof col.header === "string") return col.header;
        if ("accessorKey" in col) return String(col.accessorKey);
        return col.id ?? "";
      });

    const rows = table.getFilteredRowModel().rows.map((row) =>
      effectiveColumns
        .filter((col) => col.id !== "actions")
        .map((col) => {
          const cellValue = row.getValue(col.id ?? ("accessorKey" in col ? String(col.accessorKey) : ""));
          return `"${String(cellValue ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Search handler
  const handleSearch = (value: string) => {
    if (searchColumn) {
      table.getColumn(searchColumn)?.setFilterValue(value);
    } else {
      setGlobalFilter(value);
    }
  };

  const searchValue = searchColumn
    ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""
    : globalFilter;

  // Visualization data
  const visualizationData = React.useMemo(() => {
    if (!transposed) return [];
    return table.getFilteredRowModel().rows.map((row) => {
      const original = row.original as unknown as TransposedRow;
      return {
        id: original.id,
        label: original.label,
        value: original.value,
        derived: original.derived,
      };
    });
  }, [transposed, table]);

  // Render visualization tab
  if (hasVisualization && activeTab === "visualization" && VisualizationComponent) {
    return (
      <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
        <DataTableHeader
          icon={icon}
          title={title}
          subtitle={subtitle}
          actions={
            tabs && (
              <DataTableTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
            )
          }
          onExport={exportable ? handleExport : undefined}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          onSearchChange={searchable ? handleSearch : undefined}
          filterGroups={filterGroups}
          filterValues={filterValues}
          onFilterChange={onFilterChange}
          filterContent={filterPanel}
        />
        <div className="p-6">
          <VisualizationComponent data={visualizationData} derivedColumn={derivedColumn} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {/* Header / Toolbar */}
      <DataTableHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        actions={
          tabs && (
            <DataTableTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
          )
        }
        onExport={exportable ? handleExport : undefined}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onSearchChange={searchable ? handleSearch : undefined}
        filterGroups={filterGroups}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        filterContent={filterPanel}
      />

      {/* Table */}
      <DataTableBody
        table={table}
        columns={columnsWithActions}
        loading={loading}
        emptyMessage={emptyMessage}
        onRowClick={onRowClick}
      />

      {/* Pagination */}
      <DataTablePagination table={table} />
    </div>
  );
}

export default DataTable;
