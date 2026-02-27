"use client";

import { memo } from "react";
import { ArrowRight } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@shared/components/ui/tooltip";
import type { HoveredEdgeInfo } from "../types/node";
import { EDGE_TYPE_CONFIG, getEdgeDatabase } from "../types/edge";
import { EDGE_TOOLTIP_FIELDS, formatTooltipValue } from "../config/edge-tooltip-fields";

interface EdgeTooltipProps {
  info: HoveredEdgeInfo | null;
}

function EdgeTooltipInner({ info }: EdgeTooltipProps) {
  if (!info) return null;

  const { edge, sourceLabel, targetLabel, position } = info;
  const config = EDGE_TYPE_CONFIG[edge.type];
  const tooltipFields = EDGE_TOOLTIP_FIELDS[edge.type];

  // Gather displayable fields from edge.fields
  const fieldEntries: Array<{ label: string; value: string }> = [];

  if (tooltipFields && edge.fields) {
    for (const field of tooltipFields) {
      const val = edge.fields[field.key];
      if (val !== undefined && val !== null) {
        fieldEntries.push({
          label: field.label,
          value: formatTooltipValue(val, field.format),
        });
      }
      if (fieldEntries.length >= 3) break;
    }
  }

  // Auto-append database provenance as the final line (beyond the 3-field limit)
  const database = getEdgeDatabase(edge.type);
  if (!fieldEntries.some((f) => f.label === "Source")) {
    fieldEntries.push({ label: "Source", value: database });
  }
  if (fieldEntries.length < 3 && edge.numExperiments !== undefined && edge.numExperiments > 0) {
    if (!fieldEntries.some((f) => f.label === "Experiments")) {
      fieldEntries.push({ label: "Experiments", value: String(edge.numExperiments) });
    }
  }

  return (
    <Tooltip open>
      <TooltipTrigger asChild>
        <div
          className="fixed w-0 h-0 pointer-events-none"
          style={{ left: position.x, top: position.y }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={12} className="max-w-[280px]">
        {/* Edge type */}
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: config?.color ?? "#94a3b8" }}
          />
          <span className="font-semibold truncate">
            {config?.label ?? edge.type}
          </span>
        </div>

        {/* Direction */}
        <div className="flex items-center gap-1.5 text-background/70 mb-1">
          <span className="truncate max-w-[100px]">{sourceLabel}</span>
          <ArrowRight className="w-3 h-3 shrink-0" />
          <span className="truncate max-w-[100px]">{targetLabel}</span>
        </div>

        {/* Key fields */}
        {fieldEntries.length > 0 && (
          <div className="border-t border-background/20 pt-1.5 mt-1.5 space-y-0.5">
            {fieldEntries.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between gap-3">
                <span className="text-background/60">{entry.label}</span>
                <span className="font-medium text-white">{entry.value}</span>
              </div>
            ))}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export const EdgeTooltip = memo(EdgeTooltipInner);
