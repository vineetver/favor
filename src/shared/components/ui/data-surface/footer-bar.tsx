"use client";

import { cn } from "@infra/utils";
import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServerPaginationProps } from "./types";

interface FooterBarProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
  serverPagination?: ServerPaginationProps;
}

export function FooterBar<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
  serverPagination,
}: FooterBarProps<TData>) {
  // Server pagination mode
  if (serverPagination) {
    const { pageSize, totalCount, canGoNext, canGoPrevious, onNextPage, onPreviousPage, onPageSizeChange } = serverPagination;
    const currentDataCount = table.getRowModel().rows.length;
    const showPageSizeSelector = totalCount ? totalCount > Math.min(...pageSizeOptions) : true;

    return (
      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-white">
        <div className="text-sm text-slate-500">
          {totalCount !== undefined ? (
            <>
              Showing up to{" "}
              <span className="font-medium text-slate-700">{currentDataCount}</span>
              {" of "}
              <span className="font-medium text-slate-700">{totalCount.toLocaleString()}</span>
            </>
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-slate-700">{currentDataCount}</span>
              {canGoNext && " (more available)"}
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onPreviousPage}
              disabled={!canGoPrevious}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onNextPage}
              disabled={!canGoNext}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {showPageSizeSelector && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Rows</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => onPageSizeChange(Number(value))}
              >
                <SelectTrigger className="h-8 w-20" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Client pagination mode (existing logic)
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);
  const minPageSize = Math.min(...pageSizeOptions);
  const showPageSizeSelector = totalRows > minPageSize;

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const total = pageCount;

    if (total <= 5) {
      for (let i = 0; i < total; i++) pages.push(i);
    } else {
      pages.push(0);
      if (pageIndex > 2) pages.push("ellipsis");
      const start = Math.max(1, pageIndex - 1);
      const end = Math.min(total - 2, pageIndex + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (pageIndex < total - 3) pages.push("ellipsis");
      if (!pages.includes(total - 1)) pages.push(total - 1);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-white">
      <div className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{startRow}</span>–
        <span className="font-medium text-slate-700">{endRow}</span>
        {" of "}
        <span className="font-medium text-slate-700">{totalRows}</span>
      </div>

      <div className="flex items-center gap-4">
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {getPageNumbers().map((page, idx) =>
              page === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">
                  ...
                </span>
              ) : (
                <Button
                  key={page}
                  variant={page === pageIndex ? "default" : "ghost"}
                  size="sm"
                  onClick={() => table.setPageIndex(page)}
                  className="min-w-[32px]"
                >
                  {page + 1}
                </Button>
              ),
            )}

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-20" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
