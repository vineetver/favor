"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
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
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Filters</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {filters.map((filter) => (
            <div key={filter.id}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {filter.label}
              </label>

              {filter.type === "select" && filter.options && (
                <select
                  value={(filterValues[filter.id] as string) ?? ""}
                  onChange={(e) => onFilterChange(filter.id, e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{filter.placeholder ?? "All"}</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {filter.type === "text" && (
                <input
                  type="text"
                  value={(filterValues[filter.id] as string) ?? ""}
                  onChange={(e) => onFilterChange(filter.id, e.target.value)}
                  placeholder={filter.placeholder}
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              )}

              {filter.type === "multiselect" && filter.options && (
                <div className="space-y-2">
                  {filter.options.map((opt) => {
                    const selected = ((filterValues[filter.id] as string[]) ?? []).includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            const current = (filterValues[filter.id] as string[]) ?? [];
                            const next = e.target.checked
                              ? [...current, opt.value]
                              : current.filter((v) => v !== opt.value);
                            onFilterChange(filter.id, next);
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex-1 h-10 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Reset
            </button>
          )}
          {onApply && (
            <button
              type="button"
              onClick={onApply}
              className="flex-1 h-10 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
            >
              Apply
            </button>
          )}
          {!onApply && !onReset && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </>
  );
}
