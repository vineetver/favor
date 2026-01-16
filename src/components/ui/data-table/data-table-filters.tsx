"use client";

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DataTableFilterGroup } from "./types";

interface DataTableFiltersProps {
  /** Filter groups to render as toggle groups */
  filterGroups: DataTableFilterGroup[];
  /** Current filter values keyed by group id */
  filterValues: Record<string, string>;
  /** Filter change handler */
  onFilterChange: (groupId: string, value: string) => void;
  /** Additional class name */
  className?: string;
}

/**
 * Sub-tabs / filter toggles for data tables.
 * Uses ToggleGroup from shadcn/ui for consistent styling.
 *
 * Example usage:
 * ```tsx
 * const filterGroups = [
 *   {
 *     id: "dataSource",
 *     options: [
 *       { value: "genomes", label: "Genomes" },
 *       { value: "exomes", label: "Exomes" },
 *     ],
 *     defaultValue: "genomes",
 *   },
 *   {
 *     id: "demographic",
 *     options: [
 *       { value: "overall", label: "Overall" },
 *       { value: "male", label: "Male" },
 *       { value: "female", label: "Female" },
 *     ],
 *     defaultValue: "overall",
 *   },
 * ];
 * ```
 */
export function DataTableFilters({
  filterGroups,
  filterValues,
  onFilterChange,
  className,
}: DataTableFiltersProps) {
  if (!filterGroups.length) return null;

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      {filterGroups.map((group, index) => (
        <React.Fragment key={group.id}>
          {/* Separator between groups */}
          {index > 0 && (
            <div className="h-6 w-px bg-slate-200" />
          )}

          {/* Optional label */}
          {group.label && (
            <span className="text-xs font-medium text-slate-500 mr-1">
              {group.label}
            </span>
          )}

          {/* Toggle group */}
          <ToggleGroup
            type="single"
            value={filterValues[group.id] || group.defaultValue || group.options[0]?.value}
            onValueChange={(value) => {
              if (value) onFilterChange(group.id, value);
            }}
            variant="outline"
            size="sm"
          >
            {group.options.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="px-3 text-sm font-medium data-[state=on]:bg-slate-900 data-[state=on]:text-white data-[state=on]:border-slate-900"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </React.Fragment>
      ))}
    </div>
  );
}
