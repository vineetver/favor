"use client";

import { flexRender, type Table, type Row } from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ArrowUpDown, Info, Search } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ColumnMeta } from "./types";

interface TableContentProps<TData> {
  table: Table<TData>;
  onRowClick?: (row: Row<TData>) => void;
  emptyMessage?: string;
  loading?: boolean;
}

function SortIcon({ column }: { column: { getIsSorted: () => "asc" | "desc" | false } }) {
  const sorted = column.getIsSorted();
  if (sorted === "asc") return <ArrowUp className="w-3.5 h-3.5 text-primary" />;
  if (sorted === "desc") return <ArrowDown className="w-3.5 h-3.5 text-primary" />;
  return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors" />;
}

export function TableContent<TData>({
  table,
  onRowClick,
  emptyMessage = "No data found",
  loading = false,
}: TableContentProps<TData>) {
  return (
    <div className="overflow-x-auto relative">
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
                const meta = header.column.columnDef.meta as ColumnMeta | undefined;
                const canSort = header.column.getCanSort();
                const align = meta?.align ?? "left";

                return (
                  <th
                    key={header.id}
                    scope="col"
                    className={cn(
                      "px-6 py-3 bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider group",
                      align === "center" && "text-center",
                      align === "right" && "text-right",
                      canSort && "cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                    )}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center gap-1.5",
                          align === "center" && "justify-center",
                          align === "right" && "justify-end"
                        )}
                      >
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {meta?.description && (
                          <TooltipProvider>
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <span
                                  className="inline-flex"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Info className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 cursor-help transition-colors" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-xs text-sm bg-slate-900 text-slate-100 border-slate-800"
                              >
                                {meta.description}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
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
                  className={cn(
                    "group relative transition-colors border-b border-slate-50",
                    isEven ? "bg-white" : "bg-slate-50/30",
                    onRowClick ? "cursor-pointer" : "",
                    "hover:bg-primary/[0.03]"
                  )}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
                    const align = meta?.align ?? "left";

                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-6 py-3 text-sm text-slate-700",
                          align === "center" && "text-center",
                          align === "right" && "text-right",
                          cellIndex === 0 && "relative"
                        )}
                      >
                        {cellIndex === 0 && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-primary/60 rounded-r transition-all duration-150 group-hover:h-6" />
                        )}
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          ) : !loading ? (
            <tr>
              <td colSpan={table.getAllColumns().length} className="px-6 py-12 text-center text-slate-400 text-sm">
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
