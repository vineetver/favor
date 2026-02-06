"use client";

import { cn } from "@infra/utils";
import { Checkbox } from "@shared/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import { Label } from "@shared/components/ui/label";
import { ChevronRight } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import {
  buildHierarchicalCategories,
  type CategoryFilterState,
  getCategoryColor,
  type HierarchicalCategory,
  type PathwayCategorySidebarProps,
} from "./types";

/**
 * Recursive component for rendering hierarchical pathway items
 */
function HierarchyItem({
  item,
  level,
  isSelected,
  expandedItems,
  onToggleExpand,
  onToggleCategory,
}: {
  item: HierarchicalCategory;
  level: number;
  isSelected: boolean;
  expandedItems: Set<string>;
  onToggleExpand: (name: string) => void;
  onToggleCategory: (name: string) => void;
}) {
  const hasChildren = item.subcategories.length > 0;
  const isExpanded = expandedItems.has(item.name);
  const colors = getCategoryColor(item.name);

  if (hasChildren) {
    return (
      <Collapsible open={isExpanded} onOpenChange={() => onToggleExpand(item.name)}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-muted transition-colors",
              !isSelected && "opacity-50",
            )}
            style={{ paddingLeft: `${level * 12 + 12}px` }}
          >
            <ChevronRight
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0",
                isExpanded && "rotate-90",
              )}
            />
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: isSelected ? colors.border : "#94a3b8",
              }}
            />
            <span
              className={cn(
                "text-sm truncate flex-1",
                isSelected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.name}
            </span>
            <span
              className={cn(
                "text-xs tabular-nums",
                isSelected ? "text-muted-foreground" : "text-muted-foreground",
              )}
            >
              {item.count}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {item.subcategories.map((child) => (
            <HierarchyItem
              key={child.name}
              item={child}
              level={level + 1}
              isSelected={isSelected}
              expandedItems={expandedItems}
              onToggleExpand={onToggleExpand}
              onToggleCategory={onToggleCategory}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Leaf node (single pathway)
  return (
    <button
      type="button"
      onClick={() => onToggleCategory(item.name)}
      className={cn(
        "w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-muted transition-colors",
        !isSelected && "opacity-50",
      )}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          backgroundColor: isSelected ? colors.border : "#94a3b8",
        }}
      />
      <span
        className={cn(
          "text-xs truncate flex-1",
          isSelected ? "text-muted-foreground" : "text-muted-foreground",
        )}
      >
        {item.name}
      </span>
    </button>
  );
}

/**
 * Category filter sidebar for pathway map.
 * Allows users to filter pathways by category and toggle hierarchy display.
 * Supports collapsible hierarchical view.
 */
function PathwayCategorySidebarInner({
  categories,
  hierarchyEdges,
  pathways,
  filterState,
  onFilterChange,
  className,
}: PathwayCategorySidebarProps) {
  // Track expanded state for hierarchical items
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Build hierarchical structure when hierarchy view is enabled
  const hierarchicalCategories = useMemo(() => {
    if (!filterState.showHierarchy || hierarchyEdges.length === 0) {
      return null;
    }
    return buildHierarchicalCategories(pathways, hierarchyEdges);
  }, [pathways, hierarchyEdges, filterState.showHierarchy]);

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

  const handleToggleExpand = useCallback((name: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const allSelected = filterState.selectedCategories.size === 0;
  const noneSelected =
    filterState.selectedCategories.size === categories.length;

  return (
    <div className={cn("flex flex-col bg-white", className)}>
      {/* Categories section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Categories
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={allSelected}
              className={cn(
                "text-xs text-indigo-600 hover:text-indigo-700",
                allSelected && "text-muted-foreground cursor-not-allowed",
              )}
            >
              All
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={noneSelected}
              className={cn(
                "text-xs text-indigo-600 hover:text-indigo-700",
                noneSelected && "text-muted-foreground cursor-not-allowed",
              )}
            >
              None
            </button>
          </div>
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Hierarchical view */}
          {hierarchicalCategories && hierarchicalCategories.length > 0 ? (
            hierarchicalCategories.map((category) => {
              const colors = getCategoryColor(category.name);
              const isSelected =
                filterState.selectedCategories.size === 0 ||
                !filterState.selectedCategories.has(category.name);
              const isExpanded = expandedItems.has(category.name);

              return (
                <Collapsible
                  key={category.name}
                  open={isExpanded}
                  onOpenChange={() => handleToggleExpand(category.name)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-muted transition-colors",
                        !isSelected && "opacity-50",
                      )}
                    >
                      <ChevronRight
                        className={cn(
                          "w-3.5 h-3.5 text-muted-foreground transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: isSelected ? colors.border : "#94a3b8",
                        }}
                      />
                      <span
                        className={cn(
                          "text-sm truncate flex-1 font-medium",
                          isSelected ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {category.name}
                      </span>
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          isSelected ? "text-muted-foreground" : "text-muted-foreground",
                        )}
                      >
                        {category.count}
                      </span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {category.subcategories.map((child) => (
                      <HierarchyItem
                        key={child.name}
                        item={child}
                        level={1}
                        isSelected={isSelected}
                        expandedItems={expandedItems}
                        onToggleExpand={handleToggleExpand}
                        onToggleCategory={handleCategoryToggle}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          ) : (
            // Flat view (original behavior)
            categories.map((category) => {
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
                    "w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-muted transition-colors",
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
                      isSelected ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {category.name}
                  </span>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      isSelected ? "text-muted-foreground" : "text-muted-foreground",
                    )}
                  >
                    {category.count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Display options section */}
      <div className="border-t border-border px-4 py-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
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
            className="text-sm text-foreground cursor-pointer"
          >
            Show hierarchy
          </Label>
        </div>
      </div>
    </div>
  );
}

export const PathwayCategorySidebar = memo(PathwayCategorySidebarInner);
