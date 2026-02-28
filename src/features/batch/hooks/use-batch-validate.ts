"use client";

import { useMutation } from "@tanstack/react-query";
import { validateFile } from "../api";
import type { ValidateResponse } from "../types";

interface UseBatchValidateOptions {
  onSuccess?: (validation: ValidateResponse) => void;
  onError?: (error: Error) => void;
}

interface UseBatchValidateResult {
  validate: (inputUri: string, dryRunLookups?: boolean) => Promise<ValidateResponse>;
  validation: ValidateResponse | null;
  isValidating: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook for validating uploaded files before creating batch jobs
 */
export function useBatchValidate(options: UseBatchValidateOptions = {}): UseBatchValidateResult {
  const { onSuccess, onError } = options;

  const mutation = useMutation({
    mutationFn: validateFile,
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    onError: (err) => {
      onError?.(err instanceof Error ? err : new Error("Validation failed"));
    },
  });

  const validate = async (inputUri: string, dryRunLookups = true) => {
    return mutation.mutateAsync({
      input_uri: inputUri,
      dry_run_lookups: dryRunLookups,
    });
  };

  return {
    validate,
    validation: mutation.data ?? null,
    isValidating: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error : null,
    reset: mutation.reset,
  };
}
