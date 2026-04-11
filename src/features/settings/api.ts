import { handle401 } from "@infra/api/handle-auth-error";

import { API_BASE } from "@/config/api";
import type {
  ApiKeyItem,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from "./types";

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
    if (handle401(response.status)) {
      return new Promise<T>(() => {}); // redirect in progress, never resolves
    }
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
    if (handle401(res.status)) return; // redirect in progress
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
