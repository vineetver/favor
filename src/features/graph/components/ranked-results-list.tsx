"use client";

import { memo } from "react";
import { List } from "lucide-react";
import type { TemplateResultData } from "../types/template-results";
import type { ExplorerNode } from "../types/node";
import { NODE_TYPE_COLORS } from "../config/styling";
import { displayEntityType } from "../utils/display-names";

// =============================================================================
// Ranked Results List — shows template query results as a ranked list
// =============================================================================

interface RankedResultsListProps {
  results: TemplateResultData;
  onSelectNode: (node: ExplorerNode) => void;
  selectedNodeId?: string;
  className?: string;
}

function RankedResultsListInner({
  results,
  onSelectNode,
  selectedNodeId,
  className,
}: RankedResultsListProps) {
  if (results.results.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          No ranked results for this template.
        </div>
      </div>
    );
  }

  const showScore = results.rankLabel !== undefined;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {results.results.length} {displayEntityType(results.targetEntityType)}{results.results.length !== 1 ? "s" : ""}
          </span>
        </div>
        {showScore && (
          <span className="text-xs text-muted-foreground">
            Ranked by {results.rankLabel}
          </span>
        )}
      </div>

      {/* Results */}
      <div className="overflow-y-auto flex-1">
        {results.results.map((entry, index) => {
          const colors = NODE_TYPE_COLORS[entry.node.type];
          const isSelected = entry.node.id === selectedNodeId;

          return (
            <button
              key={entry.node.id}
              className={
                isSelected
                  ? "w-full flex items-center gap-3 px-4 py-2.5 text-left bg-primary/10 border-l-2 border-l-primary"
                  : "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors border-l-2 border-l-transparent"
              }
              onClick={() => onSelectNode(entry.node)}
            >
              {/* Rank */}
              <span className="text-xs text-muted-foreground tabular-nums w-6 text-right shrink-0">
                {index + 1}
              </span>

              {/* Color dot */}
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: colors?.border ?? "#94a3b8" }}
              />

              {/* Label + subtitle */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {entry.node.label}
                </div>
                {entry.node.subtitle && (
                  <div className="text-xs text-muted-foreground truncate">
                    {entry.node.subtitle}
                  </div>
                )}
              </div>

              {/* Score */}
              {showScore && entry.rankValue !== null && (
                <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                  {formatRankValue(entry.rankValue)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatRankValue(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString();
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(2);
  return value.toFixed(3);
}

export const RankedResultsList = memo(RankedResultsListInner);
