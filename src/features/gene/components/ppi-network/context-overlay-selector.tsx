"use client";

import { cn } from "@infra/utils";
import { DimensionSelector } from "@shared/components/ui/data-surface/dimension-selector";
import { Loader2, Layers } from "lucide-react";
import { memo } from "react";
import { CONTEXT_OVERLAY_OPTIONS, type ContextOverlay } from "./types";

interface ContextOverlaySelectorProps {
  value: ContextOverlay;
  onChange: (value: ContextOverlay) => void;
  isLoading?: boolean;
  className?: string;
}

function ContextOverlaySelectorInner({
  value,
  onChange,
  isLoading = false,
  className,
}: ContextOverlaySelectorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isLoading && (
        <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
      )}
      <DimensionSelector
        label="Overlay"
        options={CONTEXT_OVERLAY_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        }))}
        value={value}
        onChange={(v) => onChange(v as ContextOverlay)}
        presentation="dropdown"
      />
    </div>
  );
}

export const ContextOverlaySelector = memo(ContextOverlaySelectorInner);
