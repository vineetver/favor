"use client";

import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { Info } from "lucide-react";
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

interface CategoryDetailViewProps {
  data: Variant;
  categoryId: string;
  className?: string;
}

export function CategoryDetailView({
  data,
  categoryId,
  className = "",
}: CategoryDetailViewProps) {
  const group = variantColumnGroups.find((g) => g.id === categoryId);

  if (!group) {
    return <NoDataState categoryName="Category" />;
  }

  const table = useReactTable({
    data: [data],
    columns: group.columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const row = table.getRowModel().rows[0];

  if (!row) {
    return <NoDataState categoryName="Data" />;
  }

  const visibleCells = row.getVisibleCells();

  if (visibleCells.length === 0) {
    return <NoDataState categoryName="Data" />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="rounded-lg border border-border/50 bg-card shadow-md text-sm">
        <dl className="divide-y divide-border/40 overflow-hidden">
          {visibleCells.map((cell) => {
            const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
            const header = typeof cell.column.columnDef.header === "string"
              ? cell.column.columnDef.header
              : cell.column.id;

            return (
              <div
                key={cell.id}
                className="px-4 py-4 sm:px-6 sm:py-5 border-b border-border/40 last:border-b-0"
              >
                <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-6 sm:divide-x sm:divide-border">
                  <div className="flex items-start space-x-2 sm:w-1/3 sm:flex-shrink-0 sm:pr-6">
                    <dt className="font-medium text-foreground leading-6 break-words">
                      {header}:
                    </dt>
                    {meta?.description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-5 w-5 cursor-help flex-shrink-0 mt-0.5 text-white fill-black" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-md">
                            <div>{meta.description}</div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <dd className="text-muted-foreground sm:flex-1 sm:pl-6 min-w-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}
