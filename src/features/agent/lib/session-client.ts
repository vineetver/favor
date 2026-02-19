"use client";

import type { AgentSession, AgentMessage } from "./agent-api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const TENANT_ID = "default-tenant";

async function sessionFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Session API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function createSessionClient(
  title?: string,
): Promise<AgentSession> {
  const params = new URLSearchParams({ tenant_id: TENANT_ID });
  return sessionFetch<AgentSession>(`/agent/sessions?${params}`, {
    method: "POST",
    body: { title: title ?? null },
  });
}

export async function listSessionsClient(
  limit = 50,
): Promise<AgentSession[]> {
  const params = new URLSearchParams({
    tenant_id: TENANT_ID,
    limit: String(limit),
  });
  return sessionFetch<AgentSession[]>(`/agent/sessions?${params}`);
}

export async function deleteSessionClient(
  sessionId: string,
): Promise<void> {
  const params = new URLSearchParams({ tenant_id: TENANT_ID });
  await sessionFetch<unknown>(`/agent/sessions/${sessionId}?${params}`, {
    method: "DELETE",
  });
}

export async function listMessagesClient(
  sessionId: string,
): Promise<AgentMessage[]> {
  const params = new URLSearchParams({ tenant_id: TENANT_ID });
  return sessionFetch<AgentMessage[]>(
    `/agent/sessions/${sessionId}/messages?${params}`,
  );
}

export type { AgentSession, AgentMessage };
