import type { ApiKeyItem, CreateApiKeyRequest, CreateApiKeyResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiKeyError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiKeyError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body.error?.message || body.message || message;
    } catch {
      // not JSON
    }
    throw new ApiKeyError(response.status, message);
  }
  return response.json();
}

export async function listApiKeys(): Promise<ApiKeyItem[]> {
  const res = await fetch(`${API_BASE}/auth/api-keys`, {
    credentials: "include",
  });
  return handleResponse<ApiKeyItem[]>(res);
}

export async function createApiKey(
  request: CreateApiKeyRequest,
): Promise<CreateApiKeyResponse> {
  const res = await fetch(`${API_BASE}/auth/api-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });
  return handleResponse<CreateApiKeyResponse>(res);
}

export async function deleteApiKey(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/api-keys/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.error?.message || body.message || message;
    } catch {
      // not JSON
    }
    throw new ApiKeyError(res.status, message);
  }
}
