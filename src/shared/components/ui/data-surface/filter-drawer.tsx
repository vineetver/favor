"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import { Checkbox } from "@shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import type { FilterDrawerProps } from "./types";

export function FilterDrawer({
  open,
  onClose,
  filters,
  filterValues,
  onFilterChange,
  onApply,
  onReset,
}: FilterDrawerProps) {
  // Internal state for text inputs (prevents parent re-renders on every keystroke)
  const [localTextValues, setLocalTextValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const filter of filters) {
      if (filter.type === "text") {
        initial[filter.id] = (filterValues[filter.id] as string) ?? "";
      }
    }
    return initial;
  });

  // Debounce timers for text inputs
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Sync internal state with external filterValues when they change from outside
  // (e.g., when clearing filters or browser back/forward)
  const prevFilterValues = useRef(filterValues);
  useEffect(() => {
    // Only sync if values actually changed from outside
    if (prevFilterValues.current !== filterValues) {
      setLocalTextValues((prev) => {
        const updated: Record<string, string> = {};
        let hasChanged = false;

        for (const filter of filters) {
          if (filter.type === "text") {
            const newValue = (filterValues[filter.id] as string) ?? "";
            updated[filter.id] = newValue;
            if (prev[filter.id] !== newValue) {
              hasChanged = true;
            }
          }
        }

        return hasChanged ? updated : prev;
      });
      prevFilterValues.current = filterValues;
    }
  }, [filterValues, filters]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  const handleTextInputChange = useCallback(
    (filterId: string, value: string) => {
      // Update local state immediately (instant UI feedback)
      setLocalTextValues((prev) => {
        if (prev[filterId] === value) return prev;
        return { ...prev, [filterId]: value };
      });

      // Clear existing timer for this filter
      if (debounceTimers.current[filterId]) {
        clearTimeout(debounceTimers.current[filterId]);
      }

      // Debounce the parent callback (300ms)
      debounceTimers.current[filterId] = setTimeout(() => {
        onFilterChange(filterId, value);
        delete debounceTimers.current[filterId];
      }, 300);
    },
    [onFilterChange],
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-background shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Filters</h3>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Filter Content */}
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {filters.map((filter) => (
            <div key={filter.id}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {filter.label}
              </label>

              {filter.type === "select" && filter.options && (
                <Select
                  value={(filterValues[filter.id] as string) ?? ""}
                  onValueChange={(value) => onFilterChange(filter.id, value)}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder={filter.placeholder ?? "All"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{filter.placeholder ?? "All"}</SelectItem>
                    {filter.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filter.type === "text" && (
                <Input
                  type="text"
                  value={localTextValues[filter.id] ?? ""}
                  onChange={(e) => handleTextInputChange(filter.id, e.target.value)}
                  placeholder={filter.placeholder}
                />
              )}

              {filter.type === "multiselect" && filter.options && (
                <div className="space-y-2">
                  {filter.options.map((opt) => {
                    const selected = (
                      (filterValues[filter.id] as string[]) ?? []
                    ).includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const current =
                              (filterValues[filter.id] as string[]) ?? [];
                            const next = checked
                              ? [...current, opt.value]
                              : current.filter((v) => v !== opt.value);
                            onFilterChange(filter.id, next);
                          }}
                        />
                        <span className="text-sm text-foreground">
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-border">
          {onReset && (
            <Button
              variant="secondary"
              onClick={onReset}
              className="flex-1"
            >
              Reset
            </Button>
          )}
          {onApply && (
            <Button
              onClick={onApply}
              className="flex-1"
            >
              Apply
            </Button>
          )}
          {!onApply && !onReset && (
            <Button
              onClick={onClose}
              className="flex-1"
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
