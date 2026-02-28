"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
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
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  BatchApiError,
  createCohort,
  presignUpload,
  uploadFileToS3,
  validateTypedCohort,
} from "../api";
import { DEFAULT_TENANT_ID } from "../config";
import type {
  ColumnMapping,
  TypedValidateResponse,
  UploadStep,
} from "../types";
import { ColumnMappingEditor } from "./column-mapping-editor";
import { UploadDropzone } from "./upload-dropzone";
import { ValidationSummary } from "./validation-summary";
import { JobConfiguration, type JobConfig } from "./job-configuration";

// ============================================================================
// Types
// ============================================================================

interface BatchWizardProps {
  className?: string;
}

type WizardStep = "upload" | "validate" | "mapping" | "configure" | "complete";

interface StepConfig {
  id: WizardStep;
  label: string;
  description: string;
  icon: typeof Upload;
}

// Steps are dynamic — "mapping" only shown for typed cohorts
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
// Step Indicator (Compact horizontal)
// ============================================================================

function getWizardStep(step: UploadStep): WizardStep {
  if (step === "select" || step === "uploading") return "upload";
  if (step === "validating") return "validate";
  if (step === "mapping") return "mapping";
  if (step === "configuring" || step === "creating") return "configure";
  return "complete";
}

function StepIndicator({
  currentStep,
  isTypedCohort,
  className,
}: {
  currentStep: UploadStep;
  isTypedCohort: boolean;
  className?: string;
}) {
  const steps = useMemo(
    () => (isTypedCohort ? BASE_STEPS : BASE_STEPS.filter((s) => s.id !== "mapping")),
    [isTypedCohort],
  );
  const wizardStep = getWizardStep(currentStep);
  const currentIndex = steps.findIndex((s) => s.id === wizardStep);

  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all text-sm font-medium",
                  isCompleted && "bg-primary text-white",
                  isCurrent && "bg-primary text-white",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground",
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
  const router = useRouter();
  const [step, setStep] = useState<UploadStep>("select");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [inputUri, setInputUri] = useState<string | null>(null);
  const [validation, setValidation] = useState<TypedValidateResponse | null>(null);
  const [confirmedColumnMap, setConfirmedColumnMap] = useState<ColumnMapping[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Only gwas_sumstats, credible_set, fine_mapping are typed cohorts.
  // "unknown" and "variant_list" go through the simple flow.
  const KNOWN_TYPED_DATA_TYPES = new Set(["gwas_sumstats", "credible_set", "fine_mapping"]);
  const isTypedCohort =
    validation !== null &&
    KNOWN_TYPED_DATA_TYPES.has(validation.data_type) &&
    validation.confidence >= 0.5;

  // Handle file selection and upload
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setValidation(null);
    setConfirmedColumnMap(null);
    setStep("uploading");
    setUploadProgress(0);

    try {
      const { upload_url, input_uri } = await presignUpload({
        tenant_id: DEFAULT_TENANT_ID,
        filename: selectedFile.name,
      });

      await uploadFileToS3(upload_url, selectedFile, setUploadProgress);
      setInputUri(input_uri);

      setStep("validating");

      // Backend always returns TypedValidateResponse shape
      const result = await validateTypedCohort({
        tenant_id: DEFAULT_TENANT_ID,
        input_uri: input_uri,
        dry_run_lookups: true,
      });

      setValidation(result);

      if (!result.ok) {
        setError(result.errors[0] || "File validation failed");
        setStep("select");
        return;
      }

      // Route based on detected data type
      const isTyped =
        KNOWN_TYPED_DATA_TYPES.has(result.data_type) &&
        result.confidence >= 0.5;

      if (isTyped && result.suggested_column_map?.length > 0) {
        setStep("mapping");
      } else {
        setStep("configuring");
      }
    } catch (err) {
      const message = err instanceof BatchApiError ? err.message : "An error occurred";
      setError(message);
      setStep("select");
    }
  }, []);

  // Handle clear/reset
  const handleClear = useCallback(() => {
    setFile(null);
    setInputUri(null);
    setValidation(null);
    setConfirmedColumnMap(null);
    setError(null);
    setUploadProgress(0);
    setStep("select");
  }, []);

  // Handle going back to upload
  const handleBackToUpload = useCallback(() => {
    handleClear();
  }, [handleClear]);

  // Handle back from mapping to validation summary
  const handleBackFromMapping = useCallback(() => {
    handleClear();
  }, [handleClear]);

  // Handle column mapping confirmation
  const handleMappingConfirm = useCallback((columnMap: ColumnMapping[]) => {
    setConfirmedColumnMap(columnMap);
    setStep("configuring");
  }, []);

  // Handle job submission
  const handleSubmit = useCallback(
    async (config: JobConfig) => {
      if (!inputUri || !file || !validation) return;

      setIsCreating(true);
      setError(null);

      try {
        const request: Parameters<typeof createCohort>[1] = {
          source: "upload",
          input_uri: inputUri,
          label: file.name,
          metadata: { cohort_label: file.name },
        };

        if (isTypedCohort) {
          // Typed cohort — pass data_type and column_map
          request.data_type = validation.data_type;
          request.column_map = confirmedColumnMap ?? validation.suggested_column_map;
        } else {
          // Standard variant list / unknown
          request.include_not_found = config.includeNotFound;
        }

        const { id } = await createCohort(DEFAULT_TENANT_ID, request);
        router.push(`/batch-annotation/jobs/${id}`);
      } catch (err) {
        const message = err instanceof BatchApiError ? err.message : "Failed to create job";
        setError(message);
        setIsCreating(false);
      }
    },
    [inputUri, validation, confirmedColumnMap, isTypedCohort, file, router],
  );

  const isUploading = step === "uploading";
  const isValidating = step === "validating";
  const wizardStep = getWizardStep(step);

  const stepDescription = useMemo(() => {
    if (wizardStep === "upload") return "Variant lists, GWAS summary stats, credible sets, and fine mapping";
    if (wizardStep === "validate") return "Checking file format and previewing data";
    if (wizardStep === "mapping") return "Review and confirm column mapping";
    if (wizardStep === "configure") return "Configure output options before processing";
    return "Review and start processing";
  }, [wizardStep]);

  return (
    <div className={cn("bg-background rounded-xl border border-border overflow-hidden flex flex-col", className)}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        {/* Title Row */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Batch Annotation</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{stepDescription}</p>
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
          <StepIndicator currentStep={step} isTypedCohort={isTypedCohort} />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* ================================================================ */}
          {/* Upload Step */}
          {/* ================================================================ */}
          {(step === "select" || step === "uploading" || step === "validating") && !validation && (
            <UploadDropzone
              onFileSelect={handleFileSelect}
              uploadProgress={uploadProgress}
              isUploading={isUploading}
              isValidating={isValidating}
              error={error}
              selectedFile={file}
              onClear={handleClear}
            />
          )}

          {/* ================================================================ */}
          {/* Column Mapping Step (typed cohorts only) */}
          {/* ================================================================ */}
          {step === "mapping" && validation && !isCreating && (
            <div className="space-y-6">
              {/* Back button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackFromMapping}
              >
                <ArrowLeft className="w-4 h-4" />
                Upload different file
              </Button>

              {/* Brief typed validation summary */}
              <ValidationSummary
                typedValidation={validation}
                filename={file?.name}
              />

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Column mapping editor */}
              <ColumnMappingEditor
                typedValidation={validation}
                onConfirm={handleMappingConfirm}
                onBack={handleBackFromMapping}
              />
            </div>
          )}

          {/* ================================================================ */}
          {/* Validation + Configure Step */}
          {/* ================================================================ */}
          {validation && step === "configuring" && !isCreating && (
            <div className="space-y-6">
              {/* Back button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={isTypedCohort ? () => setStep("mapping") : handleBackToUpload}
              >
                <ArrowLeft className="w-4 h-4" />
                {isTypedCohort ? "Back to mapping" : "Upload different file"}
              </Button>

              {/* Validation Summary */}
              <ValidationSummary
                typedValidation={validation}
                filename={file?.name}
              />

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Configuration */}
              <JobConfiguration
                typedValidation={validation}
                dataType={validation.data_type}
                isTypedCohort={isTypedCohort}
                onSubmit={handleSubmit}
                isSubmitting={isCreating}
              />

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* Creating State */}
          {/* ================================================================ */}
          {isCreating && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">Starting batch job...</p>
              <p className="text-sm text-muted-foreground">You'll be redirected to track progress</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
