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
  DataType,
  SelectableDataType,
  TypedValidateResponse,
  VariantKeyAlternative,
  WizardAction,
  WizardState,
} from "../types";

// ============================================================================
// Constants
// ============================================================================

const TYPED_DATA_TYPES = new Set<DataType>([
  "gwas_sumstats",
  "credible_set",
  "fine_mapping",
]);

// ============================================================================
// Routing (pure helpers — given state, where does the next step go?)
// ============================================================================

/**
 * After the user commits a data_type (either implicitly from the backend
 * when requires_confirmation is false, or explicitly via the picker), decide
 * whether to route into the mapping step.
 */
function needsMapping(
  dataType: DataType,
  validation: TypedValidateResponse,
): boolean {
  return (
    TYPED_DATA_TYPES.has(dataType) && validation.suggested_column_map.length > 0
  );
}

/**
 * Given a committed dataType (+ optional columnMap), return the next step
 * after that commit point. Accounts for the variant-key picker flag.
 */
type CommitStage = "after-data-type" | "after-mapping";

function resolveNextStep(
  stage: CommitStage,
  dataType: DataType,
  validation: TypedValidateResponse,
): "mapping" | "variant-key" | "configuring" {
  if (stage === "after-data-type" && needsMapping(dataType, validation)) {
    return "mapping";
  }
  if (validation.variant_key_requires_confirmation) {
    return "variant-key";
  }
  return "configuring";
}

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
      const base = {
        file: state.file,
        inputUri: state.inputUri,
        validation,
      };

      // Data-type picker first — user's pick may change downstream routing.
      if (validation.requires_confirmation) {
        return { step: "data-type", ...base };
      }

      const dataType = validation.data_type;
      const next = resolveNextStep("after-data-type", dataType, validation);
      if (next === "mapping") {
        // At this branch, dataType came from the backend without
        // confirmation. It's only here because TYPED_DATA_TYPES contains it,
        // which means it's a SelectableDataType.
        return {
          step: "mapping",
          ...base,
          dataType: dataType as SelectableDataType,
        };
      }
      if (next === "variant-key") {
        return {
          step: "variant-key",
          ...base,
          dataType,
          columnMap: null,
        };
      }
      return {
        step: "configuring",
        ...base,
        dataType,
        columnMap: null,
        variantKeyChoice: null,
      };
    }

    case "VALIDATION_FAILED":
      return { step: "idle", error: action.error };

    case "DATA_TYPE_SELECTED": {
      if (state.step !== "data-type") return state;
      const { dataType } = action;
      const base = {
        file: state.file,
        inputUri: state.inputUri,
        validation: state.validation,
      };
      const next = resolveNextStep(
        "after-data-type",
        dataType,
        state.validation,
      );
      if (next === "mapping") {
        return { step: "mapping", ...base, dataType };
      }
      if (next === "variant-key") {
        return {
          step: "variant-key",
          ...base,
          dataType,
          columnMap: null,
        };
      }
      return {
        step: "configuring",
        ...base,
        dataType,
        columnMap: null,
        variantKeyChoice: null,
      };
    }

    case "MAPPING_CONFIRMED": {
      if (state.step !== "mapping") return state;
      const base = {
        file: state.file,
        inputUri: state.inputUri,
        validation: state.validation,
        dataType: state.dataType,
      };
      const next = resolveNextStep(
        "after-mapping",
        state.dataType,
        state.validation,
      );
      if (next === "variant-key") {
        return {
          step: "variant-key",
          ...base,
          columnMap: action.columnMap,
        };
      }
      return {
        step: "configuring",
        ...base,
        columnMap: action.columnMap,
        variantKeyChoice: null,
      };
    }

    case "VARIANT_KEY_SELECTED": {
      if (state.step !== "variant-key") return state;
      return {
        step: "configuring",
        file: state.file,
        inputUri: state.inputUri,
        validation: state.validation,
        dataType: state.dataType,
        columnMap: state.columnMap,
        variantKeyChoice: action.choice,
      };
    }

    case "BACK_TO_DATA_TYPE": {
      if (
        state.step !== "mapping" &&
        state.step !== "variant-key" &&
        state.step !== "configuring"
      ) {
        return state;
      }
      if (!state.validation.requires_confirmation) return state;
      return {
        step: "data-type",
        file: state.file,
        inputUri: state.inputUri,
        validation: state.validation,
      };
    }

    case "BACK_TO_MAPPING": {
      if (state.step !== "variant-key" && state.step !== "configuring") {
        return state;
      }
      if (!needsMapping(state.dataType, state.validation)) return state;
      // dataType is mapping-eligible → it's SelectableDataType.
      return {
        step: "mapping",
        file: state.file,
        inputUri: state.inputUri,
        validation: state.validation,
        dataType: state.dataType as SelectableDataType,
      };
    }

    case "BACK_TO_VARIANT_KEY": {
      if (state.step !== "configuring") return state;
      if (!state.validation.variant_key_requires_confirmation) return state;
      return {
        step: "variant-key",
        file: state.file,
        inputUri: state.inputUri,
        validation: state.validation,
        dataType: state.dataType,
        columnMap: state.columnMap,
      };
    }

    case "CREATING":
      if (state.step !== "configuring") return state;
      return {
        step: "creating",
        file: state.file,
        inputUri: state.inputUri,
        validation: state.validation,
        dataType: state.dataType,
        columnMap: state.columnMap,
        variantKeyChoice: state.variantKeyChoice,
      };

    case "CREATE_FAILED":
      if (state.step !== "creating") return state;
      return {
        step: "configuring",
        file: state.file,
        inputUri: state.inputUri,
        validation: state.validation,
        dataType: state.dataType,
        columnMap: state.columnMap,
        variantKeyChoice: state.variantKeyChoice,
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
  switch (state.step) {
    case "mapping":
      return true;
    case "variant-key":
    case "configuring":
    case "creating":
      return TYPED_DATA_TYPES.has(state.dataType);
    default:
      return false;
  }
}

