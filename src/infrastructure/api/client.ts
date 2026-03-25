import { ApiError, type AsyncData, type FetchOptions } from "./types";

const DEFAULT_REVALIDATE = 3600; // 1 hour

export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { revalidate = DEFAULT_REVALIDATE, headers = {} } = options;

  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...headers },
    credentials: "include",
    next: { revalidate },
  });

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, url);
  }

  return response.json();
}

export async function fetchWithState<T>(
  fetcher: () => Promise<T | null>,
): Promise<AsyncData<T>> {
  try {
    const data = await fetcher();
    if (data === null || (Array.isArray(data) && data.length === 0)) {
      return { status: "empty" };
    }
    return { status: "success", data };
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", error: error.message, code: error.code };
    }
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function fetchOrNull<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T | null> {
  try {
    return await fetchJson<T>(url, options);
  } catch (error) {
    if (error instanceof ApiError && error.code === 404) {
      return null;
    }
    console.error(`Fetch error for ${url}:`, error);
    return null;
  }
}
