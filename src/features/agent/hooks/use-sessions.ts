"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteSessionClient, listSessionsClient } from "../lib/session-client";

export const SESSIONS_KEY = ["agent-sessions"] as const;

export function useSessions() {
  const queryClient = useQueryClient();

  const {
    data: sessions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: () => listSessionsClient(50),
    staleTime: 30_000,
  });

  const { mutate: deleteSession } = useMutation({
    mutationFn: deleteSessionClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });

  return { sessions, isLoading, deleteSession, refetch } as const;
}
