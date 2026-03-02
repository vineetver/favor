/**
 * Error taxonomy & classification for agent tools.
 *
 * Dependency-free module — no imports from api-client or run-result.
 * Provides a finite set of error codes + a classifier for HTTP errors.
 */

// ---------------------------------------------------------------------------
// Error code taxonomy
// ---------------------------------------------------------------------------

/** Finite string union of all tool error codes. */
export type ToolErrorCode =
  // Client errors
  | "validation_error"
  | "missing_param"
  | "unknown_command"
  | "unknown_intent"
  | "entity_not_found"
  | "insufficient_seeds"
  | "no_edge_type"
  // API errors
  | "api_bad_request"
  | "api_not_found"
  | "api_auth"
  | "api_rate_limit"
  | "api_server_error"
  | "api_timeout"
  // Operational
  | "analytics_failed"
  | "cohort_processing_failed"
  | "internal_error"
  | "not_implemented";

// ---------------------------------------------------------------------------
// Classified error shape
// ---------------------------------------------------------------------------

export interface ClassifiedError {
  code: ToolErrorCode;
  message: string;
  hint?: string;
}

// ---------------------------------------------------------------------------
// Body sanitizer
// ---------------------------------------------------------------------------

/** Strip HTML, extract JSON detail, and truncate to a readable length. */
export function sanitizeErrorBody(raw: string): string {
  if (!raw) return "No error details";

  // Try to extract JSON `.detail` or `.message`
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const detail =
        typeof parsed.detail === "string"
          ? parsed.detail
          : typeof parsed.message === "string"
            ? parsed.message
            : null;
      if (detail) return detail.slice(0, 300);
    }
  } catch {
    // Not JSON — continue
  }

  // Strip HTML tags
  const stripped = raw.replace(/<[^>]*>/g, "").trim();
  return stripped.slice(0, 300) || "No error details";
}

// ---------------------------------------------------------------------------
// HTTP error classifier
// ---------------------------------------------------------------------------

/** Classify an HTTP error by status + body into a structured error. */
export function classifyApiError(
  status: number,
  body: string,
): ClassifiedError {
  const message = sanitizeErrorBody(body);

  if (status === 408) {
    return {
      code: "api_timeout",
      message,
      hint: "Try a simpler query or reduce the limit.",
    };
  }

  if (status === 401 || status === 403) {
    return {
      code: "api_auth",
      message,
      hint: "Authentication issue. Session may have expired.",
    };
  }

  if (status === 404) {
    return {
      code: "api_not_found",
      message,
      hint: "Resource not found. Verify the ID exists.",
    };
  }

  if (status === 429) {
    return {
      code: "api_rate_limit",
      message,
      hint: "Rate limited. Wait a moment, then retry.",
    };
  }

  if (status >= 500) {
    return {
      code: "api_server_error",
      message,
      hint: "Server error — try again or use an alternative approach.",
    };
  }

  // 400-level: sub-classify by body content
  if (status === 400) {
    const lower = body.toLowerCase();

    if (lower.includes("not found") || lower.includes("entity")) {
      return {
        code: "entity_not_found",
        message,
        hint: "Entity not found. Try searchEntities to find the correct ID.",
      };
    }

    if (lower.includes("column") || lower.includes("field") || lower.includes("score")) {
      return {
        code: "validation_error",
        message,
        hint: "Check the column/field name — use Read cohort/{id}/schema to see available columns.",
      };
    }

    if (lower.includes("filter")) {
      return {
        code: "validation_error",
        message,
        hint: "Check the filter format — use score_above/score_below with a valid field.",
      };
    }

    return {
      code: "api_bad_request",
      message,
      hint: "Bad request — check the parameters.",
    };
  }

  // Catch-all for other status codes
  return {
    code: "api_bad_request",
    message,
    hint: undefined,
  };
}
