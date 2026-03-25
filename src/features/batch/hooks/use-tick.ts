"use client";

import { useEffect, useState } from "react";

/**
 * Global 1-second tick shared across all consumers.
 * Instead of each LiveDuration creating its own setInterval,
 * this module runs a single interval and broadcasts via listeners.
 */
let listenerCount = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  listenerCount++;
  if (listenerCount === 1) {
    intervalId = setInterval(() => {
      for (const listener of listeners) listener();
    }, 1000);
  }
  return () => {
    listeners.delete(fn);
    listenerCount--;
    if (listenerCount === 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

/**
 * Returns a counter that increments every second.
 * All components sharing this hook use a single global interval.
 */
export function useTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);
  return tick;
}
