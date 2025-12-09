"use client";

import { useState, useMemo, type ReactNode } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { Info, ArrowUp, ArrowDown } from "lucide-react";
import { NoDataState } from "@/components/ui/error-states";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { variantColumnGroups } from "@/features/variant/config/hg38";
import type { Variant } from "@/features/variant/types/types";
import type { ColumnMeta } from "@/lib/table/column-builder";

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

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (direction === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  if (direction === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
  return null;
}

export function CategoryTableView({ data, categoryId, className = "" }: Props) {
  const group = variantColumnGroups.find((g) => g.id === categoryId);
  const derivedColumn = group?.derivedColumn;
  const defaultSort = group?.defaultSort;

  // Initial sort from config
  const initialSort: SortingState = defaultSort
    ? [{ id: defaultSort.column, desc: defaultSort.direction === "desc" }]
    : [];

  const [sorting, setSorting] = useState<SortingState>(initialSort);

  // Transform columns into rows
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

      return {
        id: colDef.id ?? header,
        label: header,
        value,
        derived: derivedColumn ? derivedColumn.derive(value) : null,
        description: meta?.description,
        columnDef: colDef,
        variant: data,
      };
    });
  }, [group, data, derivedColumn]);

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
    data: rows,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!group) return <NoDataState categoryName="Category" />;

  const sortedRows = table.getRowModel().rows;
  if (sortedRows.length === 0) return <NoDataState categoryName="Data" />;

  const labelCol = table.getColumn("label");
  const valueCol = table.getColumn("value");
  const derivedCol = table.getColumn("derived");

  const gridCols = derivedColumn ? "1fr 1fr 1fr" : "1fr 1fr";

  return (
    <div className={className}>
      <div className="rounded-lg border border-border/50 bg-card shadow-md overflow-hidden text-sm">
        {/* Header */}
        <div
          className="hidden md:grid gap-4 px-6 py-3 bg-muted/30 border-b border-border/40 font-semibold"
          style={{ gridTemplateColumns: gridCols }}
        >
          <button
            type="button"
            className="flex items-center gap-1 text-left hover:text-foreground/80"
            onClick={() => labelCol?.toggleSorting()}
          >
            Score
            <SortIcon direction={labelCol?.getIsSorted() || false} />
          </button>
          <button
            type="button"
            className="flex items-center gap-1 justify-center hover:text-foreground/80"
            onClick={() => valueCol?.toggleSorting()}
          >
            Value
            <SortIcon direction={valueCol?.getIsSorted() || false} />
          </button>
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-5 w-5 cursor-help flex-shrink-0 text-white fill-black" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-md">
                      {derivedColumn.headerTooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/40">
          {sortedRows.map((row) => {
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
                    {description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-5 w-5 cursor-help flex-shrink-0 mt-0.5 text-white fill-black" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-md">
                            {description}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
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
                    {description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-5 w-5 cursor-help flex-shrink-0 mt-0.5 text-white fill-black" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-md">
                            {description}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
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
          })}
        </div>
      </div>
    </div>
  );
}
