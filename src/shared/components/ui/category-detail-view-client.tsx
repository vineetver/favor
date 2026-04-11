"use client";

import { geneColumnGroups } from "@features/gene/config/hg38";
import type { Gene } from "@features/gene/types";
import { variantColumnGroups } from "@features/variant/config/hg38";
import type { Variant } from "@features/variant/types";
import type { ColumnGroup, ColumnMeta } from "@infra/table/column-builder";
import { Card, CardContent } from "@shared/components/ui/card";
import type { ColumnGroupSource } from "@shared/components/ui/category-detail-view";
import { NoDataState } from "@shared/components/ui/error-states";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Info } from "lucide-react";

interface CategoryDetailViewClientProps {
  data: Gene | Variant;
  categoryId: string;
  columnGroupSource: ColumnGroupSource;
  className?: string;
}

export function CategoryDetailViewClient({
  data,
  categoryId,
  columnGroupSource,
  className = "",
}: CategoryDetailViewClientProps) {
  const columnGroups =
    columnGroupSource === "gene" ? geneColumnGroups : variantColumnGroups;

  const group = (columnGroups as readonly ColumnGroup<Gene | Variant>[]).find(
    (g) => g.id === categoryId,
  );

  const table = useReactTable({
    data: [data],
    columns: (group?.columns ?? []) as ColumnDef<Gene | Variant, any>[],
    getCoreRowModel: getCoreRowModel(),
  });

  if (!group) {
    return <NoDataState categoryName="Category" />;
  }

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
      <CardContent className="p-0! py-2!">
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
                className={
                  "group relative px-6 py-3.5 transition-all duration-150 ease-out hover:bg-accent/50 " +
                  (isEven ? "bg-transparent" : "bg-muted/40")
                }
              >
                {/* Subtle left accent on hover */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-primary/60 rounded-r-lg transition-all duration-150 group-hover:h-6" />

                <div className="grid grid-cols-1 sm:grid-cols-[minmax(200px,280px)_1fr] gap-3 sm:gap-8 items-baseline">
                  {/* Label Column */}
                  <dt className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground leading-tight">
                      {header}
                    </span>
                    {meta?.description && (
                      <TooltipProvider>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="max-w-xs text-sm"
                          >
                            <div>{meta.description}</div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </dt>

                  {/* Value Column */}
                  <dd className="text-sm font-mono text-foreground tabular-nums tracking-tight min-w-0 wrap-break-words">
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
