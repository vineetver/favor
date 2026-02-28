import type { ResultType, ResultRef, StoredResult } from "../types";

/**
 * In-memory store for structured tool results.
 * Created per-request, threaded via closure to tools.
 * Enables cross-domain chaining (e.g., variantTriage → bioContext)
 * and cross-turn persistence via hydration from prior messages.
 */
export class ResultStore {
  private results = new Map<string, StoredResult>();
  private counters = new Map<string, number>();

  /** Store a result and return a ref ID */
  put(type: ResultType, toolName: string, data: unknown, summary: string): ResultRef {
    const count = (this.counters.get(toolName) ?? 0) + 1;
    this.counters.set(toolName, count);

    const refId = `${toolName}_${count}`;
    const itemCount = Array.isArray(data) ? data.length : 1;

    const ref: ResultRef = { refId, type, toolName, summary, itemCount };
    this.results.set(refId, { ref, data, createdAt: Date.now() });
    return ref;
  }

  /** Retrieve a stored result by refId */
  get(refId: string): StoredResult | undefined {
    return this.results.get(refId);
  }

  /** Get a slice of stored data (for arrays) or full object */
  getSlice(refId: string, offset = 0, limit = 50): unknown {
    const stored = this.results.get(refId);
    if (!stored) return undefined;
    if (Array.isArray(stored.data)) {
      return stored.data.slice(offset, offset + limit);
    }
    return stored.data;
  }

  /** List all stored refs */
  list(): ResultRef[] {
    return [...this.results.values()].map((s) => s.ref);
  }

  /** Compact digest for LLM injection */
  toDigest(): string {
    const refs = this.list();
    if (refs.length === 0) return "";
    const lines = refs.map(
      (r) => `- ${r.refId}: ${r.summary} (${r.itemCount} items, type: ${r.type})`,
    );
    return `Available stored results (use getResultSlice to access):\n${lines.join("\n")}`;
  }

  /** Hydrate from prior turn data */
  hydrate(priorResults: Array<{ ref: ResultRef; data: unknown }>): void {
    for (const { ref, data } of priorResults) {
      this.results.set(ref.refId, { ref, data, createdAt: Date.now() });
      // Update counter to avoid ID collisions
      const count = this.counters.get(ref.toolName) ?? 0;
      const refNum = parseInt(ref.refId.split("_").pop() ?? "0", 10);
      if (refNum > count) {
        this.counters.set(ref.toolName, refNum);
      }
    }
  }
}
