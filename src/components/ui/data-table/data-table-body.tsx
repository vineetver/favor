"use client";

import * as React from "react";
import { flexRender, type Table as TanstackTable, type Row, type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableBodyProps<TData, TValue> {
  table: TanstackTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: Row<TData>) => void;
}

function SortIcon({ column }: { column: { getIsSorted: () => "asc" | "desc" | false; getCanSort: () => boolean } }) {
  const sorted = column.getIsSorted();
  if (sorted === "asc") return <ArrowUp className="w-3 h-3 text-primary" />;
  if (sorted === "desc") return <ArrowDown className="w-3 h-3 text-primary" />;
  return <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors" />;
}

export function DataTableBody<TData, TValue>({
  table,
  columns,
  loading = false,
  emptyMessage = "No data matches your search.",
  onRowClick,
}: DataTableBodyProps<TData, TValue>) {
  return (
    <div className="overflow-x-auto relative min-h-[200px]">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 backdrop-blur-sm flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      <table className="min-w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-slate-100">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                return (
                  <th
                    key={header.id}
                    scope="col"
                    className={cn(
                      "px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50 group",
                      canSort && "cursor-pointer hover:bg-slate-100/80 transition-colors"
                    )}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIcon column={header.column} />}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row, index) => {
              const isEven = index % 2 === 0;
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "group relative transition-colors border-b border-slate-50",
                    isEven ? "bg-white" : "bg-slate-50/30",
                    onRowClick
                      ? "cursor-pointer hover:bg-primary/[0.03]"
                      : "hover:bg-primary/[0.03]"
                  )}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-6 py-3 whitespace-nowrap text-sm text-slate-700",
                        cellIndex === 0 && "relative"
                      )}
                    >
                      {/* Left accent on hover - only on first cell */}
                      {cellIndex === 0 && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-primary/60 rounded-r transition-all duration-150 group-hover:h-6" />
                      )}
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : !loading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 text-sm">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Search className="w-8 h-8 text-slate-200" />
                  <p>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
