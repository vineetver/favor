import { agentFetch } from "./api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentSession {
  session_id: string;
  tenant_id: string;
  title: string | null;
  created_at: string;
  last_activity_at: string;
}

export interface AgentMessage {
  id: number;
  session_id: string;
  role: string;
  content: string; // JSON-serialized UIMessage
  metadata: object | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Session CRUD
// ---------------------------------------------------------------------------

export async function createAgentSession(
  title?: string,
): Promise<AgentSession> {
  return agentFetch<AgentSession>("/agent/sessions", {
    method: "POST",
    body: { title: title ?? null },
  });
}

export async function listAgentSessions(limit = 50): Promise<AgentSession[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return agentFetch<AgentSession[]>(`/agent/sessions?${params}`);
}

export async function deleteAgentSession(sessionId: string): Promise<void> {
  await agentFetch<unknown>(`/agent/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Message CRUD
// ---------------------------------------------------------------------------

export async function appendAgentMessage(
  sessionId: string,
  msg: { role: string; content: string; metadata?: object },
): Promise<AgentMessage> {
  return agentFetch<AgentMessage>(`/agent/sessions/${sessionId}/messages`, {
    method: "POST",
    body: msg,
  });
}

export async function listAgentMessages(
  sessionId: string,
): Promise<AgentMessage[]> {
  return agentFetch<AgentMessage[]>(`/agent/sessions/${sessionId}/messages`);
}

// ---------------------------------------------------------------------------
// Memory CRUD
// ---------------------------------------------------------------------------

export interface AgentMemory {
  id: number;
  tenant_id: string;
  scope: string;
  memory_type: string;
  memory_key: string | null;
  content: string;
  value: object | null;
  confidence: number | null;
  source_session_id: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

export async function searchMemories(
  query: string,
  limit = 10,
): Promise<AgentMemory[]> {
  return agentFetch<AgentMemory[]>("/agent/memories/search", {
    method: "POST",
    body: { query, limit },
  });
}

export async function upsertMemory(mem: {
  scope: string;
  memory_type: string;
  memory_key?: string;
  content: string;
  value?: object;
  confidence?: number;
}): Promise<AgentMemory> {
  return agentFetch<AgentMemory>("/agent/memories", {
    method: "PUT",
    body: mem,
  });
}
