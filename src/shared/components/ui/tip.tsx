"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";

interface TipProps {
  children: React.ReactNode;
  content: string;
  side?: "top" | "bottom" | "left" | "right";
}

/** Inline text with a dotted underline that reveals a tooltip on hover. */
export function Tip({ children, content, side = "top" }: TipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default border-b border-dotted border-muted-foreground/30">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-72">
        <p className="text-xs leading-relaxed">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}
