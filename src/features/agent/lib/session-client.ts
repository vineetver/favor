"use client";

import type { AgentMessage, AgentSession } from "./agent-api";
import { API_BASE } from "./constants";

async function sessionFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    // Redirect to login on 401
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = `${API_BASE}/auth/login?return_to=${encodeURIComponent(window.location.href)}`;
      return new Promise<T>(() => {});
    }
    throw new Error(`Session API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function createSessionClient(
  title?: string,
): Promise<AgentSession> {
  return sessionFetch<AgentSession>("/agent/sessions", {
    method: "POST",
    body: { title: title ?? null },
  });
}

export async function listSessionsClient(limit = 50): Promise<AgentSession[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return sessionFetch<AgentSession[]>(`/agent/sessions?${params}`);
}

export async function deleteSessionClient(sessionId: string): Promise<void> {
  await sessionFetch<unknown>(`/agent/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export async function listMessagesClient(
  sessionId: string,
): Promise<AgentMessage[]> {
  return sessionFetch<AgentMessage[]>(`/agent/sessions/${sessionId}/messages`);
}

export type { AgentSession, AgentMessage };
