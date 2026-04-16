"use client";

import { cn } from "@infra/utils";
import { QuotaBar } from "@shared/components/quota-bar";
import { Button } from "@shared/components/ui/button";
import { useQuotas } from "@shared/hooks/use-quotas";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Columns3,
  FileSpreadsheet,
  HelpCircle,
  Key,
  Loader2,
  Settings2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  getStepDescription,
  useWizard,
  type VisualStep,
} from "../hooks/use-wizard";
import type { TypedValidateResponse } from "../types";
import { ColumnMappingEditor } from "./column-mapping-editor";
import { DataTypePicker } from "./data-type-picker";
import { JobConfiguration } from "./job-configuration";
import { UploadDropzone } from "./upload-dropzone";
import { ValidationSummary } from "./validation-summary";
import { VariantKeyPicker } from "./variant-key-picker";

// ============================================================================
// Types
// ============================================================================

interface BatchWizardProps {
  className?: string;
}

interface StepConfig {
  id: VisualStep;
  label: string;
  description: string;
  icon: typeof Upload;
}

const ALL_STEPS: readonly StepConfig[] = [
  {
    id: "upload",
    label: "Upload",
    description: "Select your file",
    icon: Upload,
  },
  {
    id: "validate",
    label: "Validate",
    description: "Check format + preview",
    icon: FileSpreadsheet,
  },
  {
    id: "data-type",
    label: "Data type",
    description: "Confirm data kind",
    icon: HelpCircle,
  },
  {
    id: "mapping",
    label: "Mapping",
    description: "Review column mapping",
    icon: Columns3,
  },
  {
    id: "variant-key",
    label: "Variant key",
    description: "Pick key column(s)",
    icon: Key,
  },
  {
    id: "configure",
    label: "Configure",
    description: "Output + notifications",
    icon: Settings2,
  },
  {
    id: "complete",
    label: "Process",
    description: "Start annotation",
    icon: CheckCircle2,
  },
];

// ============================================================================
// Step Indicator
// ============================================================================

/**
 * The mapping / data-type / variant-key steps are optional — they only appear
 * when the validation response asks for them. Compute the visible step list
 * once validation is in so the stepper reflects the actual path.
 */
function visibleSteps(
  showDataType: boolean,
  showMapping: boolean,
  showVariantKey: boolean,
): StepConfig[] {
  return ALL_STEPS.filter((s) => {
    if (s.id === "data-type") return showDataType;
    if (s.id === "mapping") return showMapping;
    if (s.id === "variant-key") return showVariantKey;
    return true;
  });
}

