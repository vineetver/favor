"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Label } from "@shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@shared/components/ui/radio-group";
import { useCallback, useId, useMemo, useState } from "react";
import { formatNumber } from "../lib/format";
import type {
  SchemaPreviewColumn,
  TypedValidateResponse,
  VariantKeyAlternative,
} from "../types";

interface VariantKeyPickerProps {
  typedValidation: TypedValidateResponse;
  onConfirm: (choice: VariantKeyAlternative) => void;
  onBack: () => void;
  className?: string;
}

interface Describable {
  /** Stable identity for radio state. */
  id: string;
  /** Column names to render as the primary line. */
  columns: string[];
  /** One example row assembled from schema_preview. */
  example: string | null;
  /** Rows where every referenced column is populated (worst of the set). */
  coveredRows: number | null;
  /** Short mechanism description ("Database lookup", etc.). Empty string if none. */
  mechanism: string;
}

function identityOf(alt: VariantKeyAlternative): string {
  return `${alt.strategy}:${alt.columns.join("|")}`;
}

function mechanismFor(alt: VariantKeyAlternative): string {
  if (alt.strategy === "vcf_columns") return "Direct coordinates";
  // single_column — differentiate by key_type
  switch (alt.key_type) {
    case "VCF":
      // SPDI parses as VCF on the backend; label it accordingly.
      return "Direct coordinates (compact form)";
    case "RSID":
      return "Database lookup";
    case "VID":
      return "Internal variant ID";
    default:
      return "";
  }
}

function describe(
  alt: VariantKeyAlternative,
  schemaByName: Map<string, SchemaPreviewColumn>,
): Describable {
  const cols = alt.columns
    .map((name) => schemaByName.get(name))
    .filter((c): c is SchemaPreviewColumn => c !== undefined);

  const counts = cols.map((c) => c.non_null_count);
  const coveredRows =
    counts.length > 0 && counts.every((n) => n > 0)
      ? Math.min(...counts)
      : null;

  // Assemble one example row. Multi-column alternatives read like "1 · 100001 · A · T".
  // We try rows 0..2 in case the first one has a null.
  let example: string | null = null;
  const maxRow = Math.min(
    ...cols.map((c) => c.sample_values.length).filter((n) => n > 0),
    3,
  );
  for (let i = 0; i < maxRow; i++) {
    const parts = cols.map((c) => c.sample_values[i]).filter((v) => v);
    if (parts.length === cols.length && parts.length > 0) {
      example = parts.join(" · ");
      break;
    }
  }

  return {
    id: identityOf(alt),
    columns: alt.columns,
    example,
    coveredRows,
    mechanism: mechanismFor(alt),
  };
}

export function VariantKeyPicker({
  typedValidation,
  onConfirm,
  onBack,
  className,
}: VariantKeyPickerProps) {
  const groupId = useId();
  const alternatives = typedValidation.variant_key_alternatives;

  const schemaByName = useMemo(() => {
    const m = new Map<string, SchemaPreviewColumn>();
    for (const c of typedValidation.schema_preview) {
      m.set(c.original_name, c);
    }
    return m;
  }, [typedValidation.schema_preview]);

  const options = useMemo(
    () => alternatives.map((alt) => ({ alt, ...describe(alt, schemaByName) })),
    [alternatives, schemaByName],
  );

  const bestCoverage = useMemo(() => {
    const counts = options
      .map((o) => o.coveredRows)
      .filter((n): n is number => n !== null);
    return counts.length > 0 ? Math.max(...counts) : null;
  }, [options]);

  const [selectedId, setSelectedId] = useState<string>(
    () => options[0]?.id ?? "",
  );

  const handleConfirm = useCallback(() => {
    const picked = options.find((o) => o.id === selectedId);
    if (picked) onConfirm(picked.alt);
  }, [options, selectedId, onConfirm]);

  if (options.length === 0) return null;

  const rowTotal = typedValidation.row_count_estimate;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          Which column identifies each variant?
        </h2>
        <p className="text-sm text-muted-foreground">
          Favor found several columns that could work. Pick the one with the
          coverage and format that fit your data.
        </p>
      </div>

      <RadioGroup
        value={selectedId}
        onValueChange={setSelectedId}
        className="gap-2"
      >
        {options.map((opt) => {
          const inputId = `${groupId}-${opt.id}`;
          const isActive = selectedId === opt.id;
          const isBest =
            opt.coveredRows !== null &&
            bestCoverage !== null &&
            opt.coveredRows === bestCoverage;
          const coverageText =
            opt.coveredRows !== null
              ? `${formatNumber(opt.coveredRows)} of ${formatNumber(rowTotal)} rows`
              : null;

          return (
            <Label
              key={opt.id}
              htmlFor={inputId}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                isActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <RadioGroupItem id={inputId} value={opt.id} className="mt-1" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-sm text-foreground">
                  {opt.columns.map((col, i) => (
                    <span key={col} className="inline-flex items-baseline">
                      <span>{col}</span>
                      {i < opt.columns.length - 1 && (
                        <span
                          className="text-muted-foreground px-1.5"
                          aria-hidden="true"
                        >
                          ·
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {coverageText && (
                    <span
                      className={cn(
                        "tabular-nums",
                        isBest && "text-emerald-700 font-medium",
                      )}
                    >
                      {coverageText}
                    </span>
                  )}
                  {opt.mechanism && <span>{opt.mechanism}</span>}
                </div>
                {opt.example && (
                  <div className="text-xs text-muted-foreground">
                    e.g.{" "}
                    <span className="font-mono text-foreground">
                      {opt.example}
                    </span>
                  </div>
                )}
              </div>
            </Label>
          );
        })}
      </RadioGroup>

      <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={handleConfirm}>
          Continue
        </Button>
      </div>
    </div>
  );
}
