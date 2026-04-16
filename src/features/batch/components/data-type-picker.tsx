"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Label } from "@shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@shared/components/ui/radio-group";
import { useCallback, useId, useMemo, useState } from "react";
import { getDataTypeLabel } from "../lib/format";
import {
  SELECTABLE_DATA_TYPES,
  type SelectableDataType,
  type TypedValidateResponse,
} from "../types";

interface DataTypePickerProps {
  typedValidation: TypedValidateResponse;
  onConfirm: (dataType: SelectableDataType) => void;
  onBack: () => void;
  className?: string;
}

/**
 * One-line hint describing the typical shape of each data type, to help a user
 * recognize their own file. Kept short on purpose — the picker's job is to let
 * the user decide quickly, not to teach statistical genetics.
 */
const DATA_TYPE_HINTS: Record<SelectableDataType, string> = {
  variant_list: "A list of variant identifiers with no statistical columns.",
  gwas_sumstats:
    "Per-variant association results — effect size, p-value, standard error.",
  credible_set: "Fine-mapped variants with posterior inclusion probabilities.",
  fine_mapping: "Fine-mapping output grouping variants by causal evidence.",
};

function resolveInitialChoice(
  validation: TypedValidateResponse,
): SelectableDataType {
  const suggested = validation.data_type;
  if (
    suggested !== "unknown" &&
    (SELECTABLE_DATA_TYPES as readonly string[]).includes(suggested)
  ) {
    return suggested as SelectableDataType;
  }
  return SELECTABLE_DATA_TYPES[0];
}

export function DataTypePicker({
  typedValidation,
  onConfirm,
  onBack,
  className,
}: DataTypePickerProps) {
  const groupId = useId();
  const [choice, setChoice] = useState<SelectableDataType>(() =>
    resolveInitialChoice(typedValidation),
  );

  const options = useMemo(
    () =>
      SELECTABLE_DATA_TYPES.map((dt) => ({
        value: dt,
        label: getDataTypeLabel(dt),
        hint: DATA_TYPE_HINTS[dt],
      })),
    [],
  );

  const handleConfirm = useCallback(() => {
    onConfirm(choice);
  }, [choice, onConfirm]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          What kind of data is this?
        </h2>
        <p className="text-sm text-muted-foreground">
          Favor couldn&apos;t tell from the file alone. Pick the category that
          matches your upload.
        </p>
      </div>

      <RadioGroup
        value={choice}
        onValueChange={(value) => setChoice(value as SelectableDataType)}
        className="gap-2"
      >
        {options.map((opt) => {
          const inputId = `${groupId}-${opt.value}`;
          const isActive = choice === opt.value;
          return (
            <Label
              key={opt.value}
              htmlFor={inputId}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                isActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <RadioGroupItem id={inputId} value={opt.value} className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {opt.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {opt.hint}
                </div>
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
