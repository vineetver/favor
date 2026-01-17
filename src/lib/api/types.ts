/**
 * Shared API Types - Discriminated unions for async state
 */

export type AsyncData<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T; cachedAt?: string }
  | { status: "error"; error: string; code?: number }
  | { status: "empty" };

export function isSuccess<T>(
  state: AsyncData<T>,
): state is { status: "success"; data: T } {
  return state.status === "success";
}

export function isError<T>(
  state: AsyncData<T>,
): state is { status: "error"; error: string } {
  return state.status === "error";
}

export function hasData<T>(
  state: AsyncData<T>,
): state is { status: "success"; data: T } {
  return state.status === "success";
}

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public endpoint?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface FetchOptions {
  revalidate?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
