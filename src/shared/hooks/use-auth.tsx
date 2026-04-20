"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getQueryClient } from "@/app/providers";
import { API_BASE } from "@/config/api";

interface AuthUser {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

interface LoginOptions {
  /**
   * Hint to the upstream identity provider that the user wants to sign up
   * rather than sign in. Forwarded as `screen_hint=signup` to the backend's
   * `/auth/login`, which passes it through to Auth0. Harmless no-op until
   * the backend wires the param through — Auth0 just shows the default tab.
   */
  signup?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (returnTo?: string, options?: LoginOptions) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let attempt = 0;
    const maxRetries = 2;

    function tryFetchAuth() {
      fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
        cache: "no-store",
      })
        .then((res) => {
          if (res.ok) return res.json();
          // 401/403 = genuinely not authenticated, don't retry
          return null;
        })
        .then((data) => {
          if (data?.sub) setUser(data);
          setIsLoading(false);
        })
        .catch(() => {
          // Network error — retry before giving up
          if (attempt < maxRetries) {
            attempt++;
            setTimeout(tryFetchAuth, 1000 * attempt);
          } else {
            // Give up — leave user as null but stop loading
            setIsLoading(false);
          }
        });
    }

    tryFetchAuth();
  }, []);

  const login = useCallback((returnTo?: string, options?: LoginOptions) => {
    const target = returnTo ?? window.location.href;
    // Validate return URL is same-origin to prevent open redirect
    let safeReturn: string;
    try {
      const url = new URL(target, window.location.origin);
      safeReturn = url.origin === window.location.origin ? url.href : "/";
    } catch {
      safeReturn = "/";
    }
    const params = new URLSearchParams({ return_to: safeReturn });
    if (options?.signup) params.set("screen_hint", "signup");
    window.location.href = `${API_BASE}/auth/login?${params.toString()}`;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    // Nuke all cached data so the next user never sees stale tenant data.
    // React Query cache lives in memory — clear it synchronously.
    getQueryClient().clear();
    // IndexedDB caches (parquet, DuckDB data) persist across sessions.
    // Fire-and-forget cleanup; the redirect will complete before these finish,
    // but the caches will be gone by the time someone logs back in.
    import("@features/batch/lib/data-cache")
      .then((m) => m.clearDataCache())
      .catch(() => {});
    import("@features/batch/lib/parquet-cache")
      .then((m) => m.clearParquetCache())
      .catch(() => {});
    import("@features/batch/hooks/use-duckdb")
      .then((m) => m.destroyDuckDB())
      .catch(() => {});
    // Wipe locally cached raw share tokens — they grant read access to the
    // previous user's cohorts and must not survive into the next session.
    import("@features/batch/lib/share-token-storage")
      .then((m) => m.clearAllShareTokens())
      .catch(() => {});
    window.location.href = `${API_BASE}/auth/logout`;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
