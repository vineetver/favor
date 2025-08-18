"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NoDataState } from "@/components/ui/error-states";
import type { FilteredItem } from "@/lib/annotations/types";

export function AnnotationTable({ items }: { items: FilteredItem[] }) {
  if (!items || items.length === 0) {
    return <NoDataState categoryName="Annotation Data" />;
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card shadow-md text-sm">
      <dl className="divide-y divide-border/40 overflow-hidden">
        {items.map((item, index) => {
          if (item.value === undefined || item.value === null) return null;

          return (
            <div
              key={`${item.key}-${index}`}
              className="px-4 py-4 sm:px-6 sm:py-5 border-b border-border/40 last:border-b-0"
            >
              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-6 sm:divide-x sm:divide-border">
                {/* Title and Icon Column */}
                <div className="flex items-start space-x-2 sm:w-1/3 sm:flex-shrink-0 sm:pr-6">
                  <dt className="font-medium text-foreground leading-6 break-words">
                    {item.header}:
                  </dt>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-5 w-5 cursor-pointer fill-foreground text-background hover:text-background/90 transition-colors flex-shrink-0 mt-0.5" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-md">
                        <div>{item.tooltip}</div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Value Column */}
                <dd className="text-muted-foreground sm:flex-1 sm:pl-6 min-w-0">
                  {typeof item.value === "string" ||
                  typeof item.value === "number" ? (
                    <span className="break-all whitespace-pre-wrap word-wrap-anywhere">
                      {item.value}
                    </span>
                  ) : (
                    item.value
                  )}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
