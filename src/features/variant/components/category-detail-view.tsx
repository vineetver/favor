"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Info } from "lucide-react";
import { Card, CardContent } from "@shared/components/ui/card";
import { NoDataState } from "@shared/components/ui/error-states";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { variantColumnGroups } from "@features/variant/config/hg38";
import type { Variant } from "@features/variant/types";
import type { ColumnMeta } from "@infra/table/column-builder";

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
      <CardContent className="!p-0 !py-2">
        <dl className="overflow-hidden">
          {visibleCells.map((cell, index) => {
            const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
            const header =
              typeof cell.column.columnDef.header === "string"
                ? cell.column.columnDef.header
                : cell.column.id;
            const isEven = index % 2 === 0;

            return (
              <div
                key={cell.id}
                className={`
                  group relative px-6 py-3.5
                  transition-all duration-150 ease-out
                  hover:bg-primary/[0.03]
                  ${isEven ? "bg-transparent" : "bg-slate-50/40"}
                `}
              >
                {/* Subtle left accent on hover */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-primary/60 rounded-r transition-all duration-150 group-hover:h-6" />

                <div className="grid grid-cols-1 sm:grid-cols-[minmax(200px,280px)_1fr] gap-3 sm:gap-8 items-baseline">
                  {/* Label Column */}
                  <dt className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600 leading-tight">
                      {header}
                    </span>
                    {meta?.description && (
                      <TooltipProvider>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="max-w-xs text-sm bg-slate-900 text-slate-100 border-slate-800"
                          >
                            <div>{meta.description}</div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </dt>

                  {/* Value Column */}
                  <dd className="text-sm font-mono text-slate-900 tabular-nums tracking-tight min-w-0 break-words">
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
