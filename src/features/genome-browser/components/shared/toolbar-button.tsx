"use client";

// src/features/genome-browser/components/shared/toolbar-button.tsx
// Reusable tooltip-wrapped button for toolbars

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

type ToolbarButtonProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
};

export function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  className,
  size = "sm",
}: ToolbarButtonProps) {
  const sizeClasses = size === "sm" ? "h-8 w-8 p-0" : "h-9 w-9 p-0";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          onClick={onClick}
          disabled={disabled}
          className={cn(sizeClasses, className)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
