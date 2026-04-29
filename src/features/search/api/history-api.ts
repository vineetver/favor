import { API_BASE } from "@/config/api";
import type {
  HistoryItem,
  HistoryKind,
  ListHistoryParams,
  ListHistoryResponse,
  RecordHistoryBody,
} from "../types/history";

const HISTORY_BASE = `${API_BASE}/search/history`;

async function readJsonOrThrow<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`${label} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function listSearchHistory(
  params: ListHistoryParams = {},
): Promise<ListHistoryResponse> {
  const sp = new URLSearchParams();
  sp.append("kind", params.kind ?? "search");
  if (params.limit !== undefined) sp.append("limit", String(params.limit));
  if (params.pinned) sp.append("pinned", "true");
  if (params.genome) sp.append("genome", params.genome);
  const res = await fetch(`${HISTORY_BASE}?${sp.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  return readJsonOrThrow<ListHistoryResponse>(res, "history list");
}

export async function recordSearchHistory(
  body: RecordHistoryBody,
): Promise<HistoryItem> {
  const res = await fetch(HISTORY_BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJsonOrThrow<HistoryItem>(res, "history record");
}

export async function pinSearchHistory(
  id: string,
  pinned: boolean,
): Promise<HistoryItem> {
  const res = await fetch(`${HISTORY_BASE}/${encodeURIComponent(id)}/pin`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinned }),
  });
  return readJsonOrThrow<HistoryItem>(res, "history pin");
}

export async function deleteSearchHistory(id: string): Promise<void> {
  const res = await fetch(`${HISTORY_BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`history delete failed (${res.status})`);
  }
}

export async function clearSearchHistory(kind?: HistoryKind): Promise<void> {
  const url = kind ? `${HISTORY_BASE}?kind=${kind}` : HISTORY_BASE;
  const res = await fetch(url, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    throw new Error(`history clear failed (${res.status})`);
  }
}
