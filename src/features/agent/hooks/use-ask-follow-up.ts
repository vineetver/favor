'use client'

// src/features/agent/hooks/use-ask-follow-up.ts
//
// Single shared callback for "Ask follow-up in FAVOR-GPT" buttons on
// public LLM-summary surfaces (variant page, gene page).
//
// Flow:
//   1. Stash the seed in sessionStorage and get a one-time UUID.
//   2. If the user is unauthenticated, bounce through `login(returnTo)` —
//      sessionStorage survives the redirect, so the seed is waiting on
//      the other side.
//   3. Otherwise navigate to `/agent?seed=<uuid>` and let the chat page
//      consume it on mount.
//
// If sessionStorage is unavailable (SSR / private browsing), we still
// attempt the navigation; the agent will simply render the empty state.

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@shared/hooks/use-auth'
import { stashFollowUp, type SummarySeed } from '../lib/follow-up'

export function useAskFollowUp() {
  const router = useRouter()
  const { isAuthenticated, login } = useAuth()

  return useCallback(
    (seed: SummarySeed) => {
      const seedId = stashFollowUp(seed)
      const target = seedId ? `/agent?seed=${seedId}` : '/agent'

      if (!isAuthenticated) {
        login(target)
        return
      }
      router.push(target)
    },
    [router, isAuthenticated, login]
  )
}
