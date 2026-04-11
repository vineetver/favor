"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { Modality } from "../types";
import { MODALITIES } from "../utils";

interface ModalityPickerProps {
  selected: Modality[];
  onChange: (modalities: Modality[]) => void;
  disabled?: boolean;
}

export function ModalityPicker({
  selected,
  onChange,
  disabled,
}: ModalityPickerProps) {
  function toggle(id: Modality) {
    if (selected.includes(id)) {
      if (selected.length === 1) return; // keep at least one
      onChange(selected.filter((m) => m !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap gap-1.5">
        {MODALITIES.map((m) => {
          const active = selected.includes(m.id);
          return (
            <Tooltip key={m.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => toggle(m.id)}
                  className={cn(
                    "h-7 px-2.5 text-xs font-medium rounded-md transition-colors",
                    active
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {m.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-52">
                <p className="font-medium">{m.label}</p>
                <p className="text-muted-foreground">{m.description}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Resolution: {m.resolution}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
