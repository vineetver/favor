import type { PlatformStatus } from "./types";

export async function fetchPlatformStatus(
  signal?: AbortSignal,
): Promise<PlatformStatus> {
  const res = await fetch("/api/platform-status", { signal });
  if (!res.ok) throw new Error(`platform-status ${res.status}`);
  return (await res.json()) as PlatformStatus;
}
