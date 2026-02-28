"use client";

import { useAuth } from "@shared/hooks";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    login();
    return null;
  }

  return <>{children}</>;
}
