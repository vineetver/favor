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

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (returnTo?: string) => void;
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
      fetch(`${API_BASE}/auth/me`, { credentials: "include" })
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

  const login = useCallback((returnTo?: string) => {
    const target = returnTo ?? window.location.href;
    // Validate return URL is same-origin to prevent open redirect
    let safeReturn: string;
    try {
      const url = new URL(target, window.location.origin);
      safeReturn = url.origin === window.location.origin ? url.href : "/";
    } catch {
      safeReturn = "/";
    }
    window.location.href = `${API_BASE}/auth/login?return_to=${encodeURIComponent(safeReturn)}`;
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
