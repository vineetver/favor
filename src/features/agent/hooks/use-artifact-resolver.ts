"use client";

import { useCallback, useRef } from "react";
import { API_BASE } from "../lib/constants";

/**
 * Lazy artifact resolver with in-memory cache.
 * Used to fetch full tool outputs from compacted artifact pointers on session reload.
 */
export function useArtifactResolver() {
  const cache = useRef(new Map<number, unknown>());
  const inflight = useRef(new Map<number, Promise<unknown>>());

  const resolve = useCallback(async (artifactId: number): Promise<unknown> => {
    if (cache.current.has(artifactId)) return cache.current.get(artifactId);

    // Deduplicate concurrent requests for the same artifact
    if (inflight.current.has(artifactId)) return inflight.current.get(artifactId);

    const promise = fetch(`${API_BASE}/agent/artifacts/${artifactId}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Artifact fetch ${r.status}`);
        return r.json();
      })
      .then((data) => {
        cache.current.set(artifactId, data);
        inflight.current.delete(artifactId);
        return data;
      })
      .catch((err) => {
        inflight.current.delete(artifactId);
        throw err;
      });

    inflight.current.set(artifactId, promise);
    return promise;
  }, []);

  return resolve;
}
