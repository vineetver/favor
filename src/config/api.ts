/**
 * Single source of truth for the backend API base URL.
 * Browser requests go through the Next.js rewrite proxy (/api/v1 → backend).
 * Server requests (API routes, server actions) use the full URL directly.
 */
export const API_BASE =
  typeof window !== "undefined"
    ? "/api/v1"
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");
