"use client";

import { Button } from "@shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@infra/utils";
import type { ScorerKey } from "../types";
import { SCORERS } from "../utils";

interface ScorerPickerProps {
  selected: ScorerKey[];
  onChange: (scorers: ScorerKey[]) => void;
  disabled?: boolean;
}

export function ScorerPicker({
  selected,
  onChange,
  disabled,
}: ScorerPickerProps) {
  function toggle(id: ScorerKey) {
    if (selected.includes(id)) {
      if (selected.length === 1) return;
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap gap-1.5">
        {SCORERS.map((s) => {
          const active = selected.includes(s.id);
          return (
            <Tooltip key={s.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    "h-7 px-2.5 text-xs font-medium rounded-md transition-colors",
                    active
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {s.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-52">
                <p className="font-medium">{s.label}</p>
                <p className="text-muted-foreground">{s.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
