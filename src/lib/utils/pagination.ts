import type { PaginationParams, PaginationResponse } from "./data-interfaces";

export function createPaginationParams(
  params: PaginationParams,
): URLSearchParams {
  const urlParams = new URLSearchParams();

  if (params.pageSize) {
    // Request one extra item to determine if there are more pages
    urlParams.set("limit", String(params.pageSize + 1));
  }

  if (params.cursor) {
    urlParams.set("cursor", params.cursor);
  }

  return urlParams;
}

export function processPaginatedResults<T extends { [key: string]: any }>(
  data: T[],
  pageSize?: number,
  getCursor?: (item: T) => string,
): { paginatedData: T[]; pagination: PaginationResponse } {
  if (!pageSize) {
    return {
      paginatedData: data,
      pagination: { hasNextPage: false },
    };
  }

  const hasNextPage = data.length > pageSize;
  const paginatedData = hasNextPage ? data.slice(0, pageSize) : data;

  const nextCursor =
    hasNextPage && getCursor && paginatedData.length > 0
      ? getCursor(paginatedData[paginatedData.length - 1])
      : undefined;

  return {
    paginatedData,
    pagination: {
      hasNextPage,
      nextCursor,
      totalCount: data.length,
    },
  };
}

export function mergeAndPaginateResults<T>(
  results: T[][],
  pageSize?: number,
  sortFn?: (a: T, b: T) => number,
): { data: T[]; pagination: PaginationResponse } {
  let merged = results.flat();

  if (sortFn) {
    merged = merged.sort(sortFn);
  }

  if (!pageSize) {
    return {
      data: merged,
      pagination: { hasNextPage: false, totalCount: merged.length },
    };
  }

  const hasNextPage = merged.length > pageSize;
  const data = hasNextPage ? merged.slice(0, pageSize) : merged;

  return {
    data,
    pagination: {
      hasNextPage,
      totalCount: merged.length,
    },
  };
}

export function createCursorFromItem<T>(item: T, cursorField: keyof T): string {
  const value = item[cursorField];
  return typeof value === "string" ? value : String(value);
}
