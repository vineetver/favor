"use client";

import { cn } from "@infra/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import { Check, ChevronDown, Search } from "lucide-react";
import * as React from "react";
import { Button } from "../button";
import { Input } from "../input";
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
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <div className="inline-flex items-center p-0.5 bg-muted rounded-lg">
          {options.map((option) => (
            <Button
              key={option.value}
              variant={value === option.value ? "secondary" : "ghost"}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(option.value);
              }}
              className={cn(
                value === option.value && "bg-background shadow-sm",
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">
            {selectedOption?.label ?? "Select..."}
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-0" align="start">
          {searchable && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8"
                />
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-auto p-1">
            {filteredOptions.map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleSelect(option.value);
                  setSearch("");
                }}
                className={cn(
                  "w-full justify-between",
                  value === option.value && "bg-primary/10 text-primary",
                )}
              >
                {option.label}
                {value === option.value && <Check className="w-4 h-4" />}
              </Button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
