const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const DEFAULT_TIMEOUT = 30_000; // 30s per tool call

/**
 * Agent-facing error that returns structured messages the LLM can reason about.
 */
class AgentToolError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly recoveryHint?: string,
  ) {
    super(`API ${status}: ${detail}`);
    this.name = "AgentToolError";
  }

  /** Return an LLM-readable object instead of throwing into the void */
  toToolResult() {
    return {
      error: true,
      status: this.status,
      message: this.detail,
      ...(this.recoveryHint ? { hint: this.recoveryHint } : {}),
    };
  }
}

/** Parse API error into actionable hint for the LLM */
function parseErrorHint(status: number, body: string): string | undefined {
  if (status === 400) {
    if (body.includes("score")) return "Check the score column name — see Score Columns list.";
    if (body.includes("filter")) return "Check the filter format — use score_above/score_below with a valid field.";
    if (body.includes("entity") || body.includes("not found"))
      return "Entity not found. Try searchEntities to find the correct ID.";
    return "Bad request — check the parameters.";
  }
  if (status === 404) return "Resource not found. Verify the ID exists.";
  if (status === 429) return "Rate limited. Wait a moment, then retry.";
  if (status >= 500) return "Server error — try again or use an alternative approach.";
  return undefined;
}

export async function agentFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown; timeout?: number },
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options?.timeout ?? DEFAULT_TIMEOUT,
  );

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: options?.method ?? "GET",
      headers: { "Content-Type": "application/json" },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      const hint = parseErrorHint(res.status, body);
      throw new AgentToolError(res.status, body.slice(0, 500), hint);
    }
    return res.json();
  } catch (err) {
    if (err instanceof AgentToolError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new AgentToolError(408, "Request timed out", "Try a simpler query or reduce the limit.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Cohort calls need tenant_id */
export function cohortFetch<T>(
  path: string,
  options?: Parameters<typeof agentFetch>[1],
) {
  const separator = path.includes("?") ? "&" : "?";
  return agentFetch<T>(
    `${path}${separator}tenant_id=default-tenant`,
    options,
  );
}

export { AgentToolError };
