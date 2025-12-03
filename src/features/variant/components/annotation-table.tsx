"use client";

import { Info } from "lucide-react";
import { NoDataState } from "@/components/ui/error-states";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EnrichedCell, EnrichedGroup } from "@/lib/data-display/enricher";

interface AnnotationTableProps {
  enrichedData: EnrichedGroup[];
  category: string;
  subcategory: string;
}

export function AnnotationTable({
  enrichedData,
  category,
  subcategory,
}: AnnotationTableProps) {
  // The subcategory from the route corresponds to the group slug
  // For example: subcategory "basic" matches the basicConfig group with slug "basic"
  const targetGroup = enrichedData.find((group) => group.slug === subcategory);

  if (!targetGroup) {
    return <NoDataState categoryName="Annotation Data" />;
  }

  // Cells are already filtered by the enricher based on hideEmpty flag
  const cells = targetGroup.cells;

  if (!cells || cells.length === 0) {
    return <NoDataState categoryName="Annotation Data" />;
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card shadow-md text-sm">
      <dl className="divide-y divide-border/40 overflow-hidden">
        {cells.map((cell: EnrichedCell, index: number) => (
          <div
            key={`${cell.key}-${index}`}
            className="px-4 py-4 sm:px-6 sm:py-5 border-b border-border/40 last:border-b-0"
          >
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-6 sm:divide-x sm:divide-border">
              {/* Title and Icon Column */}
              <div className="flex items-start space-x-2 sm:w-1/3 sm:flex-shrink-0 sm:pr-6">
                <dt className="font-medium text-foreground leading-6 break-words">
                  {cell.header}:
                </dt>
                {cell.description && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-5 w-5 cursor-pointer fill-foreground text-background hover:text-background/90 transition-colors flex-shrink-0 mt-0.5" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-md">
                        <div>{cell.description}</div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Value Column */}
              <dd className="text-muted-foreground sm:flex-1 sm:pl-6 min-w-0">
                {typeof cell.value === "string" ||
                typeof cell.value === "number" ? (
                  <span className="break-all whitespace-pre-wrap word-wrap-anywhere">
                    {cell.value}
                  </span>
                ) : (
                  cell.value
                )}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
