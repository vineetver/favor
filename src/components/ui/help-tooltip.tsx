"use client";

import { HelpCircle } from "lucide-react";
import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpTooltipProps {
  content: string;
  link?: string;
  className?: string;
}

export const HelpTooltip = React.forwardRef<
  React.ElementRef<typeof HelpCircle>,
  HelpTooltipProps
>(({ content, link, className }, ref) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle
            ref={ref}
            className={`h-5 w-5 text-muted-foreground hover:text-foreground cursor-help ${className || ""}`}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <p className="text-sm">{content}</p>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Learn more →
              </a>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

HelpTooltip.displayName = "HelpTooltip";
