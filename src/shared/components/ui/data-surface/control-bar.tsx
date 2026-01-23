"use client";

import {
  BarChart3,
  Search,
  SlidersHorizontal,
  Table as TableIcon,
  X,
} from "lucide-react";
import { cn } from "@infra/utils";
import type { ControlBarProps, ViewMode } from "./types";

export function ControlBar({
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  showSearch = true,
  onFilterClick,
  hasActiveFilters,
  filterChips = [],
  onRemoveFilterChip,
  onClearFilters,
  viewMode = "table",
  onViewModeChange,
  showViewSwitch = false,
  sticky = false,
}: ControlBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 px-6 py-3 border-b border-slate-100 bg-white",
        sticky && "sticky top-0 z-20",
      )}
    >
      {/* Left: Search + Filter */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {showSearch && onSearchChange && (
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
            />
          </div>
        )}

        {onFilterClick && (
          <button
            type="button"
            onClick={onFilterClick}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
              hasActiveFilters
                ? "border-primary bg-primary/5 text-primary"
                : "border-slate-200 text-slate-600 hover:bg-slate-50",
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
          </button>
        )}

        {/* Filter Chips */}
        {filterChips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {filterChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full"
              >
                <span className="text-slate-400">{chip.label}:</span>
                {chip.value}
                {onRemoveFilterChip && (
                  <button
                    type="button"
                    onClick={() => onRemoveFilterChip(chip.id)}
                    className="hover:text-slate-900 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            {onClearFilters && filterChips.length > 1 && (
              <button
                type="button"
                onClick={onClearFilters}
                className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: View Switch */}
      {showViewSwitch && onViewModeChange && (
        <ViewSwitch value={viewMode} onChange={onViewModeChange} />
      )}
    </div>
  );
}

function ViewSwitch({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg">
      <button
        type="button"
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
          value === "table"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700",
        )}
      >
        <TableIcon className="w-4 h-4" />
        Table
      </button>
      <button
        type="button"
        onClick={() => onChange("chart")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
          value === "chart"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700",
        )}
      >
        <BarChart3 className="w-4 h-4" />
        Chart
      </button>
    </div>
  );
}
