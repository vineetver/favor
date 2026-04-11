"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useReducer, useRef } from "react";
import {
  uploadFile as apiUploadFile,
  BatchApiError,
  createCohort,
  validateTypedCohort,
} from "../api";
import type { JobConfig } from "../components/job-configuration";
import type {
  ColumnMapping,
  CreateCohortRequest,
  WizardAction,
  WizardState,
} from "../types";

// ============================================================================
// Constants
// ============================================================================

const TYPED_DATA_TYPES = new Set<string>([
  "gwas_sumstats",
  "credible_set",
  "fine_mapping",
]);

// ============================================================================
// Reducer (pure — all state transitions in one place)
// ============================================================================

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "FILE_SELECTED":
      return { step: "uploading", file: action.file, progress: 0 };

    case "UPLOAD_PROGRESS":
      if (state.step !== "uploading") return state;
      return { ...state, progress: action.progress };

    case "UPLOAD_DONE":
      if (state.step !== "uploading") return state;
      return {
        step: "validating",
        file: state.file,
        inputUri: action.inputUri,
      };

    case "UPLOAD_FAILED":
      return { step: "idle", error: action.error };

    case "VALIDATION_DONE": {
      if (state.step !== "validating") return state;
      const { validation } = action;
      const isTyped =
        TYPED_DATA_TYPES.has(validation.data_type) &&
        validation.confidence >= 0.5;
      if (isTyped && validation.suggested_column_map?.length > 0) {
        return {
          step: "mapping",
          file: state.file,
          inputUri: state.inputUri,
          validation,
        };
      }
      return {
        step: "configuring",
        file: state.file,
        inputUri: state.inputUri,
        validation,
        columnMap: null,
      };
    }

    case "VALIDATION_FAILED":
      return { step: "idle", error: action.error };

    case "MAPPING_CONFIRMED":
      if (state.step !== "mapping") return state;
      return {
        step: "configuring",
        file: state.file,
        inputUri: state.inputUri,
        validation: state.validation,
        columnMap: action.columnMap,
      };

    case "BACK_TO_MAPPING":
      if (state.step !== "configuring") return state;
      return {
        step: "mapping",
        file: state.file,
        inputUri: state.inputUri,
        validation: state.validation,
      };

    case "CREATING":
      if (state.step !== "configuring") return state;
      return {
        step: "creating",
        file: state.file,
        inputUri: state.inputUri,
        validation: state.validation,
        columnMap: state.columnMap,
      };

    case "CREATE_FAILED":
      if (state.step !== "creating") return state;
      return {
        step: "configuring",
        file: state.file,
        inputUri: state.inputUri,
        validation: state.validation,
        columnMap: state.columnMap,
        error: action.error,
      };

    case "RESET":
      return { step: "idle" };

    default:
      return state;
  }
}

// ============================================================================
// Derived State Helpers
// ============================================================================

export function isTypedCohortState(state: WizardState): boolean {
  if (state.step === "mapping") return true;
  if (state.step === "configuring" || state.step === "creating") {
    return (
      TYPED_DATA_TYPES.has(state.validation.data_type) &&
      state.validation.confidence >= 0.5
    );
  }
  return false;
}

/** Map wizard state to the 5 visual steps for the step indicator. */
export type VisualStep =
  | "upload"
  | "validate"
  | "mapping"
  | "configure"
  | "complete";

export function getVisualStep(state: WizardState): VisualStep {
  switch (state.step) {
    case "idle":
    case "uploading":
      return "upload";
    case "validating":
      return "validate";
    case "mapping":
      return "mapping";
    case "configuring":
    case "creating":
      return "configure";
  }
}

/** Step description for the header subtitle. */
export function getStepDescription(step: VisualStep): string {
  switch (step) {
    case "upload":
      return "Variant lists, GWAS summary stats, credible sets, and fine mapping";
    case "validate":
      return "Checking file format and previewing data";
    case "mapping":
      return "Review and confirm column mapping";
    case "configure":
      return "Configure output options before processing";
    case "complete":
      return "Review and start processing";
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useWizard() {
  const [state, dispatch] = useReducer(wizardReducer, {
    step: "idle",
  } as WizardState);
  const router = useRouter();
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  // Use a ref to read current state in async callbacks without stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  const selectFile = useCallback(async (file: File) => {
    // Abort any in-flight upload/validation
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: "FILE_SELECTED", file });

    try {
      // Phase 1: Upload
      const { input_uri } = await apiUploadFile(
        file,
        (progress) => dispatch({ type: "UPLOAD_PROGRESS", progress }),
        controller.signal,
      );
      dispatch({ type: "UPLOAD_DONE", inputUri: input_uri });

      // Phase 2: Validate
      const result = await validateTypedCohort(
        { input_uri },
        controller.signal,
      );
      if (!result.ok) {
        dispatch({
          type: "VALIDATION_FAILED",
          error: result.errors[0] || "File validation failed",
        });
        return;
      }
      dispatch({ type: "VALIDATION_DONE", validation: result });
    } catch (err) {
      // Swallow abort errors — the user navigated away or reset
      if (controller.signal.aborted) return;
      const message =
        err instanceof BatchApiError ? err.message : "An error occurred";
      dispatch({ type: "UPLOAD_FAILED", error: message });
    }
  }, []);

  const confirmMapping = useCallback((columnMap: ColumnMapping[]) => {
    dispatch({ type: "MAPPING_CONFIRMED", columnMap });
  }, []);

  const goBackToMapping = useCallback(() => {
    dispatch({ type: "BACK_TO_MAPPING" });
  }, []);

  const submit = useCallback(
    async (config: JobConfig) => {
      const s = stateRef.current;
      if (s.step !== "configuring") return;

      dispatch({ type: "CREATING" });

      try {
        const { file, inputUri, validation, columnMap } = s;
        const typed = isTypedCohortState(s);

        const request: CreateCohortRequest = {
          source: "upload",
          input_uri: inputUri,
          label: file.name,
          delimiter: validation.delimiter,
          has_header: validation.has_header,
          metadata: { cohort_label: file.name },
        };

        if (typed) {
          request.data_type = validation.data_type;
          const mappings = columnMap ?? validation.suggested_column_map;
          if (mappings) {
            request.column_map = Object.fromEntries(
              mappings.map((m) => [m.original, m.canonical]),
            );
          }
        } else {
          request.include_not_found = config.includeNotFound;
        }

        if (config.enrichments) {
          request.enrichments = config.enrichments;
        }

        const { id } = await createCohort(request);
        // Invalidate caches so jobs list and quotas reflect the new job
        queryClient.invalidateQueries({ queryKey: ["cohorts"] });
        queryClient.invalidateQueries({ queryKey: ["quotas"] });
        router.push(`/batch-annotation/jobs/${id}`);
      } catch (err) {
        const message =
          err instanceof BatchApiError ? err.message : "Failed to create job";
        dispatch({ type: "CREATE_FAILED", error: message });
      }
    },
    [router, queryClient],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "RESET" });
  }, []);

  return {
    state,
    selectFile,
    confirmMapping,
    goBackToMapping,
    submit,
    reset,
    isTyped: isTypedCohortState(state),
    visualStep: getVisualStep(state),
  };
}
