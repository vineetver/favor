"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Progress } from "@shared/components/ui/progress";
import {
  AlertCircle,
  CheckCircle2,
  File,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "../config";

// ============================================================================
// Types
// ============================================================================

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  uploadProgress?: number;
  isUploading?: boolean;
  isValidating?: boolean;
  error?: string | null;
  disabled?: boolean;
  selectedFile?: File | null;
  onClear?: () => void;
  className?: string;
}

// ============================================================================
// Utilities
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFileInput(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File exceeds ${MAX_FILE_SIZE_MB}MB limit`;
  }

  const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return `Unsupported type. Use: ${ACCEPTED_EXTENSIONS.join(", ")}`;
  }

  return null;
}

// ============================================================================
// File Type Chips
// ============================================================================

const ACCEPTED_DATA_TYPES = [
  "Variant List",
  "GWAS Summary Stats",
  "Credible Set",
  "Fine Mapping",
] as const;

function AcceptedDataTypes() {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {ACCEPTED_DATA_TYPES.map((t) => (
        <span
          key={t}
          className="px-3 py-1 rounded-lg bg-background border border-border text-xs font-medium text-muted-foreground shadow-sm"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function UploadDropzone({
  onFileSelect,
  uploadProgress = 0,
  isUploading = false,
  isValidating = false,
  error,
  disabled = false,
  selectedFile,
  onClear,
  className,
}: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setLocalError(null);
      const validationError = validateFileInput(file);
      if (validationError) {
        setLocalError(validationError);
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled || isUploading) return;
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [disabled, isUploading, handleFile],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading) {
        setIsDragOver(true);
      }
    },
    [disabled, isUploading],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [handleFile],
  );

  const handleClear = useCallback(() => {
    setLocalError(null);
    onClear?.();
  }, [onClear]);

  const displayError = error || localError;
  const isProcessing = isUploading || isValidating;
  const isDisabled = disabled || isProcessing;

  // ============================================================================
  // File Selected State
  // ============================================================================

  if (selectedFile) {
    return (
      <div
        className={cn(
          "rounded-xl border bg-background p-6 transition-all",
          displayError ? "border-rose-200" : "border-border",
          className,
        )}
      >
        {/* File Info */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
              displayError
                ? "bg-rose-100"
                : isProcessing
                  ? "bg-primary/10"
                  : "bg-emerald-100",
            )}
          >
            {displayError ? (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            ) : isProcessing ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <File className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {selectedFile.name}
            </p>
            <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
          </div>
          {!isProcessing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-muted-foreground hover:text-muted-foreground"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          )}
        </div>

        {/* Error Message */}
        {displayError && (
          <div className="mt-4 flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground font-medium">Uploading...</span>
              <span className="text-muted-foreground">{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Validating State */}
        {isValidating && (
          <div className="mt-5 flex items-center gap-2 text-sm text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-medium">Analyzing file format...</span>
          </div>
        )}

        {/* Upload Complete */}
        {!isProcessing && !displayError && uploadProgress === 100 && (
          <div className="mt-5 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium">File uploaded successfully</span>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // Error State (no file selected)
  // ============================================================================

  if (displayError && !selectedFile) {
    return (
      <div
        className={cn(
          "rounded-xl border border-rose-200 bg-rose-50/30 p-8 transition-all",
          "flex flex-col items-center justify-center text-center",
          className,
        )}
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-rose-100">
          <AlertCircle className="w-6 h-6 text-rose-500" />
        </div>
        <p className="text-base font-semibold text-rose-700 mb-2">Upload Error</p>
        <p className="text-sm text-rose-600 max-w-sm mb-6">{displayError}</p>
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          Try Again
        </Button>
      </div>
    );
  }

  // ============================================================================
  // Normal Dropzone
  // ============================================================================

  return (
    <label
      className={cn(
        "relative block cursor-pointer rounded-xl border-2 border-dashed p-10 transition-all",
        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/50 hover:border-border hover:bg-muted",
        isDisabled && "cursor-not-allowed opacity-60",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={handleInputChange}
        className="sr-only"
        disabled={isDisabled}
      />

      <div className="flex flex-col items-center justify-center text-center">
        {/* Upload Icon */}
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-all",
            isDragOver
              ? "bg-primary/10 scale-110"
              : "bg-background border border-border shadow-sm",
          )}
        >
          <UploadCloud
            className={cn(
              "w-7 h-7 transition-colors",
              isDragOver ? "text-primary" : "text-muted-foreground",
            )}
          />
        </div>

        {/* Text */}
        <p className="text-base font-semibold text-foreground mb-1">
          {isDragOver ? "Drop your file here" : "Drag & drop your file"}
        </p>
        <p className="text-sm text-muted-foreground mb-5">or click to browse</p>

        {/* Accepted Data Types */}
        <AcceptedDataTypes />

        {/* Format + Size Note */}
        <p className="text-xs text-muted-foreground mt-5">
          CSV, TSV, TXT, VCF, Parquet &middot; {MAX_FILE_SIZE_MB}MB max &middot; Auto-detected
        </p>

        {/* CLI note */}
        <p className="text-[11px] text-muted-foreground/60 mt-3">
          For genotype-scale data, use the{" "}
          <a href="/docs" className="font-medium text-muted-foreground/80 underline underline-offset-2 hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
            FAVOR CLI
          </a>
        </p>
      </div>
    </label>
  );
}
