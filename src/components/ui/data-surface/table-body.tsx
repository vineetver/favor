"use client";

import { flexRender, type Row, type Table } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { ColumnMeta } from "./types";

interface TableBodyProps<TData> {
  table: Table<TData>;
  onRowClick?: (row: Row<TData>) => void;
}

export function TableBody<TData>({ table, onRowClick }: TableBodyProps<TData>) {
  const rows = table.getRowModel().rows;

  return (
    <tbody>
      {rows.map((row, index) => {
        const isEven = index % 2 === 0;
        return (
          <tr
            key={row.id}
            onClick={() => onRowClick?.(row)}
            data-state={row.getIsSelected() && "selected"}
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
      })}
    </tbody>
  );
}
