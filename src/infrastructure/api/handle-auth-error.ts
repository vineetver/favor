import { API_BASE } from "@/config/api";

/**
 * Centralized 401 handler.
 * Redirects to login on auth failure (browser only).
 * Returns true if a 401 was handled, false otherwise.
 */
export function handle401(status: number): boolean {
  if (status === 401 && typeof window !== "undefined") {
    window.location.href = `${API_BASE}/auth/login?return_to=${encodeURIComponent(window.location.href)}`;
    return true;
  }
  return false;
}
