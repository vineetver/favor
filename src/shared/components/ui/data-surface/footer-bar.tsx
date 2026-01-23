"use client";

import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@infra/utils";

interface FooterBarProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export function FooterBar<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
}: FooterBarProps<TData>) {
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
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {getPageNumbers().map((page, idx) =>
              page === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => table.setPageIndex(page)}
                  className={cn(
                    "min-w-[32px] h-8 px-2.5 text-sm font-medium rounded-md transition-colors",
                    page === pageIndex
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {page + 1}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="h-8 px-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
