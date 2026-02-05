"use client";

import { cn } from "@infra/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@shared/components/ui/label";
import { memo, useCallback } from "react";
import {
  type CategoryFilterState,
  getCategoryColor,
  type PathwayCategorySidebarProps,
} from "./types";

/**
 * Category filter sidebar for pathway map.
 * Allows users to filter pathways by category and toggle hierarchy display.
 */
function PathwayCategorySidebarInner({
  categories,
  filterState,
  onFilterChange,
  className,
}: PathwayCategorySidebarProps) {
  const handleCategoryToggle = useCallback(
    (categoryName: string) => {
      const newSelected = new Set(filterState.selectedCategories);

      if (newSelected.has(categoryName)) {
        newSelected.delete(categoryName);
      } else {
        newSelected.add(categoryName);
      }

      onFilterChange({
        ...filterState,
        selectedCategories: newSelected,
      });
    },
    [filterState, onFilterChange],
  );

  const handleSelectAll = useCallback(() => {
    onFilterChange({
      ...filterState,
      selectedCategories: new Set(),
    });
  }, [filterState, onFilterChange]);

  const handleClearAll = useCallback(() => {
    // Select all categories (which means none are filtered out)
    onFilterChange({
      ...filterState,
      selectedCategories: new Set(categories.map((c) => c.name)),
    });
  }, [filterState, onFilterChange, categories]);

  const handleHierarchyToggle = useCallback(
    (checked: boolean) => {
      onFilterChange({
        ...filterState,
        showHierarchy: checked,
      });
    },
    [filterState, onFilterChange],
  );

  const allSelected = filterState.selectedCategories.size === 0;
  const noneSelected =
    filterState.selectedCategories.size === categories.length;

  return (
    <div className={cn("flex flex-col bg-white", className)}>
      {/* Categories section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Categories
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={allSelected}
              className={cn(
                "text-xs text-indigo-600 hover:text-indigo-700",
                allSelected && "text-slate-400 cursor-not-allowed",
              )}
            >
              All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={noneSelected}
              className={cn(
                "text-xs text-indigo-600 hover:text-indigo-700",
                noneSelected && "text-slate-400 cursor-not-allowed",
              )}
            >
              None
            </button>
          </div>
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto py-2">
          {categories.map((category) => {
            const colors = getCategoryColor(category.name);
            const isSelected =
              filterState.selectedCategories.size === 0 ||
              !filterState.selectedCategories.has(category.name);

            return (
              <button
                key={category.name}
                type="button"
                onClick={() => handleCategoryToggle(category.name)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-slate-50 transition-colors",
                  !isSelected && "opacity-50",
                )}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: isSelected ? colors.border : "#94a3b8",
                  }}
                />
                <span
                  className={cn(
                    "text-sm truncate flex-1",
                    isSelected ? "text-slate-700" : "text-slate-400",
                  )}
                >
                  {category.name}
                </span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    isSelected ? "text-slate-500" : "text-slate-400",
                  )}
                >
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Display options section */}
      <div className="border-t border-slate-200 px-4 py-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Display
        </h3>
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-hierarchy"
            checked={filterState.showHierarchy}
            onCheckedChange={handleHierarchyToggle}
          />
          <Label
            htmlFor="show-hierarchy"
            className="text-sm text-slate-700 cursor-pointer"
          >
            Show hierarchy
          </Label>
        </div>
      </div>
    </div>
  );
}

export const PathwayCategorySidebar = memo(PathwayCategorySidebarInner);
