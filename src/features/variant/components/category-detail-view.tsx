"use client";

import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className={className}>
      <CardContent className="!p-0">
        <dl className="divide-y divide-slate-200 overflow-hidden">
          {visibleCells.map((cell) => {
            const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
            const header = typeof cell.column.columnDef.header === "string"
              ? cell.column.columnDef.header
              : cell.column.id;

            return (
              <div
                key={cell.id}
                className="px-6 py-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-6 sm:divide-x sm:divide-slate-200">
                  <div className="flex items-start space-x-2 sm:w-1/3 sm:flex-shrink-0 sm:pr-6">
                    <dt className="text-base font-semibold text-slate-900 leading-6 break-words">
                      {header}
                    </dt>
                    {meta?.description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 cursor-help flex-shrink-0 mt-0.5 text-slate-400 hover:text-slate-600 transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-md">
                            <div>{meta.description}</div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <dd className="text-[15px] text-slate-500 sm:flex-1 sm:pl-6 min-w-0 font-mono">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
