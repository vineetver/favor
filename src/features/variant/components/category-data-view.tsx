"use client";

import { useState, useMemo, type ReactNode } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Info,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  Download,
} from "lucide-react";
import { NoDataState } from "@/components/ui/error-states";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { variantColumnGroups } from "@/features/variant/config/hg38";
import type { Variant } from "@/features/variant/types";
import type { ColumnMeta } from "@/lib/table/column-builder";

// ============================================================================
// Types
// ============================================================================

type Row = {
  id: string;
  label: string;
  value: unknown;
  derived: unknown;
  description?: ReactNode;
  columnDef: ColumnDef<Variant>;
  variant: Variant;
};

interface Props {
  data: Variant;
  categoryId: string;
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (direction === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  if (direction === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
}

function HeaderTooltip({ content }: { content: ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-5 w-5 cursor-help flex-shrink-0 text-white fill-black" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CategoryDataView({ data, categoryId, className = "" }: Props) {
  const group = variantColumnGroups.find((g) => g.id === categoryId);
  const derivedColumn = group?.derivedColumn;
  const defaultSort = group?.defaultSort;
  const viewConfig = group?.view ?? {};

  // Feature flags (default all to true for "all features")
  const showSearch = viewConfig.search ?? true;
  const showExport = viewConfig.export ?? true;
  const VisualizationComponent = viewConfig.visualization;

  // State
  const [activeTab, setActiveTab] = useState<"table" | "visualization">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const initialSort: SortingState = defaultSort
    ? [{ id: defaultSort.column, desc: defaultSort.direction === "desc" }]
    : [];
  const [sorting, setSorting] = useState<SortingState>(initialSort);

  // Transform columns into rows (transposed format)
  const rows = useMemo((): Row[] => {
    if (!group) return [];

    return group.columns.map((colDef) => {
      const header = typeof colDef.header === "string" ? colDef.header : colDef.id ?? "";
      const meta = colDef.meta as ColumnMeta | undefined;

      let value: unknown = null;
      if ("accessorFn" in colDef && colDef.accessorFn) {
        value = colDef.accessorFn(data, 0);
      } else if ("accessorKey" in colDef && colDef.accessorKey) {
        value = data[colDef.accessorKey as keyof Variant];
      }

      const id = colDef.id ?? header;
      return {
        id,
        label: header,
        value,
        derived: derivedColumn ? derivedColumn.derive(value, id) : null,
        description: meta?.description,
        columnDef: colDef,
        variant: data,
      };
    });
  }, [group, data, derivedColumn]);

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const query = searchQuery.toLowerCase();
    return rows.filter((row) => row.label.toLowerCase().includes(query));
  }, [rows, searchQuery]);

  // Table columns for sorting
  const tableColumns = useMemo((): ColumnDef<Row>[] => {
    const cols: ColumnDef<Row>[] = [
      { id: "label", accessorKey: "label", enableSorting: true },
      {
        id: "value",
        accessorKey: "value",
        enableSorting: true,
        sortingFn: (a, b) => {
          const va = a.original.value, vb = b.original.value;
          if (va == null) return 1;
          if (vb == null) return -1;
          if (typeof va === "number" && typeof vb === "number") return va - vb;
          return String(va).localeCompare(String(vb));
        },
      },
    ];

    if (derivedColumn) {
      cols.push({
        id: "derived",
        accessorKey: "derived",
        enableSorting: true,
        sortingFn: (a, b) => {
          const va = a.original.derived, vb = b.original.derived;
          if (va == null) return 1;
          if (vb == null) return -1;
          if (typeof va === "number" && typeof vb === "number") return va - vb;
          return String(va).localeCompare(String(vb));
        },
      });
    }

    return cols;
  }, [derivedColumn]);

  const table = useReactTable({
    data: filteredRows,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Export to CSV
  const handleExport = () => {
    const headers = ["Annotation", "Value"];
    if (derivedColumn) headers.push(derivedColumn.header);

    const csvRows = filteredRows.map((row) => {
      const values = [row.label, row.value ?? ""];
      if (derivedColumn) values.push(row.derived ?? "");
      return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${categoryId}-data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!group) return <NoDataState categoryName="Category" />;

  const sortedRows = table.getRowModel().rows;
  if (sortedRows.length === 0 && !searchQuery) return <NoDataState categoryName="Data" />;

  const labelCol = table.getColumn("label");
  const valueCol = table.getColumn("value");
  const derivedCol = derivedColumn ? table.getColumn("derived") : null;

  const gridCols = derivedColumn ? "1fr 1fr 1fr" : "1fr 1fr";
  const rowCount = filteredRows.length;

  return (
    <div className={className}>
      <div className="rounded-lg border border-border/50 bg-card shadow-md overflow-hidden">
        {/* Header with tabs and toolbar */}
        <div className="px-6 py-4 border-b border-border/40">
          {/* Tabs row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Table tab */}
              <button
                onClick={() => setActiveTab("table")}
                className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "table"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Annotation Table
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                  {rowCount}
                </span>
              </button>

              {/* Visualization tab (only if component provided) */}
              {VisualizationComponent && (
                <button
                  onClick={() => setActiveTab("visualization")}
                  className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "visualization"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Data Visualization
                </button>
              )}
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2">
              {showExport && (
                <button
                  onClick={handleExport}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Export to CSV"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === "table" ? (
          <div>
            {/* Search */}
            {showSearch && (
              <div className="px-6 py-3 border-b border-border/40">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search annotations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* Table Header */}
            <div
              className="hidden md:grid gap-4 px-6 py-3 bg-muted/30 border-b border-border/40 text-sm font-semibold"
              style={{ gridTemplateColumns: gridCols }}
            >
              <button
                type="button"
                className="flex items-center gap-1 text-left hover:text-foreground/80"
                onClick={() => labelCol?.toggleSorting()}
              >
                Annotation
                <SortIcon direction={labelCol?.getIsSorted() || false} />
              </button>
              <div className="flex items-center gap-1 justify-center">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-foreground/80"
                  onClick={() => valueCol?.toggleSorting()}
                >
                  Value
                  <SortIcon direction={valueCol?.getIsSorted() || false} />
                </button>
              </div>
              {derivedColumn && (
                <div className="flex items-center gap-1 justify-center">
                  <button
                    type="button"
                    className="flex items-center gap-1 hover:text-foreground/80"
                    onClick={() => derivedCol?.toggleSorting()}
                  >
                    {derivedColumn.header}
                    <SortIcon direction={derivedCol?.getIsSorted() || false} />
                  </button>
                  {derivedColumn.headerTooltip && (
                    <HeaderTooltip content={derivedColumn.headerTooltip} />
                  )}
                </div>
              )}
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-border/40 text-sm">
              {sortedRows.length === 0 ? (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  No results found for &quot;{searchQuery}&quot;
                </div>
              ) : (
                sortedRows.map((row) => {
                  const { label, description, columnDef, variant, value, derived } = row.original;

                  const renderValue = () => {
                    if (columnDef.cell) {
                      const ctx = {
                        getValue: () => value,
                        row: { original: variant, id: "0", index: 0 },
                        column: { id: columnDef.id ?? "" },
                        table: {} as never,
                        cell: {} as never,
                        renderValue: () => value,
                      };
                      return flexRender(columnDef.cell, ctx as never);
                    }
                    return value == null ? "—" : String(value);
                  };

                  return (
                    <div key={row.id} className="px-6 py-4">
                      {/* Mobile */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-start gap-1 font-medium">
                          <span className="leading-6">{label}:</span>
                          {description && <HeaderTooltip content={description} />}
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Value: {renderValue()}</span>
                          {derivedColumn && (
                            <span>
                              {derivedColumn.header}: {derivedColumn.render(derived)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Desktop */}
                      <div
                        className="hidden md:grid gap-4 items-center"
                        style={{ gridTemplateColumns: gridCols }}
                      >
                        <div className="flex items-start gap-1">
                          <span className="font-medium text-foreground leading-6">{label}:</span>
                          {description && <HeaderTooltip content={description} />}
                        </div>
                        <div className="text-center text-muted-foreground">{renderValue()}</div>
                        {derivedColumn && (
                          <div className="text-center text-muted-foreground">
                            {derivedColumn.render(derived)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          // Visualization tab
          VisualizationComponent && (
            <div className="p-6">
              <VisualizationComponent
                data={filteredRows.map((r) => ({
                  id: r.id,
                  label: r.label,
                  value: r.value,
                  derived: r.derived,
                }))}
                derivedColumn={derivedColumn}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}
