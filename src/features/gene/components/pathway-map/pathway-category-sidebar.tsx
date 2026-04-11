"use client";

import { cn } from "@infra/utils";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Label } from "@shared/components/ui/label";
import { ChevronRight } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { getCategoryColor, type PathwayCategorySidebarProps } from "./types";

function PathwayCategorySidebarInner({
  categories,
  pathways,
  filterState,
  onFilterChange,
  className,
}: PathwayCategorySidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const isCategoryVisible = useCallback(
    (name: string) =>
      filterState.selectedCategories.size === 0 ||
      !filterState.selectedCategories.has(name),
    [filterState.selectedCategories],
  );

  const isPathwayHidden = useCallback(
    (id: string) => filterState.hiddenPathwayIds.has(id),
    [filterState.hiddenPathwayIds],
  );

  const toggleCategory = useCallback(
    (name: string) => {
      const next = new Set(filterState.selectedCategories);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      onFilterChange({ ...filterState, selectedCategories: next });
    },
    [filterState, onFilterChange],
  );

  const togglePathway = useCallback(
    (id: string) => {
      const next = new Set(filterState.hiddenPathwayIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onFilterChange({ ...filterState, hiddenPathwayIds: next });
    },
    [filterState, onFilterChange],
  );

  const toggleExpand = useCallback((name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    onFilterChange({
      ...filterState,
      selectedCategories: new Set(),
      hiddenPathwayIds: new Set(),
    });
  }, [filterState, onFilterChange]);

  const handleClearAll = useCallback(() => {
    onFilterChange({
      ...filterState,
      selectedCategories: new Set(categories.map((c) => c.name)),
      hiddenPathwayIds: new Set(),
    });
  }, [filterState, onFilterChange, categories]);

  const handleHierarchyToggle = useCallback(
    (checked: boolean) => {
      onFilterChange({ ...filterState, showHierarchy: checked });
    },
    [filterState, onFilterChange],
  );

  const allVisible =
    filterState.selectedCategories.size === 0 &&
    filterState.hiddenPathwayIds.size === 0;
  const noneVisible = filterState.selectedCategories.size === categories.length;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Categories
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={allVisible}
              className={cn(
                "text-xs font-medium text-primary hover:text-primary/80 transition-colors",
                allVisible && "text-muted-foreground/50 cursor-not-allowed",
              )}
            >
              All
            </button>
            <span className="text-muted-foreground/40 text-xs">/</span>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={noneVisible}
              className={cn(
                "text-xs font-medium text-primary hover:text-primary/80 transition-colors",
                noneVisible && "text-muted-foreground/50 cursor-not-allowed",
              )}
            >
              None
            </button>
          </div>
        </div>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto py-0.5">
        {categories.map((category) => {
          const visible = isCategoryVisible(category.name);
          const expanded = expandedCategories.has(category.name);
          const colors = getCategoryColor(category.name);

          return (
            <div key={category.name}>
              {/* Category row */}
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-[5px] transition-opacity",
                  !visible && "opacity-35",
                )}
              >
                {/* Color dot — click to toggle visibility */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category.name)}
                  className="shrink-0 p-0.5 rounded hover:bg-accent transition-colors"
                  title={visible ? "Hide category" : "Show category"}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full transition-all"
                    style={{
                      backgroundColor: visible ? colors.border : "transparent",
                      border: `2px solid ${colors.border}`,
                    }}
                  />
                </button>

                {/* Expand chevron + name */}
                <button
                  type="button"
                  onClick={() => toggleExpand(category.name)}
                  className="flex items-center gap-1 flex-1 min-w-0 text-left rounded px-1 py-0.5 hover:bg-accent transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 text-muted-foreground/60 transition-transform shrink-0",
                      expanded && "rotate-90",
                    )}
                  />
                  <span
                    className="text-sm truncate flex-1 font-medium text-foreground"
                    title={category.name}
                  >
                    {category.name}
                  </span>
                </button>

                <span className="text-xs tabular-nums text-muted-foreground pr-1 shrink-0">
                  {category.count}
                </span>
              </div>

              {/* Expanded pathway items */}
              {expanded && (
                <div className="pb-1">
                  {category.pathways.map((pw) => {
                    const pwVisible = visible && !isPathwayHidden(pw.id);
                    return (
                      <button
                        key={pw.id}
                        type="button"
                        onClick={() => togglePathway(pw.id)}
                        disabled={!visible}
                        className={cn(
                          "w-full flex items-center gap-1.5 pl-8 pr-3 py-[3px] text-left transition-all hover:bg-accent",
                          !pwVisible && "opacity-35",
                          !visible && "pointer-events-none",
                        )}
                        title={pw.name}
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: pwVisible
                              ? colors.border
                              : "transparent",
                            border: `1.5px solid ${colors.border}`,
                          }}
                        />
                        <span className="text-xs leading-tight truncate text-muted-foreground">
                          {pw.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Display options */}
      <div className="border-t border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-hierarchy"
            checked={filterState.showHierarchy}
            onCheckedChange={handleHierarchyToggle}
            className="h-3.5 w-3.5"
          />
          <Label
            htmlFor="show-hierarchy"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Show hierarchy edges
          </Label>
        </div>
      </div>
    </div>
  );
}

export const PathwayCategorySidebar = memo(PathwayCategorySidebarInner);
