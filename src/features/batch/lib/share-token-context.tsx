"use client";

import { useSearchParams } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo } from "react";

/**
 * Share-link token, captured from the `?share=` URL param on the analytics
 * page and held in memory for the lifetime of the provider. Never persisted
 * to localStorage — scope is intentionally a single page visit.
 *
 * The token stays in the URL (not stripped) so reload and login-redirect
 * `return_to` preserve it. Exposure is bounded by:
 *   - short expiry (backend max 90d, owner-revokable)
 *   - same-origin links on the analytics page (referrers stay within the app)
 */
interface ShareTokenContextValue {
  token: string | null;
}

const ShareTokenContext = createContext<ShareTokenContextValue>({
  token: null,
});

const TOKEN_PREFIX = "favor_share_";

export function ShareTokenProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const raw = searchParams?.get("share") ?? null;

  const value = useMemo<ShareTokenContextValue>(() => {
    // Shape guard — token is `favor_share_<64 hex>`. Don't accept anything
    // that doesn't at least look right; prevents garbage query params from
    // being sent as auth headers.
    if (
      typeof raw === "string" &&
      raw.startsWith(TOKEN_PREFIX) &&
      raw.length > TOKEN_PREFIX.length
    ) {
      return { token: raw };
    }
    return { token: null };
  }, [raw]);

  return (
    <ShareTokenContext.Provider value={value}>
      {children}
    </ShareTokenContext.Provider>
  );
}

export function useShareToken(): string | null {
  return useContext(ShareTokenContext).token;
}