function StepIndicator({
  currentStep,
  steps,
  className,
}: {
  currentStep: VisualStep;
  steps: StepConfig[];
  className?: string;
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.id}
            className="flex items-center flex-1 last:flex-none"
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all text-sm font-medium",
                  isCompleted && "bg-primary text-white",
                  isCurrent && "bg-primary text-white",
                  !isCompleted &&
                    !isCurrent &&
                    "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="hidden sm:block">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>

            {!isLast && (
              <div className="flex-1 mx-3 h-px bg-border">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    isCompleted ? "bg-primary" : "bg-transparent",
                  )}
                  style={{ width: isCompleted ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Derived helpers
// ============================================================================

function getValidation(
  state: ReturnType<typeof useWizard>["state"],
): TypedValidateResponse | null {
  switch (state.step) {
    case "data-type":
    case "mapping":
    case "variant-key":
    case "configuring":
    case "creating":
      return state.validation;
    default:
      return null;
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function BatchWizard({ className }: BatchWizardProps) {
  const { quotas } = useQuotas();
  const {
    state,
    selectFile,
    confirmDataType,
    confirmMapping,
    confirmVariantKey,
    goBackToDataType,
    goBackToMapping,
    goBackToVariantKey,
    submit,
    reset,
    isTyped,
    visualStep,
  } = useWizard();

  const stepDescription = getStepDescription(visualStep);
  const validation = getValidation(state);

  // Once validation has landed, the optional steps are fixed for the rest of
  // this upload. Use the validation flags so the indicator shows a stable
  // path across data-type → mapping → variant-key → configure.
  const steps = useMemo(() => {
    if (!validation) {
      // Pre-validation: hide all optional steps; the indicator shows the
      // minimum path (upload / validate / configure / complete).
      return visibleSteps(false, false, false);
    }
    const showDataType = validation.requires_confirmation;
    const showMapping = isTyped && validation.suggested_column_map.length > 0;
    const showVariantKey = validation.variant_key_requires_confirmation;
    return visibleSteps(showDataType, showMapping, showVariantKey);
  }, [validation, isTyped]);

  return (
    <div
      className={cn(
        "bg-background rounded-xl border border-border overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        {/* Title Row */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Batch Annotation
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {stepDescription}
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/batch-annotation/jobs">
              View Jobs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-muted/80 border-t border-border">
          <StepIndicator currentStep={visualStep} steps={steps} />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* ================================================================ */}
          {/* Upload / Uploading / Validating */}
          {/* ================================================================ */}
          {(state.step === "idle" ||
            state.step === "uploading" ||
            state.step === "validating") && (
            <div className="space-y-4">
              <UploadDropzone
                onFileSelect={selectFile}
                uploadProgress={state.step === "uploading" ? state.progress : 0}
                isUploading={state.step === "uploading"}
                isValidating={state.step === "validating"}
                error={state.step === "idle" ? state.error : undefined}
                selectedFile={state.step === "idle" ? undefined : state.file}
                onClear={reset}
              />
              {quotas.length > 0 && state.step === "idle" && (
                <QuotaBar
                  quotas={quotas}
                  filter={[
                    "large_uploads_today",
                    "small_uploads_today",
                    "concurrent_cohorts",
                  ]}
                  layout="row"
                  className="justify-center"
                />
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* Data-type picker (requires_confirmation) */}
          {/* ================================================================ */}
          {state.step === "data-type" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Button variant="ghost" size="sm" onClick={reset}>
                <ArrowLeft className="w-4 h-4" />
                Upload different file
              </Button>

              <DataTypePicker
                typedValidation={state.validation}
                onConfirm={confirmDataType}
                onBack={reset}
              />
            </div>
          )}

          {/* ================================================================ */}
          {/* Column Mapping (typed cohorts) */}
          {/* ================================================================ */}
          {state.step === "mapping" && (
            <div className="space-y-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={
                  state.validation.requires_confirmation
                    ? goBackToDataType
                    : reset
                }
              >
                <ArrowLeft className="w-4 h-4" />
                {state.validation.requires_confirmation
                  ? "Back to data type"
                  : "Upload different file"}
              </Button>

              <ValidationSummary
                typedValidation={state.validation}
                filename={state.file.name}
              />

              <div className="border-t border-border" />

              <ColumnMappingEditor
                typedValidation={state.validation}
                onConfirm={confirmMapping}
                onBack={reset}
              />
            </div>
          )}

          {/* ================================================================ */}
          {/* Variant-key picker (variant_key_requires_confirmation) */}
          {/* ================================================================ */}
          {state.step === "variant-key" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={
                  state.columnMap
                    ? goBackToMapping
                    : state.validation.requires_confirmation
                      ? goBackToDataType
                      : reset
                }
              >
                <ArrowLeft className="w-4 h-4" />
                {state.columnMap
                  ? "Back to mapping"
                  : state.validation.requires_confirmation
                    ? "Back to data type"
                    : "Upload different file"}
              </Button>

              <VariantKeyPicker
                typedValidation={state.validation}
                onConfirm={confirmVariantKey}
                onBack={reset}
              />
            </div>
          )}

          {/* ================================================================ */}
          {/* Configure */}
          {/* ================================================================ */}
          {state.step === "configuring" && (
            <div className="max-w-2xl mx-auto space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={
                  state.validation.variant_key_requires_confirmation
                    ? goBackToVariantKey
                    : state.columnMap
                      ? goBackToMapping
                      : state.validation.requires_confirmation
                        ? goBackToDataType
                        : reset
                }
              >
                <ArrowLeft className="w-4 h-4" />
                {state.validation.variant_key_requires_confirmation
                  ? "Back to variant key"
                  : state.columnMap
                    ? "Back to mapping"
                    : state.validation.requires_confirmation
                      ? "Back to data type"
                      : "Upload different file"}
              </Button>

              <JobConfiguration
                typedValidation={state.validation}
                isTypedCohort={isTyped}
                filename={state.file.name}
                onSubmit={submit}
                isSubmitting={false}
                error={state.error}
              />
            </div>
          )}

          {/* ================================================================ */}
          {/* Creating (submitting to backend) */}
          {/* ================================================================ */}
          {state.step === "creating" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">
                Starting batch job...
              </p>
              <p className="text-sm text-muted-foreground">
                You&apos;ll be redirected to track progress
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