/** Map wizard state to the visual steps rendered by the stepper. */
export type VisualStep =
  | "upload"
  | "validate"
  | "data-type"
  | "mapping"
  | "variant-key"
  | "configure"
  | "complete";

export function getVisualStep(state: WizardState): VisualStep {
  switch (state.step) {
    case "idle":
    case "uploading":
      return "upload";
    case "validating":
      return "validate";
    case "data-type":
      return "data-type";
    case "mapping":
      return "mapping";
    case "variant-key":
      return "variant-key";
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
    case "data-type":
      return "Confirm what kind of data this file contains";
    case "mapping":
      return "Review and confirm column mapping";
    case "variant-key":
      return "Choose which column identifies each variant";
    case "configure":
      return "Configure output options before processing";
    case "complete":
      return "Review and start processing";
  }
}

// ============================================================================
// Back-nav resolution (where does "Back" take you from each step?)
// ============================================================================

export interface BackTarget {
  label: string;
  action: () => void;
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

  const confirmDataType = useCallback((dataType: SelectableDataType) => {
    dispatch({ type: "DATA_TYPE_SELECTED", dataType });
  }, []);

  const confirmMapping = useCallback((columnMap: ColumnMapping[]) => {
    dispatch({ type: "MAPPING_CONFIRMED", columnMap });
  }, []);

  const confirmVariantKey = useCallback((choice: VariantKeyAlternative) => {
    dispatch({ type: "VARIANT_KEY_SELECTED", choice });
  }, []);

  const goBackToDataType = useCallback(() => {
    dispatch({ type: "BACK_TO_DATA_TYPE" });
  }, []);

  const goBackToMapping = useCallback(() => {
    dispatch({ type: "BACK_TO_MAPPING" });
  }, []);

  const goBackToVariantKey = useCallback(() => {
    dispatch({ type: "BACK_TO_VARIANT_KEY" });
  }, []);

  const submit = useCallback(
    async (config: JobConfig) => {
      const s = stateRef.current;
      if (s.step !== "configuring") return;

      dispatch({ type: "CREATING" });

      try {
        const {
          file,
          inputUri,
          validation,
          dataType,
          columnMap,
          variantKeyChoice,
        } = s;
        const typed = TYPED_DATA_TYPES.has(dataType);

        const request: CreateCohortRequest = {
          source: "upload",
          input_uri: inputUri,
          label: file.name,
          delimiter: validation.delimiter,
          has_header: validation.has_header,
          metadata: { cohort_label: file.name },
        };

        if (typed) {
          request.data_type = dataType;
          const mappings = columnMap ?? validation.suggested_column_map;
          if (mappings) {
            request.column_map = Object.fromEntries(
              mappings.map((m) => [m.original, m.canonical]),
            );
          }
        } else {
          request.include_not_found = config.includeNotFound;
        }

        // Variant-key hint: send exactly one of key_column / key_vcf_columns,
        // or neither if the user never picked (backend falls back to its
        // top guess).
        if (variantKeyChoice) {
          if (variantKeyChoice.strategy === "vcf_columns") {
            const [chrom, pos, ref_col, alt] = variantKeyChoice.columns;
            request.key_vcf_columns = { chrom, pos, ref_col, alt };
          } else {
            request.key_column = variantKeyChoice.columns[0];
          }
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
    confirmDataType,
    confirmMapping,
    confirmVariantKey,
    goBackToDataType,
    goBackToMapping,
    goBackToVariantKey,
    submit,
    reset,
    isTyped: isTypedCohortState(state),
    visualStep: getVisualStep(state),
  };
}
