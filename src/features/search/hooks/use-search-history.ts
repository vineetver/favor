"use client";

import { useAuth } from "@shared/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  clearSearchHistory,
  deleteSearchHistory,
  listSearchHistory,
  pinSearchHistory,
  recordSearchHistory,
} from "../api/history-api";
import type {
  HistoryItem,
  HistoryKind,
  ListHistoryParams,
  ListHistoryResponse,
  RecordHistoryBody,
} from "../types/history";

const HISTORY_ROOT_KEY = "search-history" as const;

export function useSearchHistory(params: ListHistoryParams = {}) {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();

  const queryKey = [HISTORY_ROOT_KEY, params] as const;

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => listSearchHistory(params),
    enabled: isAuthenticated,
    staleTime: 30_000,
    // History is non-critical — don't burn time retrying on failure, just show empty.
    retry: false,
    refetchOnWindowFocus: false,
  });

  const invalidateAll = useCallback(
    () => qc.invalidateQueries({ queryKey: [HISTORY_ROOT_KEY] }),
    [qc],
  );

  // Resort helper: pinned-first, then lastUsedAt DESC (mirrors the server).
  const resort = (xs: HistoryItem[]) =>
    [...xs].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.lastUsedAt.localeCompare(a.lastUsedAt);
    });

  const recordMut = useMutation({
    mutationFn: recordSearchHistory,
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: [HISTORY_ROOT_KEY] });
      const prev = qc.getQueryData<ListHistoryResponse>(queryKey);
      if (prev) {
        const now = new Date().toISOString();
        // Match by the display key the panel renders. Strict match on
        // (query, entityType, entityId) leaves orphaned rows visible when a
        // query was previously recorded as free-text and now as an entity.
        const incomingKey = (body.entityLabel ?? body.query ?? "")
          .trim()
          .toLowerCase();
        const idx = prev.items.findIndex(
          (it) =>
            (it.entityLabel ?? it.query ?? "").trim().toLowerCase() ===
            incomingKey,
        );
        let next: HistoryItem[];
        let nextCount = prev.count;
        if (idx >= 0) {
          const cur = prev.items[idx];
          const updated: HistoryItem = {
            ...cur,
            hitCount: cur.hitCount + 1,
            lastUsedAt: now,
            entityLabel: body.entityLabel ?? cur.entityLabel,
            genome: body.genome ?? cur.genome,
          };
          next = [
            ...prev.items.slice(0, idx),
            updated,
            ...prev.items.slice(idx + 1),
          ];
        } else {
          const optimistic: HistoryItem = {
            id: `__optimistic-${now}`,
            kind: body.kind,
            query: body.query,
            entityType: body.entityType,
            entityId: body.entityId,
            entityLabel: body.entityLabel,
            genome: body.genome,
            hitCount: 1,
            pinned: false,
            firstUsedAt: now,
            lastUsedAt: now,
          };
          next = [optimistic, ...prev.items];
          nextCount = prev.count + 1;
        }
        qc.setQueryData<ListHistoryResponse>(queryKey, {
          items: resort(next),
          count: nextCount,
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => invalidateAll(),
  });

  const pinMut = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      pinSearchHistory(id, pinned),
    onMutate: async ({ id, pinned }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<ListHistoryResponse>(queryKey);
      if (prev) {
        const next = prev.items.map((it) =>
          it.id === id ? { ...it, pinned } : it,
        );
        qc.setQueryData<ListHistoryResponse>(queryKey, {
          ...prev,
          items: resort(next),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => invalidateAll(),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSearchHistory,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<ListHistoryResponse>(queryKey);
      if (prev) {
        qc.setQueryData<ListHistoryResponse>(queryKey, {
          items: prev.items.filter((it: HistoryItem) => it.id !== id),
          count: Math.max(0, prev.count - 1),
        });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => invalidateAll(),
  });

  const clearMut = useMutation({
    mutationFn: clearSearchHistory,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<ListHistoryResponse>(queryKey);
      qc.setQueryData<ListHistoryResponse>(queryKey, { items: [], count: 0 });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => invalidateAll(),
  });

  return {
    items: data?.items ?? [],
    count: data?.count ?? 0,
    isLoading: isAuthenticated && isLoading,
    error,
    isAuthenticated,
    // No-op writes when signed out — server would 401 and the action is meaningless.
    record: (body: RecordHistoryBody) => {
      if (!isAuthenticated) return;
      recordMut.mutate(body);
    },
    pin: (id: string, pinned: boolean) => {
      if (!isAuthenticated) return;
      pinMut.mutate({ id, pinned });
    },
    remove: (id: string) => {
      if (!isAuthenticated) return;
      deleteMut.mutate(id);
    },
    clear: (kind?: HistoryKind) => {
      if (!isAuthenticated) return;
      clearMut.mutate(kind);
    },
  };
}

/**
 * Lightweight, hook-free recorder for fire-and-forget calls from outside React
 * (e.g. detail-page mounts that want to record a `view` event without subscribing).
 * Failures are swallowed by design — history is non-critical.
 */
export function fireRecordSearchHistory(body: RecordHistoryBody): void {
  recordSearchHistory(body).catch(() => {});
}
