"use client";

import { flexRender, type HeaderGroup } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ColumnMeta } from "./types";

interface TableHeaderProps<TData> {
  headerGroups: HeaderGroup<TData>[];
  sticky?: boolean;
}

function SortIcon({
  column,
}: {
  column: { getIsSorted: () => "asc" | "desc" | false };
}) {
  const sorted = column.getIsSorted();
  if (sorted === "asc") return <ArrowUp className="w-3.5 h-3.5 text-primary" />;
  if (sorted === "desc")
    return <ArrowDown className="w-3.5 h-3.5 text-primary" />;
  return (
    <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
  );
}

export function TableHeader<TData>({
  headerGroups,
  sticky,
}: TableHeaderProps<TData>) {
  return (
    <thead className={cn(sticky && "sticky top-[49px] z-10")}>
      {headerGroups.map((headerGroup) => (
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
                  canSort &&
                    "cursor-pointer select-none hover:bg-slate-100/80 transition-colors",
                )}
                onClick={
                  canSort ? header.column.getToggleSortingHandler() : undefined
                }
              >
                {header.isPlaceholder ? null : (
                  <div
                    className={cn(
                      "flex items-center gap-1.5",
                      align === "center" && "justify-center",
                      align === "right" && "justify-end",
                    )}
                  >
                    <span>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
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
  );
}
