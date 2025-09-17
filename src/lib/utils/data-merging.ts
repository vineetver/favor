import type { StandardToolResponse } from "./data-interfaces";

export function mergeMultiSourceResults<T extends Record<string, any>>(
  results: Array<{ source: string; data: T[] }>,
  mergeStrategy: "union" | "intersection" = "union",
  deduplicateBy?: keyof T,
): T[] {
  if (results.length === 0) return [];
  if (results.length === 1) return results[0].data;

  if (mergeStrategy === "union") {
    const merged = results.flatMap((r) => r.data);

    if (deduplicateBy) {
      return deduplicateResults(merged, deduplicateBy);
    }

    return merged;
  }

  // Intersection strategy - keep items that appear in all sources
  const [first, ...rest] = results;
  return first.data.filter((item) => {
    return rest.every((result) =>
      result.data.some((otherItem) =>
        deduplicateBy
          ? item[deduplicateBy] === otherItem[deduplicateBy]
          : JSON.stringify(item) === JSON.stringify(otherItem),
      ),
    );
  });
}

export function deduplicateResults<T extends Record<string, any>>(
  data: T[],
  keyField: keyof T,
): T[] {
  const seen = new Set();
  return data.filter((item) => {
    const key = item[keyField];
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function combineStandardResponses<T>(
  responses: StandardToolResponse<T>[],
  mergeStrategy: "union" | "intersection" = "union",
): StandardToolResponse<T> {
  if (responses.length === 0) {
    return {
      data: [],
      hasNextPage: false,
      metadata: { dataType: "combined" },
    };
  }

  if (responses.length === 1) {
    return responses[0];
  }

  const mergedData =
    mergeStrategy === "union"
      ? responses.flatMap((r) => r.data)
      : responses[0].data.filter((item) =>
          responses
            .slice(1)
            .every((response) =>
              response.data.some(
                (otherItem) =>
                  JSON.stringify(item) === JSON.stringify(otherItem),
              ),
            ),
        );

  const hasNextPage = responses.some((r) => r.hasNextPage);
  const totalCount = responses.reduce((sum, r) => sum + (r.totalCount || 0), 0);

  // Combine metadata
  const sources = responses
    .map((r) => r.metadata?.source)
    .filter(Boolean)
    .join(", ");

  const appliedFilters = responses
    .map((r) => r.metadata?.appliedFilters)
    .filter(Boolean)[0]; // Use first non-empty filter

  return {
    data: mergedData,
    hasNextPage,
    totalCount,
    metadata: {
      dataType: "combined",
      source: sources,
      appliedFilters,
      totalFiltered: mergedData.length,
    },
  };
}

export function annotateWithSource<T extends Record<string, any>>(
  data: T[],
  source: string,
): Array<T & { _source: string }> {
  return data.map((item) => ({
    ...item,
    _source: source,
  }));
}

export function prioritizeResults<T extends Record<string, any>>(
  results: Array<{ source: string; data: T[]; priority: number }>,
  maxResults?: number,
): T[] {
  // Sort by priority (higher numbers = higher priority)
  const sorted = results
    .sort((a, b) => b.priority - a.priority)
    .flatMap((r) => annotateWithSource(r.data, r.source));

  return maxResults ? sorted.slice(0, maxResults) : sorted;
}
