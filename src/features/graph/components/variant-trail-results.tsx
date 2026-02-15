"use client";

import { Button } from "@shared/components/ui/button";
import { ArrowLeft, Dna, Microscope } from "lucide-react";
import type { VariantTrailResultData } from "../types/props";
import type { ExplorerNode } from "../types/node";
import { NODE_TYPE_COLORS } from "../config/styling";
import { EDGE_TYPE_CONFIG } from "../types/edge";

// =============================================================================
// Evidence Summary — show top 2-3 fields from connecting edge
// =============================================================================

/** Fields worth showing as quick evidence summary */
const EVIDENCE_PRIORITY_FIELDS = [
  "p_value_mlog", "clinical_significance", "pathogenicity", "max_l2g_score",
  "evidence_level", "score", "significance", "or_beta", "risk_allele",
  "review_status", "frequency", "max_pathogenicity",
];

function EvidenceSummary({ fields }: { fields?: Record<string, unknown> }) {
  if (!fields) return null;

  const entries: Array<{ key: string; value: unknown }> = [];
  // Prioritised fields first
  for (const key of EVIDENCE_PRIORITY_FIELDS) {
    if (key in fields && fields[key] != null && fields[key] !== "") {
      entries.push({ key, value: fields[key] });
      if (entries.length >= 3) break;
    }
  }
  // Fill remaining slots with any other numeric fields
  if (entries.length < 3) {
    for (const [key, value] of Object.entries(fields)) {
      if (entries.length >= 3) break;
      if (entries.some((e) => e.key === key)) continue;
      if (typeof value === "number") {
        entries.push({ key, value });
      }
    }
  }

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {entries.map(({ key, value }) => {
        const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const display = typeof value === "number"
          ? (Number.isInteger(value) ? value.toLocaleString() : value.toFixed(3))
          : String(value);
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted text-xs rounded"
          >
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-medium text-foreground tabular-nums">{display}</span>
          </span>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface VariantTrailResultsProps {
  result: VariantTrailResultData;
  onBack: () => void;
  onSelectNode: (node: ExplorerNode) => void;
}

export function VariantTrailResults({ result, onBack, onSelectNode }: VariantTrailResultsProps) {
  const seedColors = NODE_TYPE_COLORS[result.seedNodeType] ?? {
    background: "#e2e8f0",
    border: "#94a3b8",
    text: "#334155",
  };
  const displayVariants = result.variants.slice(0, 50);

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        Back to details
      </Button>

      {/* Trail header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Microscope className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Variant Trail</h3>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: seedColors.border }}
          />
          <span className="text-sm font-medium text-foreground truncate">
            {result.seedNodeLabel}
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-xs"
            style={{ backgroundColor: seedColors.background, color: seedColors.text }}
          >
            {result.seedNodeType}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {result.totalFound === 0
            ? "No variants found via this route."
            : `Found ${result.totalFound} variant${result.totalFound === 1 ? "" : "s"}${result.totalFound > 50 ? " (showing top 50)" : ""}`}
        </p>
      </div>

      {/* Variant list */}
      {displayVariants.length > 0 && (
        <div className="space-y-1.5">
          {displayVariants.map(({ node, connectingEdge, routeBadge }) => {
            const edgeConfig = EDGE_TYPE_CONFIG[connectingEdge.type];
            return (
              <button
                key={node.id}
                className="w-full flex flex-col gap-1 p-2.5 rounded-lg border border-border bg-background text-left hover:bg-muted transition-colors"
                onClick={() => onSelectNode(node)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Dna className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate flex-1">
                    {node.label}
                  </span>
                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded shrink-0">
                    {routeBadge}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pl-5.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: edgeConfig?.color ?? "#94a3b8" }}
                  />
                  <span className="text-xs text-muted-foreground truncate">
                    {edgeConfig?.label ?? connectingEdge.type}
                  </span>
                </div>
                <div className="pl-5.5">
                  <EvidenceSummary fields={connectingEdge.fields} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
