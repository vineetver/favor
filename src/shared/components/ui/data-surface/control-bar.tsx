"use client";

import { cn } from "@infra/utils";
import {
  BarChart3,
  Search,
  SlidersHorizontal,
  Table as TableIcon,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import type { ControlBarProps, ViewMode } from "./types";

const CHIP_VISIBLE_LIMIT = 5;

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
  const [showAllChips, setShowAllChips] = useState(false);
  const visibleChips = showAllChips
    ? filterChips
    : filterChips.slice(0, CHIP_VISIBLE_LIMIT);
  const hiddenCount = filterChips.length - visibleChips.length;
  const activeFilterCount = filterChips.length;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-background",
        sticky && "sticky top-0 z-20",
      )}
    >
      {/* Left: Search + Filter */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showSearch && onSearchChange && (
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-3 h-9 text-xs bg-muted focus:bg-background"
            />
          </div>
        )}

        {onFilterClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onFilterClick}
            className={cn(
              "h-9",
              hasActiveFilters && "border-primary bg-primary/5 text-primary",
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}

        {/* Filter Chips */}
        {filterChips.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {visibleChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-[11px] font-medium bg-muted text-foreground rounded-full max-w-[220px]"
                title={`${chip.label}: ${chip.value}`}
              >
                <span className="text-muted-foreground truncate">
                  {chip.label}:
                </span>
                <span className="truncate">{chip.value}</span>
                {onRemoveFilterChip && (
                  <button
                    type="button"
                    onClick={() => onRemoveFilterChip(chip.id)}
                    className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition-colors flex-shrink-0"
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            ))}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllChips(true)}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground px-1.5"
              >
                +{hiddenCount} more
              </button>
            )}
            {showAllChips && filterChips.length > CHIP_VISIBLE_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllChips(false)}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground px-1.5"
              >
                Show less
              </button>
            )}
            {onClearFilters && filterChips.length > 1 && (
              <button
                type="button"
                onClick={onClearFilters}
                className="text-[11px] font-medium text-primary hover:underline px-1.5"
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
    <div className="inline-flex items-center p-0.5 bg-muted rounded-lg">
      <Button
        variant={value === "table" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("table")}
        className={cn(value === "table" && "bg-background shadow-sm")}
      >
        <TableIcon className="w-4 h-4" />
        Table
      </Button>
      <Button
        variant={value === "chart" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("chart")}
        className={cn(value === "chart" && "bg-background shadow-sm")}
      >
        <BarChart3 className="w-4 h-4" />
        Chart
      </Button>
    </div>
  );
}
