"use client";

import { ChevronDown, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@infra/utils";
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
import type { FilterConfig, FilterDrawerProps } from "./types";

const DEFAULT_SECTION = "__default__";

export function FilterDrawer({
  open,
  onClose,
  filters,
  filterValues,
  onFilterChange,
  onApply,
  onReset,
}: FilterDrawerProps) {
  // Group filters by section, preserving the first-seen order of section keys
  // so the drawer layout follows the order filters are declared in.
  const sections = useMemo(() => {
    const order: string[] = [];
    const buckets = new Map<string, FilterConfig[]>();
    for (const f of filters) {
      const key = f.section ?? DEFAULT_SECTION;
      if (!buckets.has(key)) {
        buckets.set(key, []);
        order.push(key);
      }
      buckets.get(key)!.push(f);
    }
    return order.map((key) => ({ key, label: key === DEFAULT_SECTION ? null : key, items: buckets.get(key)! }));
  }, [filters]);

  // Section open/close state. First section starts open; others collapsed when there's >1.
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    sections.forEach((s, i) => {
      state[s.key] = sections.length === 1 || i === 0;
    });
    return state;
  });

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
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div role="dialog" aria-label="Filters" className="fixed right-0 top-0 bottom-0 w-80 bg-background shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
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
        <div className="flex-1 overflow-auto">
          {sections.map((section) => {
            const isOpen = openSections[section.key] ?? true;
            const sectionActiveCount = section.items.reduce((acc, f) => {
              const v = filterValues[f.id];
              if (Array.isArray(v)) return acc + v.length;
              if (typeof v === "string" && v) return acc + 1;
              return acc;
            }, 0);

            return (
              <div key={section.key} className="border-b border-border last:border-b-0">
                {section.label && (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSections((prev) => ({ ...prev, [section.key]: !isOpen }))
                    }
                    className="flex items-center justify-between w-full px-5 py-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      {section.label}
                      {sectionActiveCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full">
                          {sectionActiveCount}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                )}

                {isOpen && (
                  <div className={cn("space-y-4", section.label ? "px-5 pb-4" : "p-5")}>
                    {section.items.map((filter) => (
                      <div key={filter.id}>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                          {filter.label}
                        </label>

                        {filter.type === "select" && filter.options && (
                          <Select
                            value={(filterValues[filter.id] as string) || "__all__"}
                            onValueChange={(value) =>
                              onFilterChange(filter.id, value === "__all__" ? "" : value)
                            }
                          >
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder={filter.placeholder ?? "All"} />
                            </SelectTrigger>
                            <SelectContent
                              position="popper"
                              className="max-w-[var(--radix-select-trigger-width)]"
                            >
                              <SelectItem value="__all__">
                                {filter.placeholder ?? "All"}
                              </SelectItem>
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
                            onChange={(e) =>
                              handleTextInputChange(filter.id, e.target.value)
                            }
                            placeholder={filter.placeholder}
                            className="h-9"
                          />
                        )}

                        {filter.type === "multiselect" && filter.options && (
                          <MultiselectField
                            filter={filter}
                            value={(filterValues[filter.id] as string[]) ?? []}
                            onChange={(next) => onFilterChange(filter.id, next)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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

/**
 * Multiselect with a search box and a scrollable, capped option list.
 * Long option lists (e.g., ClinVar with 30+ values) are usable without
 * dominating the drawer's vertical space.
 */
function MultiselectField({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const visibleOptions = useMemo(() => {
    const opts = filter.options ?? [];
    if (!query) return opts;
    const q = query.toLowerCase();
    return opts.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [filter.options, query]);

  const toggle = (optValue: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...value, optValue]))
      : value.filter((v) => v !== optValue);
    onChange(next);
  };

  return (
    <div className="rounded-md border border-border bg-background">
      {(filter.options?.length ?? 0) > 6 && (
        <div className="border-b border-border px-2 py-1.5">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${filter.label.toLowerCase()}...`}
            className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 px-1"
          />
        </div>
      )}
      <div className="max-h-44 overflow-y-auto py-1">
        {visibleOptions.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
        ) : (
          visibleOptions.map((opt) => {
            const selected = value.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/40"
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => toggle(opt.value, !!checked)}
                />
                <span className="text-xs text-foreground truncate">{opt.label}</span>
              </label>
            );
          })
        )}
      </div>
      {value.length > 0 && (
        <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground">
            {value.length} selected
          </span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] font-medium text-primary hover:underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
