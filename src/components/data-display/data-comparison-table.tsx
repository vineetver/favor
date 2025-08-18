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
import { HelpTooltip } from "@/components/ui/help-tooltip";

export type ColumnType = "value" | "activity" | "percentile" | "proportion" | "biologicalContext";

interface ColumnConfig {
  type: ColumnType;
  header?: string;
  tooltip?: string;
}

interface DataComparisonTableProps {
  items: FilteredItem[];
  // Legacy 3-column support
  leftColumn?: ColumnType;
  rightColumn?: ColumnType;
  leftColumnHeader?: string;
  rightColumnHeader?: string;
  leftColumnTooltip?: string;
  rightColumnTooltip?: string;
  // New flexible column support
  columns?: ColumnConfig[];
}

export function DataComparisonTable({
  items,
  leftColumn = "value",
  rightColumn = "activity",
  leftColumnHeader,
  rightColumnHeader,
  leftColumnTooltip,
  rightColumnTooltip,
  columns,
}: DataComparisonTableProps) {
  if (!items || items.length === 0) {
    return <NoDataState categoryName="Annotation Data" />;
  }

  // Use flexible columns if provided, otherwise fall back to legacy 3-column layout
  const columnConfigs: ColumnConfig[] = columns || [
    { type: leftColumn, header: leftColumnHeader, tooltip: leftColumnTooltip },
    { type: rightColumn, header: rightColumnHeader, tooltip: rightColumnTooltip }
  ];

  const getColumnValue = (item: FilteredItem, columnType: ColumnType) => {
    switch (columnType) {
      case "value":
        // Handle JSX elements or raw values
        if (typeof item.value === "object" &&
          item.value &&
          "props" in item.value
        ) {
          return item.value; // Return the JSX element as-is
        }
        return typeof item.value === "string" ||
          typeof item.value === "number" ? (
          <span className="break-all whitespace-pre-wrap word-wrap-anywhere">
            {item.value}
          </span>
        ) : (
          item.value
        );
      case "activity":
        return (
          item.activity || <span className="text-muted-foreground">N/A</span>
        );
      case "percentile":
        return <span className="font-mono">{item.percentile}%</span>;
      case "proportion":
        return <span className="font-mono">{item.proportion}</span>;
      case "biologicalContext":
        return (
          <span className="text-muted-foreground">
            {item.biologicalContext || "Variant classification"}
          </span>
        );
      default:
        return <span className="text-muted-foreground">N/A</span>;
    }
  };

  const getColumnHeader = (columnType: ColumnType, customHeader?: string) => {
    if (customHeader) return customHeader;
    switch (columnType) {
      case "value":
        return "Value";
      case "activity":
        return "Activity";
      case "percentile":
        return "Percentile";
      case "proportion":
        return "Proportion";
      case "biologicalContext":
        return "Biological Context";
      default:
        return "Data";
    }
  };

  const renderColumnHeader = (
    columnType: ColumnType,
    customHeader?: string,
    tooltip?: string,
  ) => {
    const headerText = getColumnHeader(columnType, customHeader);
    if (!tooltip) {
      return (
        <div className="font-semibold text-foreground text-left md:text-center">
          {headerText}
        </div>
      );
    }
    return (
      <div className="font-semibold text-foreground text-left md:text-center flex items-start md:items-center md:justify-center gap-2">
        {headerText}
        <HelpTooltip content={tooltip} />
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card shadow-md overflow-hidden text-sm">
      {/* Desktop Header Row - Hidden on mobile */}
      <div className="hidden md:block bg-muted/30 px-4 py-3 sm:px-6 border-b border-border/40">
        <div 
          className="grid gap-4 lg:gap-6 items-center"
          style={{
            gridTemplateColumns: `minmax(200px, 1fr) repeat(${columnConfigs.length}, minmax(120px, 1fr))`
          }}
        >
          <div className="font-semibold text-foreground text-left">
            Annotation
          </div>
          {columnConfigs.map((config, index) => (
            <div key={index}>
              {renderColumnHeader(config.type, config.header, config.tooltip)}
            </div>
          ))}
        </div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-border/40">
        {items.map((item, index) => {
          if (item.value === undefined || item.value === null) return null;

          return (
            <div
              key={`${item.key}-${index}`}
              className="px-4 py-4 sm:px-6 border-b border-border/40 last:border-b-0"
            >
              {/* Mobile Layout - Card Style */}
              <div className="block md:hidden space-y-4">
                {/* Annotation Header */}
                <div className="flex items-start gap-1 pb-3 border-b border-border/20">
                  <div className="font-medium text-foreground leading-6 break-words">
                    {item.header}:
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-5 w-5 cursor-pointer fill-foreground text-background hover:text-background/90 transition-colors flex-shrink-0 mt-0.5" />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-md">
                        <div>{item.tooltip}</div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Data Columns - Stacked */}
                <div className="space-y-3">
                  {columnConfigs.map((config, colIndex) => (
                    <div key={colIndex} className="flex flex-col space-y-1">
                      <div className="font-medium text-muted-foreground">
                        {renderColumnHeader(config.type, config.header, config.tooltip)}
                      </div>
                      <div className="text-foreground break-all">
                        {getColumnValue(item, config.type)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Layout - Grid */}
              <div className="hidden md:block">
                <div 
                  className="grid gap-4 lg:gap-6 items-start"
                  style={{
                    gridTemplateColumns: `minmax(200px, 1fr) repeat(${columnConfigs.length}, minmax(120px, 1fr))`
                  }}
                >
                  {/* Annotation Column */}
                  <div className="flex items-start gap-1">
                    <div className="font-medium text-foreground leading-6 break-words">
                      {item.header}:
                    </div>
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

                  {/* Data Columns */}
                  {columnConfigs.map((config, colIndex) => (
                    <div key={colIndex} className="flex items-start justify-center text-center min-w-0">
                      <div className="text-muted-foreground break-all">
                        {getColumnValue(item, config.type)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
