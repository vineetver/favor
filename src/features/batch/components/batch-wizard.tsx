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
import { ColumnMappingEditor } from "./column-mapping-editor";
import { JobConfiguration } from "./job-configuration";
import { UploadDropzone } from "./upload-dropzone";
import { ValidationSummary } from "./validation-summary";

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

const BASE_STEPS: StepConfig[] = [
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
    id: "mapping",
    label: "Mapping",
    description: "Review column mapping",
    icon: Columns3,
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

function StepIndicator({
  currentStep,
  showMapping,
  className,
}: {
  currentStep: VisualStep;
  showMapping: boolean;
  className?: string;
}) {
  const steps = useMemo(
    () =>
      showMapping ? BASE_STEPS : BASE_STEPS.filter((s) => s.id !== "mapping"),
    [showMapping],
  );
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
// Main Component
// ============================================================================

export function BatchWizard({ className }: BatchWizardProps) {
  const { quotas } = useQuotas();
  const {
    state,
    selectFile,
    confirmMapping,
    goBackToMapping,
    submit,
    reset,
    isTyped,
    visualStep,
  } = useWizard();

  const stepDescription = getStepDescription(visualStep);

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
          <StepIndicator currentStep={visualStep} showMapping={isTyped} />
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
          {/* Column Mapping (typed cohorts only) */}
          {/* ================================================================ */}
          {state.step === "mapping" && (
            <div className="space-y-6">
              <Button variant="ghost" size="sm" onClick={reset}>
                <ArrowLeft className="w-4 h-4" />
                Upload different file
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
          {/* Configure */}
          {/* ================================================================ */}
          {state.step === "configuring" && (
            <div className="max-w-2xl mx-auto space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={isTyped ? goBackToMapping : reset}
              >
                <ArrowLeft className="w-4 h-4" />
                {isTyped ? "Back to mapping" : "Upload different file"}
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
