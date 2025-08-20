"use client";

import * as React from "react";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/general";

interface DataTableRangeFilterProps {
  column?: {
    getFilterValue: () => [number, number] | undefined;
    setFilterValue: (value: [number, number] | undefined) => void;
  };
  title?: string;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
}

export function DataTableRangeFilter({
  column,
  title,
  min,
  max,
  step = 0.001,
  formatValue = (v) => v.toString(),
}: DataTableRangeFilterProps) {
  const currentRange = column?.getFilterValue();
  const [localRange, setLocalRange] = useState<[number, number]>([min, max]);
  const [localInputs, setLocalInputs] = useState<[string, string]>([
    min.toString(),
    max.toString(),
  ]);

  React.useEffect(() => {
    if (currentRange) {
      setLocalRange(currentRange);
      setLocalInputs([
        formatInputValue(currentRange[0]),
        formatInputValue(currentRange[1]),
      ]);
    } else {
      setLocalRange([min, max]);
      setLocalInputs([formatInputValue(min), formatInputValue(max)]);
    }
  }, [currentRange, min, max]);

  const isFiltered =
    currentRange && (currentRange[0] !== min || currentRange[1] !== max);

  const parseInputValue = (input: string, fallback: number): number => {
    const value = parseFloat(input);
    return isNaN(value) ? fallback : value;
  };

  const formatInputValue = (value: number): string => {
    // For very small numbers, use scientific notation, otherwise use fixed decimals
    if (Math.abs(value) < 0.0001 && value !== 0) {
      return value.toExponential(3);
    }
    // For regular numbers, show up to 4 significant decimal places
    return parseFloat(value.toFixed(4)).toString();
  };

  const applyFilter = () => {
    const minVal = parseInputValue(localInputs[0], min);
    const maxVal = parseInputValue(localInputs[1], max);
    const finalRange: [number, number] = [
      Math.max(min, Math.min(minVal, maxVal)),
      Math.min(max, Math.max(minVal, maxVal)),
    ];

    if (finalRange[0] === min && finalRange[1] === max) {
      column?.setFilterValue(undefined);
    } else {
      setLocalRange(finalRange);
      column?.setFilterValue(finalRange);
    }
  };

  const clearFilter = () => {
    setLocalRange([min, max]);
    setLocalInputs([formatInputValue(min), formatInputValue(max)]);
    column?.setFilterValue(undefined);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <Plus className="mr-2 h-4 w-4" />
          {title}
          {isFiltered && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal"
              >
                {formatValue(currentRange[0])} - {formatValue(currentRange[1])}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-4" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">{title} Range</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Min</div>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={localInputs[0]}
                  onChange={(e) => {
                    setLocalInputs([e.target.value, localInputs[1]]);
                  }}
                  onBlur={() => {
                    const value = parseInputValue(localInputs[0], min);
                    const clampedValue = Math.max(min, Math.min(value, max));
                    setLocalInputs([
                      formatInputValue(clampedValue),
                      localInputs[1],
                    ]);
                  }}
                  placeholder={formatInputValue(min)}
                  className="h-8 font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Max</div>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={localInputs[1]}
                  onChange={(e) => {
                    setLocalInputs([localInputs[0], e.target.value]);
                  }}
                  onBlur={() => {
                    const value = parseInputValue(localInputs[1], max);
                    const clampedValue = Math.min(max, Math.max(value, min));
                    setLocalInputs([
                      localInputs[0],
                      formatInputValue(clampedValue),
                    ]);
                  }}
                  placeholder={formatInputValue(max)}
                  className="h-8 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilter}
              className="h-7 px-2"
            >
              Reset
            </Button>
            <Button size="sm" onClick={applyFilter} className="h-7 px-3">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
