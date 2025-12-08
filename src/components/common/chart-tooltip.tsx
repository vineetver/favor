"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type TooltipPayloadEntry = {
  name?: string;
  value?: number | string | null;
  color?: string;
  payload?: Record<string, unknown>;
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  children?: ReactNode;
  className?: string;
  title?: string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  children,
  className,
  title,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <Card
      className={cn(
        "border shadow-md bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <CardContent className="p-3 space-y-1">
        {(title || label) && (
          <p className="text-sm font-semibold mb-2">{title || label}</p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
