"use client";

import { cn } from "@infra/utils";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import {
  formatNumber,
  getDataTypeLabel,
  getVariantKeyStrategyLabel,
} from "../lib/format";
import type { TypedValidateResponse } from "../types";
import { StatCard } from "./stat-card";

interface ValidationSummaryProps {
  typedValidation: TypedValidateResponse;
  filename?: string;
  className?: string;
}

// ============================================================================
// Status Header - Compact with action-focused messaging
// ============================================================================

function StatusHeader({
  ok,
  needsAttention,
  filename,
}: {
  ok: boolean;
  needsAttention: boolean;
  filename?: string;
}) {
  if (!ok) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-full shrink-0 bg-rose-100">
          <XCircle className="w-4 h-4 text-rose-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-rose-800">Validation Failed</h3>
          <p className="text-sm text-rose-600 mt-0.5">
            Please fix the errors below and try again
          </p>
        </div>
      </div>
    );
  }

  if (needsAttention) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-full shrink-0 bg-amber-100">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-800">Ready with warnings</h3>
          <p className="text-sm text-amber-600 mt-0.5">
            {filename && <span className="font-medium">{filename}</span>}
            {filename && " — "}Review the warnings below before continuing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
      <div className="flex h-8 w-8 items-center justify-center rounded-full shrink-0 bg-emerald-100">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-emerald-800">File validated</h3>
        <p className="text-sm text-emerald-600 mt-0.5">
          {filename && <span className="font-medium">{filename}</span>}
          {filename && " — "}Ready to configure processing options
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ValidationSummary({
  typedValidation,
  filename,
  className,
}: ValidationSummaryProps) {
  const hasErrors = typedValidation.errors.length > 0;
  const hasWarnings = typedValidation.warnings.length > 0;
  const isLowConfidence = typedValidation.confidence < 0.7;
  const needsAttention = hasWarnings || isLowConfidence;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Status Header */}
      <StatusHeader ok={typedValidation.ok} needsAttention={needsAttention} filename={filename} />

      {/* Errors */}
      {!typedValidation.ok && hasErrors && (
        <div className="space-y-2">
          {typedValidation.errors.map((error, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200"
            >
              <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <span className="text-sm text-rose-700">{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Success content */}
      {typedValidation.ok && (
        <>
          {/* Data type + variant key badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-xs font-medium text-primary">
              <Zap className="w-3 h-3" />
              {getDataTypeLabel(typedValidation.data_type)}
            </span>
            {typedValidation.variant_key_strategy !== "none" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-foreground">
                {getVariantKeyStrategyLabel(typedValidation.variant_key_strategy)}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              value={`~${formatNumber(typedValidation.row_count_estimate)}`}
              label="Rows"
            />
            <StatCard
              value={String(typedValidation.schema_preview.length)}
              label="Columns"
            />
            <StatCard
              value={`${Math.round(typedValidation.confidence * 100)}%`}
              label="Confidence"
              variant={typedValidation.confidence >= 0.9 ? "positive" : typedValidation.confidence >= 0.7 ? "warning" : "negative"}
            />
          </div>

          {/* Schema preview table */}
          {typedValidation.schema_preview.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">Schema preview</span>
              </div>
              <div className="p-3 bg-background max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1 pr-3 font-medium text-muted-foreground">Column</th>
                      <th className="text-left py-1 pr-3 font-medium text-muted-foreground">Kind</th>
                      <th className="text-left py-1 font-medium text-muted-foreground">Samples</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typedValidation.schema_preview.slice(0, 10).map((col) => (
                      <tr key={col.original_name} className="hover:bg-muted">
                        <td className="py-1 pr-3 font-mono text-foreground">{col.original_name}</td>
                        <td className="py-1 pr-3">
                          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground">
                            {col.kind}
                          </span>
                        </td>
                        <td className="py-1 font-mono text-muted-foreground truncate max-w-[200px]">
                          {col.sample_values.slice(0, 3).join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {typedValidation.schema_preview.length > 10 && (
                  <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                    + {typedValidation.schema_preview.length - 10} more columns
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {(hasWarnings || isLowConfidence) && (
            <div className="space-y-2">
              {isLowConfidence && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-700">
                    <span className="font-medium">Low confidence ({Math.round(typedValidation.confidence * 100)}%):</span>{" "}
                    Auto-detection is uncertain. Please review the column mapping.
                  </div>
                </div>
              )}
              {typedValidation.warnings.map((warning, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-amber-700">{warning}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
