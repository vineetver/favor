/**
 * Persist owner-created share tokens in localStorage so the owner can
 * re-copy a share URL without minting a new link. Not used by recipients —
 * they get the token from the URL they were sent.
 *
 * Security tradeoff: the backend deliberately returns the raw token only
 * once on create. Keeping a copy client-side means anyone with browser
 * access (XSS, shared machine) can read it. Mitigations: entries are
 * removed on revoke, cleared on logout, and the tokens grant read-only
 * access to a single cohort that the owner can revoke at any time.
 */

const KEY_PREFIX = "favor:share-token:";

function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function saveShareToken(shareId: string, token: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(`${KEY_PREFIX}${shareId}`, token);
  } catch {
    // Quota/serialization failures are non-fatal — user can always mint a new link.
  }
}

export function getShareToken(shareId: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(`${KEY_PREFIX}${shareId}`);
  } catch {
    return null;
  }
}

export function removeShareToken(shareId: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(`${KEY_PREFIX}${shareId}`);
  } catch {
    // no-op
  }
}

/** Wipe every stored share token. Call on logout. */
export function clearAllShareTokens(): void {
  if (!isBrowser()) return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) toRemove.push(key);
    }
    for (const key of toRemove) window.localStorage.removeItem(key);
  } catch {
    // no-op
  }
}
