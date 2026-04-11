/**
 * Single source of truth for the backend API base URL.
 *
 * Both browser and server use NEXT_PUBLIC_API_URL directly.
 * The session cookie (`sid`) is set on the backend domain — the browser
 * must make cross-origin requests directly so `credentials: "include"`
 * sends the cookie. Routing through the Next.js proxy loses the cookie.
 */
function resolveApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

  // In production, NEXT_PUBLIC_API_URL must be set — localhost fallback would break SSR
  if (process.env.NODE_ENV === "production") {
    console.error(
      "FATAL: NEXT_PUBLIC_API_URL is not set in production. API calls will fail.",
    );
  }

  return typeof window !== "undefined"
    ? "/api/v1"
    : "http://localhost:8000/api/v1";
}

export const API_BASE = resolveApiBase();
