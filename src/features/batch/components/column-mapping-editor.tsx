"use client";

import { cn } from "@infra/utils";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Columns3,
  Key,
  RotateCcw,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  formatNumber,
  getDataTypeDescription,
  getDataTypeLabel,
  getVariantKeyStrategyLabel,
} from "../lib/format";
import type { ColumnMapping, TypedValidateResponse } from "../types";

// ============================================================================
// Types
// ============================================================================

interface ColumnMappingEditorProps {
  typedValidation: TypedValidateResponse;
  onConfirm: (columnMap: ColumnMapping[]) => void;
  onBack: () => void;
  className?: string;
}

// ============================================================================
// Source Badge
// ============================================================================

function SourceBadge({ source }: { source: string }) {
  const config: Record<string, { label: string; className: string }> = {
    exact: { label: "Exact", className: "bg-emerald-100 text-emerald-700" },
    alias: { label: "Alias", className: "bg-blue-100 text-blue-700" },
    custom: { label: "Custom", className: "bg-amber-100 text-amber-700" },
  };
  const entry = config[source] ?? {
    label: source,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium",
        entry.className,
      )}
    >
      {entry.label}
    </span>
  );
}

// ============================================================================
// Kind Badge
// ============================================================================

function KindBadge({ kind }: { kind: string }) {
  const config: Record<string, string> = {
    numeric: "bg-indigo-100 text-indigo-700",
    categorical: "bg-violet-100 text-violet-700",
    identity: "bg-emerald-100 text-emerald-700",
    array: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={cn(
        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium",
        config[kind] || "bg-muted text-muted-foreground",
      )}
    >
      {kind}
    </span>
  );
}

// ============================================================================
// Confidence Indicator
// ============================================================================

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const variant =
    pct >= 90
      ? "text-emerald-600"
      : pct >= 70
        ? "text-amber-600"
        : "text-rose-600";

  return (
    <span className={cn("text-xs font-medium", variant)}>
      {pct}% confidence
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ColumnMappingEditor({
  typedValidation,
  onConfirm,
  onBack,
  className,
}: ColumnMappingEditorProps) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Build the list of all possible canonical names from the schema preview
  const canonicalOptions = useMemo(() => {
    const names = new Set<string>();
    for (const col of typedValidation.schema_preview) {
      if (col.canonical_name) names.add(col.canonical_name);
    }
    for (const mapping of typedValidation.suggested_column_map) {
      if (mapping.canonical) names.add(mapping.canonical);
    }
    return Array.from(names).sort();
  }, [typedValidation]);

  // Compute the final column map with overrides applied
  const finalColumnMap = useMemo((): ColumnMapping[] => {
    return typedValidation.suggested_column_map.map((m) => {
      const override = overrides[m.original];
      if (override && override !== m.canonical) {
        return { ...m, canonical: override, source: "custom" as const };
      }
      return m;
    });
  }, [typedValidation.suggested_column_map, overrides]);

  const hasOverrides = Object.keys(overrides).length > 0;

  const handleOverride = useCallback(
    (original: string, canonical: string) => {
      setOverrides((prev) => {
        const next = { ...prev };
        // Find the original suggestion
        const suggestion = typedValidation.suggested_column_map.find(
          (m) => m.original === original,
        );
        if (suggestion && canonical === suggestion.canonical) {
          // Remove override if reverting to original
          delete next[original];
        } else {
          next[original] = canonical;
        }
        return next;
      });
    },
    [typedValidation.suggested_column_map],
  );

  const handleReset = useCallback(() => {
    setOverrides({});
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(finalColumnMap);
  }, [finalColumnMap, onConfirm]);

  // Look up sample values from schema preview
  const sampleValuesByOriginal = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const col of typedValidation.schema_preview) {
      map.set(col.original_name, col.sample_values);
    }
    return map;
  }, [typedValidation.schema_preview]);

  return (
    <div className={cn("space-y-5", className)}>
      {/* Header: Data type + confidence */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {getDataTypeLabel(typedValidation.data_type)}
            </Badge>
            <ConfidenceIndicator confidence={typedValidation.confidence} />
          </div>
          <p className="text-sm text-muted-foreground">
            {getDataTypeDescription(typedValidation.data_type)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Columns3 className="w-3.5 h-3.5" />
          {typedValidation.schema_preview.length} columns
        </div>
      </div>

      {/* Column mapping table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-3 py-2 bg-muted border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Column mapping
          </span>
          {hasOverrides && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-[30%]">Original</TableHead>
              <TableHead className="text-xs w-[4%]" />
              <TableHead className="text-xs w-[30%]">Maps to</TableHead>
              <TableHead className="text-xs w-[12%]">Kind</TableHead>
              <TableHead className="text-xs w-[12%]">Source</TableHead>
              <TableHead className="text-xs">Samples</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {finalColumnMap.map((mapping) => {
              const isOverridden = overrides[mapping.original] !== undefined;
              const samples =
                sampleValuesByOriginal.get(mapping.original) ?? [];

              return (
                <TableRow
                  key={mapping.original}
                  className={cn(isOverridden && "bg-amber-50/50")}
                >
                  <TableCell className="font-mono text-xs text-foreground">
                    {mapping.original}
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.canonical}
                      onValueChange={(val) =>
                        handleOverride(mapping.original, val)
                      }
                    >
                      <SelectTrigger className="h-7 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {canonicalOptions.map((name) => (
                          <SelectItem
                            key={name}
                            value={name}
                            className="text-xs font-mono"
                          >
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <KindBadge kind={mapping.kind} />
                  </TableCell>
                  <TableCell>
                    <SourceBadge source={mapping.source} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[160px]">
                    {samples.slice(0, 2).join(", ") || "\u2014"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Footer: variant key strategy + warnings */}
      <div className="space-y-3">
        {/* Variant key strategy */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Key className="w-3.5 h-3.5" />
          Variant key:{" "}
          {getVariantKeyStrategyLabel(typedValidation.variant_key_strategy)}
          {typedValidation.variant_key_columns.length > 0 && (
            <span className="font-mono">
              ({typedValidation.variant_key_columns.join(", ")})
            </span>
          )}
        </div>

        {/* Row count */}
        <div className="text-xs text-muted-foreground">
          ~{formatNumber(typedValidation.row_count_estimate)} rows detected
        </div>

        {/* Warnings */}
        {typedValidation.warnings.length > 0 && (
          <div className="space-y-2">
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

        {/* Errors */}
        {typedValidation.errors.length > 0 && (
          <div className="space-y-2">
            {typedValidation.errors.map((error, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200"
              >
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <span className="text-sm text-rose-700">{error}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={typedValidation.errors.length > 0}
        >
          <CheckCircle2 className="w-4 h-4" />
          Confirm Mapping
        </Button>
      </div>
    </div>
  );
}
