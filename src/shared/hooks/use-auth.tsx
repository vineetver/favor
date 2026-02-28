"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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
    fetch(`${API_BASE}/auth/me`, { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.sub) setUser(data);
      })
      .catch(() => {
        // Not authenticated — that's fine
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback((returnTo?: string) => {
    const currentPath = returnTo ?? window.location.href;
    window.location.href = `${API_BASE}/auth/login?return_to=${encodeURIComponent(currentPath)}`;
  }, []);

  const logout = useCallback(() => {
    // Navigate directly so the browser follows the full redirect chain
    // (including Auth0's /v2/logout) with proper cookies on each domain
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
