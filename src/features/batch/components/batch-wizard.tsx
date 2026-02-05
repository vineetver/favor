"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Settings2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  BatchApiError,
  createJob,
  presignUpload,
  uploadFileToS3,
  validateFile,
} from "../api";
import { DEFAULT_TENANT_ID } from "../config";
import { saveJob } from "../lib/job-storage";
import type { UploadStep, ValidateResponse } from "../types";
import { UploadDropzone } from "./upload-dropzone";
import { ValidationSummary } from "./validation-summary";
import { JobConfiguration, type JobConfig } from "./job-configuration";

// ============================================================================
// Types
// ============================================================================

interface BatchWizardProps {
  className?: string;
}

type WizardStep = "upload" | "validate" | "configure" | "complete";

interface StepConfig {
  id: WizardStep;
  label: string;
  description: string;
  icon: typeof Upload;
}

const STEPS: StepConfig[] = [
  {
    id: "upload",
    label: "Upload",
    description: "Select your variant file",
    icon: Upload,
  },
  {
    id: "validate",
    label: "Validate",
    description: "Check format + preview",
    icon: FileSpreadsheet,
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
  if (step === "configuring" || step === "creating") return "configure";
  return "complete";
}

function getStepIndex(wizardStep: WizardStep): number {
  return STEPS.findIndex((s) => s.id === wizardStep);
}

function StepIndicator({
  currentStep,
  className,
}: {
  currentStep: UploadStep;
  className?: string;
}) {
  const wizardStep = getWizardStep(currentStep);
  const currentIndex = getStepIndex(wizardStep);

  return (
    <div className={cn("flex items-center", className)}>
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === STEPS.length - 1;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all text-sm font-medium",
                  isCompleted && "bg-primary text-white",
                  isCurrent && "bg-primary text-white",
                  !isCompleted && !isCurrent && "bg-slate-100 text-slate-400",
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
                    isCurrent ? "text-slate-900" : isCompleted ? "text-slate-600" : "text-slate-400",
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>

            {!isLast && (
              <div className="flex-1 mx-3 h-px bg-slate-200">
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
  const [validation, setValidation] = useState<ValidateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Handle file selection and upload
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
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
      const validationResult = await validateFile({
        tenant_id: DEFAULT_TENANT_ID,
        input_uri: input_uri,
        dry_run_lookups: true,
      });

      setValidation(validationResult);

      if (validationResult.ok) {
        setStep("configuring");
      } else {
        setError(validationResult.errors[0]?.message || "File validation failed");
        setStep("select");
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
    setError(null);
    setUploadProgress(0);
    setStep("select");
  }, []);

  // Handle going back to upload
  const handleBackToUpload = useCallback(() => {
    handleClear();
  }, [handleClear]);

  // Handle job submission
  const handleSubmit = useCallback(
    async (config: JobConfig) => {
      if (!inputUri || !validation || !file) return;

      setIsCreating(true);
      setError(null);

      try {
        const { job_id, state, created_at } = await createJob({
          tenant_id: DEFAULT_TENANT_ID,
          input_uri: inputUri,
          format: validation.suggested_patch.format,
          key_type: validation.suggested_patch.key_type,
          has_header: validation.suggested_patch.has_header,
          delimiter: validation.suggested_patch.delimiter,
          include_not_found: config.includeNotFound,
          email: config.email || null,
          org_name: config.orgName || null,
        });

        saveJob({
          job_id,
          tenant_id: DEFAULT_TENANT_ID,
          filename: file.name,
          created_at,
          state,
          estimated_rows: validation.estimated_rows,
        });

        router.push(`/batch-annotation/jobs/${job_id}`);
      } catch (err) {
        const message = err instanceof BatchApiError ? err.message : "Failed to create job";
        setError(message);
        setIsCreating(false);
      }
    },
    [inputUri, validation, file, router],
  );

  const isUploading = step === "uploading";
  const isValidating = step === "validating";
  const wizardStep = getWizardStep(step);

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col", className)}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        {/* Title Row */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Batch Annotation</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {wizardStep === "upload" && "Upload your variant file to get started"}
              {wizardStep === "validate" && "Checking file format and previewing data"}
              {wizardStep === "configure" && "Configure output options before processing"}
              {wizardStep === "complete" && "Review and start processing"}
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
        <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-100">
          <StepIndicator currentStep={step} />
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
          {/* Validation + Configure Step */}
          {/* ================================================================ */}
          {validation && step === "configuring" && !isCreating && (
            <div className="space-y-6">
              {/* Back button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToUpload}
              >
                <ArrowLeft className="w-4 h-4" />
                Upload different file
              </Button>

              {/* Validation Summary */}
              <ValidationSummary validation={validation} filename={file?.name} />

              {/* Divider */}
              <div className="border-t border-slate-200" />

              {/* Configuration */}
              <JobConfiguration
                validation={validation}
                onSubmit={handleSubmit}
                isSubmitting={isCreating}
              />

              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
                  <p className="text-sm text-rose-700">{error}</p>
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
              <p className="text-lg font-medium text-slate-900 mb-1">Starting batch job...</p>
              <p className="text-sm text-slate-500">You'll be redirected to track progress</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
