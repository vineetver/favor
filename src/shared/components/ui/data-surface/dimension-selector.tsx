"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import { cn } from "@infra/utils";
import type { DimensionOption } from "./types";

interface DimensionSelectorProps {
  label: string;
  options: DimensionOption[];
  value: string;
  onChange: (value: string) => void;
  presentation?: "segmented" | "dropdown";
  className?: string;
}

export function DimensionSelector({
  label,
  options,
  value,
  onChange,
  presentation,
  className,
}: DimensionSelectorProps) {
  const [search, setSearch] = React.useState("");

  const mode = presentation ?? (options.length <= 3 ? "segmented" : "dropdown");
  const searchable = options.length > 10;

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = React.useCallback(
    (optionValue: string) => {
      onChange(optionValue);
    },
    [onChange],
  );

  if (mode === "segmented") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </span>
        <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(option.value);
              }}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                value === option.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {selectedOption?.label ?? "Select..."}
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-0" align="start">
          {searchable && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-auto p-1">
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  handleSelect(option.value);
                  setSearch("");
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  value === option.value
                    ? "bg-primary/10 text-primary"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                {option.label}
                {value === option.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
