// src/features/agent/lib/follow-up.ts
//
// One-time seed handoff for "Ask follow-up" deep links from LLM summary
// pages into the agent workspace.
//
// Why sessionStorage?
//   • The seed payload (entity reference + rendered summary markdown) is
//     1–2 KB — too big for a URL, fine in storage.
//   • sessionStorage survives same-origin navigation (including the auth
//     login bounce, which is same-origin via the API proxy).
//   • One-time consumption: the consumer reads then immediately removes
//     the entry, so a refresh doesn't replay the seed.
//
// The agent never reads from sessionStorage outside of `consumeFollowUp`;
// keep this module as the single point of contact for the storage key
// shape so it stays trivially auditable.

const STORAGE_PREFIX = 'agent:follow-up:'

export type SummarySeed = {
  /** Discriminator for the entity the summary describes. */
  readonly kind: 'variant' | 'gene'
  /** Canonical identifier (e.g. "17-43057062-T-TG" or "ENSG00000012048"). */
  readonly id: string
  /** Human-friendly label shown in the seed message ("BRCA1", "rs12345"). */
  readonly displayName: string
  /** The rendered markdown the user just read. */
  readonly summary: string
}

/**
 * Stash a seed in sessionStorage and return its one-time UUID handle.
 * Returns null if storage is unavailable (SSR or private browsing) — the
 * caller should fall back to a plain navigation in that case.
 */
export function stashFollowUp(seed: SummarySeed): string | null {
  if (typeof window === 'undefined') return null
  try {
    const id = crypto.randomUUID()
    window.sessionStorage.setItem(
      `${STORAGE_PREFIX}${id}`,
      JSON.stringify(seed)
    )
    return id
  } catch {
    return null
  }
}

/**
 * Read and remove a seed by its UUID handle. Returns null if the entry
 * doesn't exist, has been consumed already, or is malformed.
 */
export function consumeFollowUp(id: string): SummarySeed | null {
  if (typeof window === 'undefined') return null
  const key = `${STORAGE_PREFIX}${id}`
  const raw = window.sessionStorage.getItem(key)
  if (!raw) return null
  window.sessionStorage.removeItem(key)
  try {
    const parsed = JSON.parse(raw) as SummarySeed
    if (
      (parsed.kind !== 'variant' && parsed.kind !== 'gene') ||
      typeof parsed.id !== 'string' ||
      typeof parsed.displayName !== 'string' ||
      typeof parsed.summary !== 'string'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Build the user-facing first message that gets dispatched into the new
 * agent session. Includes the full summary so the model has the exact
 * context the user just read, and so the session history is self-contained
 * for anyone revisiting the conversation later.
 *
 * If `userQuestion` is provided, it's appended after the summary as the
 * user's actual ask. Otherwise we fall back to a generic open-ended
 * prompt — the user clicked "Ask follow-up" with nothing typed and
 * wants the model to lead.
 */
export function buildFollowUpMessage(
  seed: SummarySeed,
  userQuestion?: string
): string {
  const label = seed.kind === 'variant' ? 'variant' : 'gene'
  const trimmedQuestion = userQuestion?.trim()
  const tail = trimmedQuestion
    ? trimmedQuestion
    : 'Help me explore this further — what aspects are most worth digging into?'
  return [
    `I just read the AI summary of ${label} **${seed.displayName}** (\`${seed.id}\`). Here's what it said:`,
    '',
    seed.summary,
    '',
    '---',
    '',
    tail,
  ].join('\n')
}
