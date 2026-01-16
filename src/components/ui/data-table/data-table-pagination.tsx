"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Table } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  // Calculate progress percentage
  const progressPercent = totalRows > 0 ? (endRow / totalRows) * 100 : 0;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const current = pageIndex;
    const total = pageCount;

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 0; i < total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(0);

      if (current > 2) {
        pages.push("ellipsis");
      }

      // Show pages around current
      const start = Math.max(1, current - 1);
      const end = Math.min(total - 2, current + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (current < total - 3) {
        pages.push("ellipsis");
      }

      // Always show last page
      if (!pages.includes(total - 1)) {
        pages.push(total - 1);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="relative">
      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
        <div
          className="h-full bg-primary/30 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Pagination controls */}
      <div className="bg-white px-6 py-3 flex items-center justify-between">
        {/* Row count info */}
        <div className="text-sm text-slate-500">
          Showing{" "}
          <span className="font-medium text-slate-700">{startRow}</span>
          {" - "}
          <span className="font-medium text-slate-700">{endRow}</span>
          {" of "}
          <span className="font-medium text-slate-700">{totalRows}</span>
        </div>

        {/* Page numbers */}
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            {/* Previous button */}
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            {pageNumbers.map((page, idx) => {
              if (page === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 text-slate-400"
                  >
                    ...
                  </span>
                );
              }

              const isActive = page === pageIndex;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => table.setPageIndex(page)}
                  className={cn(
                    "min-w-[32px] h-8 px-2.5 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {page + 1}
                </button>
              );
            })}

            {/* Next button */}
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
