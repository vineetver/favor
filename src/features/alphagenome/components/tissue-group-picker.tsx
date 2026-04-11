"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import { Filter } from "lucide-react";
import type { TissueGroup } from "../types";
import { TISSUE_GROUPS } from "../utils";

interface TissueGroupPickerProps {
  selected: TissueGroup[];
  onChange: (groups: TissueGroup[]) => void;
  disabled?: boolean;
}

export function TissueGroupPicker({
  selected,
  onChange,
  disabled,
}: TissueGroupPickerProps) {
  const allSelected = selected.length === 0;
  const label = allSelected
    ? "All tissues"
    : selected.length === 1
      ? selected[0]
      : `${selected.length} tissues`;

  function toggle(id: TissueGroup) {
    if (allSelected) {
      onChange([id]);
      return;
    }
    if (selected.includes(id)) {
      onChange(selected.filter((g) => g !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-7 px-2.5 text-xs gap-1.5",
            !allSelected && "text-foreground",
          )}
        >
          <Filter className="h-3 w-3" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onChange([])}
            className={cn(
              "px-2 py-1 rounded text-xs transition-colors",
              allSelected
                ? "bg-primary/10 text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            All
          </button>
          {TISSUE_GROUPS.map((g) => {
            const active = !allSelected && selected.includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggle(g.id)}
                className={cn(
                  "px-2 py-1 rounded text-xs transition-colors",
                  active
                    ? "bg-primary/10 text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
