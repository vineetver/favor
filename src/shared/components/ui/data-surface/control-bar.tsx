"use client";

import { cn } from "@infra/utils";
import {
  BarChart3,
  Search,
  SlidersHorizontal,
  Table as TableIcon,
  X,
} from "lucide-react";
import { Button } from "../button";
import { Input } from "../input";
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
        "flex flex-wrap items-center gap-3 px-6 py-4 border-b border-slate-100 bg-white",
        sticky && "sticky top-0 z-20",
      )}
    >
      {/* Left: Search + Filter */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {showSearch && onSearchChange && (
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 bg-slate-50 focus:bg-white"
            />
          </div>
        )}

        {onFilterClick && (
          <Button
            variant={hasActiveFilters ? "outline" : "outline"}
            onClick={onFilterClick}
            className={cn(
              hasActiveFilters && "border-primary bg-primary/5 text-primary",
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
          </Button>
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
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemoveFilterChip(chip.id)}
                    className="h-4 w-4 p-0 hover:bg-transparent"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </span>
            ))}
            {onClearFilters && filterChips.length > 1 && (
              <Button
                variant="link"
                size="sm"
                onClick={onClearFilters}
                className="text-xs h-auto p-0"
              >
                Clear all
              </Button>
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
      <Button
        variant={value === "table" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("table")}
        className={cn(
          value === "table" && "bg-white shadow-sm",
        )}
      >
        <TableIcon className="w-4 h-4" />
        Table
      </Button>
      <Button
        variant={value === "chart" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("chart")}
        className={cn(
          value === "chart" && "bg-white shadow-sm",
        )}
      >
        <BarChart3 className="w-4 h-4" />
        Chart
      </Button>
    </div>
  );
}
